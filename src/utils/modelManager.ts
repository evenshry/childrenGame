import { ModelInfo, ModelConfig, DEFAULT_MODEL_CONFIGS, getModelById } from '@/config/models';
import { message } from 'antd';

export interface ModelUsage {
  modelId: string;
  requestCount: number;
  totalTokens: number;
  lastUsed: number;
  errorCount: number;
}

export interface ModelSwitchConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  fallbackOnError: boolean;
  fallbackOnQuotaExceeded: boolean;
}

export class ModelManager {
  private currentModelId: string;
  private config: ModelConfig;
  private usage: Map<string, ModelUsage>;
  private switchConfig: ModelSwitchConfig;
  private modelChangeCallbacks: Array<(model: ModelInfo) => void>;

  constructor(config?: Partial<ModelConfig>, switchConfig?: Partial<ModelSwitchConfig>) {
    this.config = { ...DEFAULT_MODEL_CONFIGS, ...config };
    this.currentModelId = this.config.defaultModel;
    this.usage = new Map();
    this.modelChangeCallbacks = [];
    
    this.switchConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      fallbackOnError: true,
      fallbackOnQuotaExceeded: true,
      ...switchConfig,
    };

    this.loadUsageFromStorage();
  }

  private loadUsageFromStorage(): void {
    try {
      const savedUsage = localStorage.getItem('model_usage');
      if (savedUsage) {
        const usageArray: ModelUsage[] = JSON.parse(savedUsage);
        this.usage = new Map(usageArray.map(u => [u.modelId, u]));
      }
    } catch (error) {
      console.error('Failed to load model usage:', error);
    }
  }

  private saveUsageToStorage(): void {
    try {
      const usageArray = Array.from(this.usage.values());
      localStorage.setItem('model_usage', JSON.stringify(usageArray));
    } catch (error) {
      console.error('Failed to save model usage:', error);
    }
  }

  public getCurrentModel(): ModelInfo {
    const model = getModelById(this.currentModelId);
    if (!model) {
      const defaultModel = getModelById(this.config.defaultModel);
      if (defaultModel) {
        this.currentModelId = this.config.defaultModel;
        return defaultModel;
      }
      return this.config.models[0];
    }
    return model;
  }

  public getCurrentModelId(): string {
    return this.currentModelId;
  }

  public setCurrentModel(modelId: string): boolean {
    const model = getModelById(modelId);
    if (model) {
      this.currentModelId = modelId;
      this.recordUsage(modelId);
      this.notifyModelChange(model);
      return true;
    }
    return false;
  }

  public getFallbackModels(): ModelInfo[] {
    return this.config.fallbackModels
      .map(id => getModelById(id))
      .filter((model): model is ModelInfo => model !== undefined);
  }

  public getAvailableFallback(currentModelId: string): ModelInfo[] {
    const fallbacks: ModelInfo[] = [];
    
    for (const modelId of this.config.fallbackModels) {
      if (modelId === currentModelId) continue;
      
      const model = getModelById(modelId);
      if (model) {
        const usage = this.usage.get(modelId);
        if (!usage || usage.errorCount < 5) {
          fallbacks.push(model);
        }
      }
    }
    
    return fallbacks;
  }

  public shouldSwitchModel(errorType?: string): boolean {
    if (!this.switchConfig.enabled) return false;
    
    const currentUsage = this.usage.get(this.currentModelId);
    if (!currentUsage) return false;

    switch (errorType) {
      case 'quota_exceeded':
      case 'rate_limit':
      case 'insufficient_balance':
        return this.switchConfig.fallbackOnQuotaExceeded;
      case 'model_not_found':
      case 'access_denied':
      case 'invalid_api_key':
        return true;
      default:
        return this.switchConfig.fallbackOnError && currentUsage.errorCount >= 3;
    }
  }

  public async switchToNextModel(errorType?: string): Promise<ModelInfo | null> {
    if (!this.switchConfig.enabled) {
      return null;
    }

    const availableModels = this.getAvailableFallback(this.currentModelId);
    
    if (availableModels.length === 0) {
      message.warning('所有备用模型都不可用，请稍后重试');
      return null;
    }

    const currentUsage = this.usage.get(this.currentModelId);
    const currentErrors = currentUsage?.errorCount || 0;

    if (currentErrors > 0 && currentErrors < 3) {
      message.info(`模型 ${this.getCurrentModel().name} 出现问题，将尝试重试`);
      return null;
    }

    const nextModel = availableModels[0];
    this.setCurrentModel(nextModel.id);
    
    message.success(`已切换到备用模型: ${nextModel.name}`);
    
    return nextModel;
  }

  public recordUsage(modelId: string, tokens?: number): void {
    const existing = this.usage.get(modelId);
    const now = Date.now();
    
    const usage: ModelUsage = existing ? {
      ...existing,
      requestCount: existing.requestCount + 1,
      totalTokens: existing.totalTokens + (tokens || 0),
      lastUsed: now,
    } : {
      modelId,
      requestCount: 1,
      totalTokens: tokens || 0,
      lastUsed: now,
      errorCount: 0,
    };
    
    this.usage.set(modelId, usage);
    this.saveUsageToStorage();
  }

  public recordError(modelId: string): void {
    const existing = this.usage.get(modelId);
    const now = Date.now();
    
    const usage: ModelUsage = existing ? {
      ...existing,
      errorCount: existing.errorCount + 1,
      lastUsed: now,
    } : {
      modelId,
      requestCount: 0,
      totalTokens: 0,
      lastUsed: now,
      errorCount: 1,
    };
    
    this.usage.set(modelId, usage);
    this.saveUsageToStorage();

    if (this.switchConfig.enabled && usage.errorCount >= 3) {
      this.handleModelError(modelId);
    }
  }

  private async handleModelError(modelId: string): Promise<void> {
    if (this.shouldSwitchModel()) {
      await this.switchToNextModel();
    }
  }

  public getUsage(modelId?: string): ModelUsage | Map<string, ModelUsage> {
    if (modelId) {
      return this.usage.get(modelId) || {
        modelId,
        requestCount: 0,
        totalTokens: 0,
        lastUsed: 0,
        errorCount: 0,
      };
    }
    return new Map(this.usage);
  }

  public resetUsage(modelId?: string): void {
    if (modelId) {
      this.usage.delete(modelId);
    } else {
      this.usage.clear();
    }
    this.saveUsageToStorage();
  }

  public resetErrors(modelId: string): void {
    const usage = this.usage.get(modelId);
    if (usage) {
      usage.errorCount = 0;
      this.saveUsageToStorage();
    }
  }

  public onModelChange(callback: (model: ModelInfo) => void): () => void {
    this.modelChangeCallbacks.push(callback);
    return () => {
      this.modelChangeCallbacks = this.modelChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyModelChange(model: ModelInfo): void {
    this.modelChangeCallbacks.forEach(callback => {
      try {
        callback(model);
      } catch (error) {
        console.error('Error in model change callback:', error);
      }
    });
  }

  public getConfig(): ModelConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<ModelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getSwitchConfig(): ModelSwitchConfig {
    return { ...this.switchConfig };
  }

  public updateSwitchConfig(config: Partial<ModelSwitchConfig>): void {
    this.switchConfig = { ...this.switchConfig, ...config };
  }

  public getModelHealth(): Map<string, { isHealthy: boolean; errorRate: number; lastUsed: number }> {
    const health = new Map<string, { isHealthy: boolean; errorRate: number; lastUsed: number }>();
    
    for (const [modelId, usage] of this.usage) {
      const errorRate = usage.requestCount > 0 ? usage.errorCount / usage.requestCount : 0;
      health.set(modelId, {
        isHealthy: usage.errorCount < 3,
        errorRate,
        lastUsed: usage.lastUsed,
      });
    }
    
    return health;
  }

  public getStatistics(): {
    totalRequests: number;
    totalTokens: number;
    totalErrors: number;
    modelCount: number;
    averageErrorRate: number;
  } {
    let totalRequests = 0;
    let totalTokens = 0;
    let totalErrors = 0;
    
    for (const usage of this.usage.values()) {
      totalRequests += usage.requestCount;
      totalTokens += usage.totalTokens;
      totalErrors += usage.errorCount;
    }
    
    const modelCount = this.usage.size;
    const averageErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    return {
      totalRequests,
      totalTokens,
      totalErrors,
      modelCount,
      averageErrorRate,
    };
  }
}

let modelManagerInstance: ModelManager | null = null;

export const getModelManager = (): ModelManager => {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
};

export const createModelManager = (config?: Partial<ModelConfig>, switchConfig?: Partial<ModelSwitchConfig>): ModelManager => {
  modelManagerInstance = new ModelManager(config, switchConfig);
  return modelManagerInstance;
};

export const withModelSwitch = async <T>(
  operation: (model: ModelInfo) => Promise<T>,
  options?: {
    maxRetries?: number;
    onSwitch?: (from: ModelInfo, to: ModelInfo) => void;
    onError?: (error: Error, model: ModelInfo) => void;
  }
): Promise<T> => {
  const manager = getModelManager();
  const maxRetries = options?.maxRetries || 3;
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxRetries) {
    try {
      const currentModel = manager.getCurrentModel();
      const result = await operation(currentModel);
      
      manager.recordUsage(currentModel.id);
      return result;
    } catch (error) {
      lastError = error as Error;
      attempts++;
      
      const currentModel = manager.getCurrentModel();
      
      options?.onError?.(lastError, currentModel);
      
      if (attempts >= maxRetries) {
        break;
      }

      const errorType = getErrorType(lastError);
      
      if (manager.shouldSwitchModel(errorType)) {
        const previousModel = currentModel;
        const nextModel = await manager.switchToNextModel(errorType);
        
        if (nextModel) {
          options?.onSwitch?.(previousModel, nextModel);
        } else {
          break;
        }
      } else {
        await delay(manager.getSwitchConfig().retryDelayMs * attempts);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

const getErrorType = (error: Error): string | undefined => {
  const message = error.message.toLowerCase();
  
  if (message.includes('quota') || message.includes('额度')) return 'quota_exceeded';
  if (message.includes('rate limit') || message.includes('频率')) return 'rate_limit';
  if (message.includes('balance') || message.includes('余额')) return 'insufficient_balance';
  if (message.includes('model not found') || message.includes('模型不存在')) return 'model_not_found';
  if (message.includes('access denied') || message.includes('权限')) return 'access_denied';
  if (message.includes('invalid api key') || message.includes('密钥无效')) return 'invalid_api_key';
  
  return undefined;
};

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export default ModelManager;
