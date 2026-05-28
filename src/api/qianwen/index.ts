import axios, { AxiosError } from 'axios';
import { QianWenResponse, LevelGenRequest, SolverRequest } from './types';
import { levelGenSystemPrompt, levelGenUserPrompt, solverSystemPrompt, solverUserPrompt } from './prompts';
import { useAIStore } from '@/store/aiStore';
import { useModelStore } from '@/store/modelStore';
import { message } from 'antd';

const QIANWEN_API_KEY = import.meta.env.VITE_QIANWEN_API_KEY || 'sk-61a48c93562d4ea2b0f0459183708a5d';
const QIANWEN_API_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

const DEFAULT_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const qianwenClient = axios.create({
  baseURL: QIANWEN_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${QIANWEN_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const withModelSwitch = async <T>(
  fn: (modelId: string) => Promise<T>,
  options?: {
    maxRetries?: number;
    onSwitch?: (from: string, to: string) => void;
  }
): Promise<T> => {
  const modelStore = useModelStore.getState();
  const maxRetries = options?.maxRetries || 3;
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxRetries) {
    try {
      const currentModelId = modelStore.currentModelId;
      const result = await fn(currentModelId);
      modelStore.recordUsage();
      return result;
    } catch (error) {
      lastError = error as Error;
      attempts++;
      
      if (attempts >= maxRetries) {
        break;
      }

      modelStore.recordError();

      const errorType = getErrorType(lastError);
      const shouldSwitch = modelStore.switchConfig.enabled && (
        modelStore.switchConfig.fallbackOnError || 
        errorType === 'quota_exceeded' ||
        errorType === 'rate_limit'
      );

      if (shouldSwitch) {
        const previousModelId = modelStore.currentModelId;
        const availableModels = modelStore.getAvailableFallback();
        
        if (availableModels.length > 0) {
          const nextModel = availableModels[0];
          modelStore.setCurrentModel(nextModel.id);
          options?.onSwitch?.(previousModelId, nextModel.id);
          message.info(`已切换到备用模型: ${nextModel.name}`);
        } else {
          message.error('所有备用模型都不可用');
          break;
        }
      } else {
        await delay(modelStore.switchConfig.retryDelayMs * attempts);
      }
    }
  }

  throw lastError;
};

const getErrorType = (error: Error): string | undefined => {
  const errorMsg = error.message.toLowerCase();
  
  if (errorMsg.includes('quota') || errorMsg.includes('额度')) return 'quota_exceeded';
  if (errorMsg.includes('rate limit') || errorMsg.includes('频率')) return 'rate_limit';
  if (errorMsg.includes('balance') || errorMsg.includes('余额')) return 'insufficient_balance';
  if (errorMsg.includes('model not found') || errorMsg.includes('模型不存在')) return 'model_not_found';
  if (errorMsg.includes('access denied') || errorMsg.includes('权限')) return 'access_denied';
  if (errorMsg.includes('invalid api key') || errorMsg.includes('密钥无效')) return 'invalid_api_key';
  
  return undefined;
};

export const generateLevel = async (request: LevelGenRequest): Promise<QianWenResponse> => {
  return withRetry(async () => {
    const response = await qianwenClient.post('', {
      model: 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'system',
            content: levelGenSystemPrompt.trim(),
          },
          {
            role: 'user',
            content: levelGenUserPrompt(request).trim(),
          },
        ],
      },
      parameters: {
        max_tokens: 2048,
        temperature: 0.7,
      },
    });
    
    useAIStore.getState().updateUsage(
      response.data.usage?.input_tokens || 0,
      response.data.usage?.output_tokens || 0
    );
    
    return response.data;
  });
};

export const solveLevel = async (request: SolverRequest): Promise<QianWenResponse> => {
  return withModelSwitch(async (modelId: string) => {
    const response = await withRetry(async () => {
      return await qianwenClient.post('', {
        model: modelId,
        input: {
          messages: [
            {
              role: 'system',
              content: solverSystemPrompt.trim(),
            },
            {
              role: 'user',
              content: solverUserPrompt(request).trim(),
            },
          ],
        },
        parameters: {
          max_tokens: 1024,
          temperature: 0.3,
        },
      });
    });
    
    useAIStore.getState().updateUsage(
      response.data.usage?.input_tokens || 0,
      response.data.usage?.output_tokens || 0
    );
    
    return response.data;
  });
};

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const { status, data } = error.response;
      const responseData = data as any;
      
      // 检查阿里云DashScope特定的错误格式
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
