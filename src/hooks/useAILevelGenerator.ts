import { useState } from 'react';
import { generateLevel, getApiErrorMessage } from '@/api/qianwen';
import { useAIStore } from '@/store/aiStore';
import { LevelGenRequest, LevelGenResult } from '@/api/qianwen/types';

export const validateLevelResult = (result: any): result is LevelGenResult => {
  if (!result || typeof result !== 'object') return false;
  
  if (!result.map || typeof result.map !== 'object') return false;
  if (!Number.isFinite(result.map.width) || !Number.isFinite(result.map.height)) return false;
  if (!Array.isArray(result.map.cells) || !Array.isArray(result.map.stars)) return false;
  if (!result.hint || typeof result.hint !== 'string') return false;
  if (!Number.isFinite(result.minCommands)) return false;
  
  return true;
};

export const sanitizeLevelResult = (result: LevelGenResult, request: LevelGenRequest): LevelGenResult => {
  return {
    map: {
      width: Math.max(3, Math.min(20, result.map.width || request.width)),
      height: Math.max(3, Math.min(20, result.map.height || request.height)),
      cells: (result.map.cells || []).filter(cell => 
        cell && typeof cell === 'object' &&
        Number.isFinite(cell.x) && Number.isFinite(cell.y) &&
        ['robot', 'goal', 'wall'].includes(cell.type)
      ).slice(0, 100),
      stars: (result.map.stars || []).filter(star => 
        star && typeof star === 'object' &&
        Number.isFinite(star.x) && Number.isFinite(star.y)
      ).slice(0, 20),
    },
    hint: result.hint.slice(0, 200),
    minCommands: Math.max(1, Math.min(50, result.minCommands)),
  };
};

const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useAILevelGenerator = () => {
  const { 
    setIsGenerating, 
    setLastGeneratedLevel, 
    addHistoryEntry,
    settings,
    isDailyLimitReached 
  } = useAIStore();
  const [error, setError] = useState<string | null>(null);

  const generate = async (request: LevelGenRequest): Promise<LevelGenResult | null> => {
    const entryId = generateId();
    const startTime = Date.now();
    let tokensUsed = 0;
    let rawResponse: any = null;

    if (!settings.enableLevelGeneration) {
      const errorMsg = 'AI 生成关卡功能已禁用';
      setError(errorMsg);
      addHistoryEntry({
        id: entryId,
        type: 'level',
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
        type: 'level',
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
      const response = await generateLevel(request);
      
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
      
      if (!validateLevelResult(result)) {
        console.error('验证失败的数据:', result);
        throw new Error('AI 返回的关卡数据格式不正确');
      }
      
      const sanitized = sanitizeLevelResult(result, request);
      setLastGeneratedLevel(sanitized);
      
      addHistoryEntry({
        id: entryId,
        type: 'level',
        timestamp: startTime,
        tokensUsed,
        success: true,
        data: { request, result: sanitized, rawResponse },
      });
      
      return sanitized;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err);
      setError(errorMsg);
      
      addHistoryEntry({
        id: entryId,
        type: 'level',
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

  return { generate, error };
};
