import axios, { AxiosError } from 'axios';
import type { QianWenResponse, LevelGenRequest, SolverRequest } from './types';
import { levelGenSystemPrompt, levelGenUserPrompt, solverSystemPrompt, solverUserPrompt } from './prompts';

const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) return true;
  const status = error.response.status;
  return status === 429 || status >= 500;
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number = DEFAULT_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i === attempts - 1) break;
      if (error instanceof AxiosError && isRetryableError(error)) {
        await delay(delayMs * (i + 1));
        continue;
      }
      break;
    }
  }
  throw lastError;
};

const getErrorType = (error: Error): string | undefined => {
  const msg = error.message.toLowerCase();
  if (msg.includes('quota') || msg.includes('额度')) return 'quota_exceeded';
  if (msg.includes('rate limit') || msg.includes('频率')) return 'rate_limit';
  if (msg.includes('balance') || msg.includes('余额')) return 'insufficient_balance';
  if (msg.includes('model not found') || msg.includes('模型不存在')) return 'model_not_found';
  if (msg.includes('access denied') || msg.includes('权限')) return 'access_denied';
  if (msg.includes('invalid api key') || msg.includes('密钥无效')) return 'invalid_api_key';
  return undefined;
};

/** 外部注入的依赖，让 API 层不直接 import Store */
export interface ApiRuntime {
  getApiKey: () => string;
  getApiBaseUrl: () => string;
  hasApiKey: () => boolean;
  /** 成功后上报 token 用量 */
  onUsageUpdate?: (input: number, output: number) => void;
  /** 当前模型 ID 读取（给 solveLevel 用） */
  getCurrentModelId?: () => string;
  /** 模型自动切换相关 */
  getModelSwitchState?: () => {
    enabled: boolean;
    fallbackOnError: boolean;
    fallbackOnQuotaExceeded: boolean;
    retryDelayMs: number;
    /** 仅需要 { id, name } 即可 */
    availableFallback: Array<{ id: string; name: string }>;
  };
  switchToNextModel?: () => { from: string; to: string } | null;
  recordUsage?: () => void;
  recordError?: () => void;
}

let runtime: ApiRuntime | null = null;

/** 在应用初始化时注册依赖注入 */
export const registerApiRuntime = (rt: ApiRuntime) => {
  runtime = rt;
};

let clientCache: { key: string; baseUrl: string; client: ReturnType<typeof axios.create> } | null = null;

const getClient = () => {
  const key = runtime?.getApiKey() || '';
  const baseUrl = runtime?.getApiBaseUrl() || '';
  if (clientCache && clientCache.key === key && clientCache.baseUrl === baseUrl) {
    return clientCache.client;
  }
  const client = axios.create({
    baseURL: baseUrl,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  clientCache = { key, baseUrl, client };
  return client;
};

/** 生成关卡（强制使用 qwen-turbo 或当前模型，保留简单重试） */
export const generateLevel = async (
  request: LevelGenRequest,
  modelId: string = 'qwen-turbo'
): Promise<QianWenResponse> => {
  if (!runtime?.hasApiKey()) {
    throw new Error('请先配置 API Key');
  }

  const client = getClient();

  return withRetry(async () => {
    const response = await client.post('', {
      model: modelId,
      input: {
        messages: [
          { role: 'system', content: levelGenSystemPrompt.trim() },
          { role: 'user', content: levelGenUserPrompt(request).trim() },
        ],
      },
      parameters: { max_tokens: 2048, temperature: 0.7 },
    });

    runtime?.onUsageUpdate?.(
      response.data.usage?.input_tokens || 0,
      response.data.usage?.output_tokens || 0
    );

    return response.data;
  });
};

/** 解题（带模型切换能力） */
export const solveLevel = async (
  request: SolverRequest,
  options?: { maxRetries?: number }
): Promise<QianWenResponse> => {
  if (!runtime?.hasApiKey()) {
    throw new Error('请先配置 API Key');
  }

  const client = getClient();
  const maxRetries = options?.maxRetries ?? 3;
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxRetries) {
    const modelId = runtime?.getCurrentModelId?.() ?? 'qwen-turbo';
    try {
      const response = await withRetry(
        async () =>
          client.post('', {
            model: modelId,
            input: {
              messages: [
                { role: 'system', content: solverSystemPrompt.trim() },
                { role: 'user', content: solverUserPrompt(request).trim() },
              ],
            },
            parameters: { max_tokens: 1024, temperature: 0.3 },
          }),
        // 外层 solveLevel 已有模型切换/重试循环，内层不再叠加重试
        1,
      );

      runtime?.onUsageUpdate?.(
        response.data.usage?.input_tokens || 0,
        response.data.usage?.output_tokens || 0
      );
      runtime?.recordUsage?.();
      return response.data;
    } catch (error) {
      lastError = error as Error;
      attempts++;
      if (attempts >= maxRetries) break;

      runtime?.recordError?.();
      const errorType = getErrorType(lastError);
      const switchState = runtime?.getModelSwitchState?.();

      const shouldSwitch =
        switchState?.enabled &&
        (switchState.fallbackOnError ||
          errorType === 'quota_exceeded' ||
          errorType === 'rate_limit');

      if (shouldSwitch) {
        const switched = runtime?.switchToNextModel?.();
        if (!switched) {
          break; // 没有可用的备用模型
        }
      } else {
        await delay((switchState?.retryDelayMs || 1000) * attempts);
      }
    }
  }

  throw lastError;
};

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const { status, data } = error.response;
      const responseData = data as { code?: string; message?: string };

      if (responseData?.code) {
        switch (responseData.code) {
          case 'InvalidApiKey':
            return 'API密钥无效或已过期';
          case 'InsufficientBalance':
            return '账户余额不足，请充值';
          case 'AccessDenied':
            return '访问被拒绝，请检查API权限';
          case 'RateLimitExceeded':
            return '请求频率过高，请稍后重试';
          case 'ModelNotFound':
            return '模型不存在或不可用';
          default:
            return responseData.message || `API错误: ${responseData.code}`;
        }
      }

      switch (status) {
        case 401:
          return 'API密钥无效，请检查配置';
        case 403:
          return '访问被拒绝，请检查API权限';
        case 429:
          return '请求频率过高，请稍后重试';
        case 500:
        case 502:
        case 503:
        case 504:
          return '服务器暂时不可用，请稍后重试';
        default:
          return responseData?.message || `请求失败 (${status})`;
      }
    } else if (error.request) {
      return '网络连接失败，请检查网络';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '发生未知错误';
};
