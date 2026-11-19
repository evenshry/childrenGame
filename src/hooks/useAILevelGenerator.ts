import { useState } from 'react';
import { generateLevel, getApiErrorMessage } from '@/api/qianwen';
import { parseAIJson, getResponseTokens, isRecord } from '@/api/qianwen/response';
import { useAIStore } from '@/store/aiStore';
import type { LevelGenRequest, LevelGenResult } from '@/api/qianwen/types';
import { generateId } from '@/utils/id';

export const validateLevelResult = (value: unknown): value is LevelGenResult => {
  if (!isRecord(value) || !isRecord(value.map)) return false;
  const map = value.map;
  return (
    Number.isFinite(map.width) &&
    Number.isFinite(map.height) &&
    Array.isArray(map.cells) &&
    Array.isArray(map.stars) &&
    typeof value.hint === 'string' &&
    Number.isFinite(value.minCommands)
  );
};

const isPositionCell = (value: unknown): value is { x: number; y: number; type?: string } =>
  isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);

export const sanitizeLevelResult = (
  result: LevelGenResult,
  request: LevelGenRequest,
): LevelGenResult => ({
  map: {
    width: Math.max(3, Math.min(20, result.map.width || request.width)),
    height: Math.max(3, Math.min(20, result.map.height || request.height)),
    cells: (result.map.cells || [])
      .filter(
        (cell) =>
          isRecord(cell) &&
          Number.isFinite(cell.x) &&
          Number.isFinite(cell.y) &&
          ['robot', 'goal', 'wall'].includes(String(cell.type)),
      )
      .slice(0, 100),
    stars: (result.map.stars || [])
      .filter(isPositionCell)
      .slice(0, 20)
      .map((star) => ({ ...star, type: 'star' })),
  },
  hint: result.hint.slice(0, 200),
  minCommands: Math.max(1, Math.min(50, result.minCommands)),
});

export const useAILevelGenerator = () => {
  const { setIsGenerating, addHistoryEntry, settings, isDailyLimitReached } =
    useAIStore();
  const [error, setError] = useState<string | null>(null);

  const generate = async (request: LevelGenRequest): Promise<LevelGenResult | null> => {
    const entryId = generateId('level');
    const startTime = Date.now();
    let tokensUsed = 0;
    let rawResponse: unknown = null;

    const recordFailure = (errorMsg: string) => {
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
    };

    if (!settings.enableLevelGeneration) {
      recordFailure('AI 生成关卡功能已禁用');
      return null;
    }
    if (isDailyLimitReached()) {
      recordFailure('今日 Token 使用已达上限，请明天再试');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateLevel(request);
      rawResponse = response;
      tokensUsed = getResponseTokens(response);
      const parsed = parseAIJson(response);

      if (!validateLevelResult(parsed)) {
        throw new Error('AI 返回的关卡数据格式不正确');
      }

      const sanitized = sanitizeLevelResult(parsed, request);

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
      recordFailure(getApiErrorMessage(err));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, error };
};