import { useState } from 'react';
import { solveLevel, getApiErrorMessage } from '@/api/qianwen';
import { useAIStore } from '@/store/aiStore';
import { SolverRequest, SolverResult } from '@/api/qianwen/types';
import { findOptimalPath, validatePath } from '@/utils/pathFinder';
import { MapData, Cell, CellType, Command, CommandType } from '@/types/global';

// 生成唯一ID
const generateCommandId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const validateSolverResult = (result: any): result is SolverResult => {
  if (!result || typeof result !== 'object') return false;
  if (!Array.isArray(result.commands)) return false;
  if (!result.explanation || typeof result.explanation !== 'string') return false;
  return true;
};

// 从完整Command转换为SolverResult的简单命令类型
const toSimpleCommand = (cmd: Command): any => ({
  type: cmd.type,
  params: cmd.params
});

// 从SolverResult的简单命令转换为完整Command
const toFullCommand = (cmd: any): Command => ({
  id: cmd.id || generateCommandId(),
  type: cmd.type as CommandType,
  params: cmd.params || {}
});

export const sanitizeSolverResult = (result: SolverResult): SolverResult => {
  const validCommandTypes = ['forward', 'left', 'right', 'collect', 'loop', 'if', 'repeatUntil', 'wait', 'randomTurn'];
  
  const sanitizeCommand = (cmd: any): any => {
    if (!cmd || typeof cmd !== 'object') return null;
    if (!validCommandTypes.includes(cmd.type)) return null;
    
    const sanitized: any = {
      type: cmd.type,
      params: cmd.params || {}
    };
    
    // 递归处理子指令
    if (cmd.children && Array.isArray(cmd.children)) {
      sanitized.children = cmd.children.map(sanitizeCommand).filter(Boolean);
    }
    
    // 递归处理else子指令
    if (cmd.elseChildren && Array.isArray(cmd.elseChildren)) {
      sanitized.elseChildren = cmd.elseChildren.map(sanitizeCommand).filter(Boolean);
    }
    
    return sanitized;
  };
  
  return {
    commands: (result.commands || []).map(sanitizeCommand).filter(Boolean).slice(0, 200),
    explanation: result.explanation.slice(0, 500),
  };
};

const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 将 SolverRequest 转换为 MapData
const convertToMapData = (request: SolverRequest): MapData => {
  // 转换单元格
  const cells: Cell[] = request.map.cells.map(cell => ({
    ...cell,
    type: cell.type as CellType
  }));
  
  // 添加机器人和终点
  cells.push({
    x: request.startX,
    y: request.startY,
    type: 'robot' as CellType,
    dir: request.startDir as 'up' | 'down' | 'left' | 'right'
  });
  cells.push({
    x: request.goalX,
    y: request.goalY,
    type: 'goal' as CellType
  });
  
  // 转换星星
  const stars: Cell[] = request.map.stars.map(star => ({
    x: star.x,
    y: star.y,
    type: 'star' as CellType
  }));
  
  return {
    width: request.map.width,
    height: request.map.height,
    cells,
    stars
  };
};

export const useAIAutoSolver = () => {
  const { 
    setIsGenerating, 
    addHistoryEntry,
    settings,
    isDailyLimitReached 
  } = useAIStore();
  const [error, setError] = useState<string | null>(null);

  const solve = async (request: SolverRequest): Promise<SolverResult | null> => {
    const entryId = generateId();
    const startTime = Date.now();
    let tokensUsed = 0;
    let rawResponse: any = null;

    if (!settings.enableAutoSolve) {
      const errorMsg = '自动解题功能已禁用';
      setError(errorMsg);
      addHistoryEntry({
        id: entryId,
        type: 'solve',
        timestamp: startTime,
        tokensUsed: 0,
        success: false,
        data: { request, result: null, rawResponse },
        error: errorMsg,
      });
      return null;
    }
    
    if (isDailyLimitReached()) {
      const errorMsg = '今日 Token 使用已达上限，请明天再试';
      setError(errorMsg);
      addHistoryEntry({
        id: entryId,
        type: 'solve',
        timestamp: startTime,
        tokensUsed: 0,
        success: false,
        data: { request, result: null, rawResponse },
        error: errorMsg,
      });
      return null;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await solveLevel(request);
      
      // 保存原始响应数据
      rawResponse = JSON.parse(JSON.stringify(response));
      
      // 安全地解析API响应
      let content: string | undefined;
      const output = response.output as any;
      
      // 尝试不同的响应格式
      if (output?.text) {
        // 主要格式：output.text
        content = output.text;
      } else if (output?.choices && Array.isArray(output.choices) && output.choices.length > 0) {
        // 兼容格式：output.choices[0].message.content
        content = output.choices[0]?.message?.content;
      } else if (typeof output === 'string') {
        // 字符串格式
        content = output;
      }
      
      // 去掉JSON代码块包装（如果存在）
      if (content) {
        content = content.trim();
        // 去掉 ```json 和 ``` 包装
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
        // 也去掉普通的 ``` 包装
        const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          content = codeMatch[1].trim();
        }
      }
      
      tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
      
      if (!content) {
        console.error('API响应格式:', JSON.stringify(response, null, 2));
        throw new Error('AI 未返回内容或响应格式异常');
      }
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseErr) {
        console.error('JSON解析错误:', parseErr);
        console.error('原始内容:', content);
        throw new Error('AI 返回的格式无效，无法解析为JSON');
      }
      
      if (!validateSolverResult(result)) {
        console.error('验证失败的数据:', result);
        throw new Error('AI 返回的解题数据格式不正确');
      }
      
      const sanitized = sanitizeSolverResult(result);
      
      // 验证AI生成的路径是否有效
      const mapData = convertToMapData(request);
      const fullCommandsForValidation = sanitized.commands.map(toFullCommand);
      const isValid = validatePath(
        fullCommandsForValidation,
        mapData,
        request.startX,
        request.startY,
        request.startDir as any
      );
      
      let finalResult = sanitized;
      
      // 如果AI路径无效，使用本地算法
      if (!isValid) {
        console.log('AI生成的路径无效，使用本地算法重新生成');
        const localCommands = findOptimalPath(
          mapData,
          request.startX,
          request.startY,
          request.startDir as any
        );
        
        if (localCommands.length > 0) {
          finalResult = {
            commands: localCommands.map(toSimpleCommand),
            explanation: '使用本地路径规划算法生成的最优解'
          };
        } else {
          throw new Error('无法找到可行路径');
        }
      }
      
      addHistoryEntry({
        id: entryId,
        type: 'solve',
        timestamp: startTime,
        tokensUsed,
        success: true,
        data: { request, result: finalResult, rawResponse },
      });
      
      return finalResult;
    } catch (err) {
      console.error('AI解题失败，尝试使用本地算法:', err);
      
      // AI失败时，尝试使用本地算法
      try {
        const mapData = convertToMapData(request);
        const localCommands = findOptimalPath(
          mapData,
          request.startX,
          request.startY,
          request.startDir as any
        );
        
        if (localCommands.length > 0) {
          const fallbackResult: SolverResult = {
            commands: localCommands.map(toSimpleCommand),
            explanation: 'AI解题失败，使用本地路径规划算法生成的最优解'
          };
          
          addHistoryEntry({
            id: entryId,
            type: 'solve',
            timestamp: startTime,
            tokensUsed,
            success: true,
            data: { request, result: fallbackResult, rawResponse: 'local_fallback' },
          });
          
          setError(null);
          return fallbackResult;
        }
      } catch (fallbackErr) {
        console.error('本地算法也失败了:', fallbackErr);
      }
      
      const errorMsg = getApiErrorMessage(err);
      setError(errorMsg);
      
      addHistoryEntry({
        id: entryId,
        type: 'solve',
        timestamp: startTime,
        tokensUsed,
        success: false,
        data: { request, result: null, rawResponse },
        error: errorMsg,
      });
      
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { solve, error };
};
