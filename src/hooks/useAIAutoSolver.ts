import { useState } from 'react';
import { solveLevel, getApiErrorMessage } from '@/api/qianwen';
import { parseAIJson, getResponseTokens, isRecord, isNotNull } from '@/api/qianwen/response';
import { useAIStore } from '@/store/aiStore';
import type {
  SolverCommand,
  SolverRequest,
  SolverResult,
} from '@/api/qianwen/types';
import { findOptimalPath, validatePath } from '@/utils/pathFinder';
import type {
  Cell,
  CellType,
  Command,
  CommandType,
  Direction,
  MapData,
} from '@/types/global';
import { generateId } from '@/utils/id';

const VALID_COMMAND_TYPES: CommandType[] = [
  'forward',
  'left',
  'right',
  'collect',
  'loop',
  'if',
  'repeatUntil',
  'wait',
  'randomTurn',
];

export const validateSolverResult = (value: unknown): value is SolverResult =>
  isRecord(value) &&
  Array.isArray(value.commands) &&
  typeof value.explanation === 'string';

const sanitizeCommand = (value: unknown): SolverCommand | null => {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (typeof type !== 'string' || !VALID_COMMAND_TYPES.includes(type as CommandType)) {
    return null;
  }

  const params = isRecord(value.params)
    ? (value.params as SolverCommand['params'])
    : undefined;
  const children = Array.isArray(value.children)
    ? value.children.map(sanitizeCommand).filter(isNotNull)
    : undefined;
  const elseChildren = Array.isArray(value.elseChildren)
    ? value.elseChildren.map(sanitizeCommand).filter(isNotNull)
    : undefined;

  return { type, params, children, elseChildren };
};

export const sanitizeSolverResult = (result: SolverResult): SolverResult => ({
  commands: result.commands.map(sanitizeCommand).filter(isNotNull).slice(0, 200),
  explanation: result.explanation.slice(0, 500),
});

const toSimpleCommand = (command: Command): SolverCommand => ({
  type: command.type,
  params: command.params,
  children: command.children?.map(toSimpleCommand),
  elseChildren: command.elseChildren?.map(toSimpleCommand),
});

const toFullCommand = (command: SolverCommand): Command => ({
  id: generateId(),
  type: command.type as CommandType,
  params: command.params as Command['params'],
  children: command.children?.map(toFullCommand),
  elseChildren: command.elseChildren?.map(toFullCommand),
});

const toCommands = (result: SolverResult): Command[] =>
  result.commands.map(toFullCommand);

const convertToMapData = (request: SolverRequest): MapData => {
  const cells: Cell[] = request.map.cells.map((cell) => ({
    x: cell.x,
    y: cell.y,
    type: cell.type as CellType,
  }));
  cells.push({
    x: request.startX,
    y: request.startY,
    type: 'robot',
    dir: request.startDir as Direction,
  });
  cells.push({ x: request.goalX, y: request.goalY, type: 'goal' });

  return {
    width: request.map.width,
    height: request.map.height,
    cells,
    stars: request.map.stars.map((star) => ({
      x: star.x,
      y: star.y,
      type: 'star' as CellType,
    })),
  };
};

export const useAIAutoSolver = () => {
  const { setIsGenerating, addHistoryEntry, settings, isDailyLimitReached } =
    useAIStore();
  const [error, setError] = useState<string | null>(null);

  const solve = async (request: SolverRequest): Promise<SolverResult | null> => {
    const entryId = generateId('solve');
    const startTime = Date.now();
    let tokensUsed = 0;
    let rawResponse: unknown = null;

    const recordFailure = (errorMsg: string) => {
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
    };

    if (!settings.enableAutoSolve) {
      recordFailure('自动解题功能已禁用');
      return null;
    }
    if (isDailyLimitReached()) {
      recordFailure('今日 Token 使用已达上限，请明天再试');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await solveLevel(request);
      rawResponse = response;
      tokensUsed = getResponseTokens(response);
      const parsed = parseAIJson(response);

      if (!validateSolverResult(parsed)) {
        throw new Error('AI 返回的解题数据格式不正确');
      }

      const sanitized = sanitizeSolverResult(parsed);
      const mapData = convertToMapData(request);
      const isValid = validatePath(
        toCommands(sanitized),
        mapData,
        request.startX,
        request.startY,
        request.startDir as Direction,
      );

      let finalResult = sanitized;
      if (!isValid) {
        const localCommands = findOptimalPath(
          mapData,
          request.startX,
          request.startY,
          request.startDir as Direction,
        );
        if (localCommands.length === 0) {
          throw new Error('无法找到可行路径');
        }
        finalResult = {
          commands: localCommands.map(toSimpleCommand),
          explanation: '使用本地路径规划算法生成的最优解',
        };
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
      // AI 失败时回退到本地寻路
      try {
        const mapData = convertToMapData(request);
        const localCommands = findOptimalPath(
          mapData,
          request.startX,
          request.startY,
          request.startDir as Direction,
        );
        if (localCommands.length > 0) {
          const fallbackResult: SolverResult = {
            commands: localCommands.map(toSimpleCommand),
            explanation: 'AI解题失败，使用本地路径规划算法生成的最优解',
          };
          addHistoryEntry({
            id: entryId,
            type: 'solve',
            timestamp: startTime,
            tokensUsed,
            success: true,
            data: { request, result: fallbackResult, rawResponse },
          });
          setError(null);
          return fallbackResult;
        }
      } catch (fallbackErr) {
        console.error('本地算法也失败了:', fallbackErr);
      }

      recordFailure(getApiErrorMessage(err));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { solve, error };
};