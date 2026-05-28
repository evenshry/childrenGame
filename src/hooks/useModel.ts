import { useCallback, useEffect, useState } from 'react';
import { useModelStore, useCurrentModel, useModelSwitch, useModelStatistics } from '@/store/modelStore';
import { ModelInfo, getModelsByType, getRecommendedModels } from '@/config/models';
import { message } from 'antd';

export const useModelSelector = () => {
  const currentModel = useCurrentModel();
  const setCurrentModel = useModelStore(state => state.setCurrentModel);
  const getFallbackModels = useModelStore(state => state.getFallbackModels);
  const getAvailableFallback = useModelStore(state => state.getAvailableFallback);

  const selectModel = useCallback((modelId: string) => {
    const success = setCurrentModel(modelId);
    if (success) {
      const model = getModelsByType(modelId as any).find(m => m.id === modelId);
      message.success(`已切换到模型: ${model?.name || modelId}`);
    } else {
      message.error('模型切换失败');
    }
    return success;
  }, [setCurrentModel]);

  return {
    currentModel,
    selectModel,
    fallbackModels: getFallbackModels(),
    availableFallbacks: getAvailableFallback(),
  };
};

export const useModelAutoSwitch = () => {
  const { recordUsage, recordError, switchToNextModel, isAutoSwitchEnabled } = useModelSwitch();

  const handleSuccess = useCallback((tokens?: number) => {
    recordUsage(tokens);
  }, [recordUsage]);

  const handleError = useCallback(async (error: Error) => {
    recordError();
    
    const errorType = getErrorTypeFromMessage(error.message);
    
    if (isAutoSwitchEnabled) {
      const switched = await switchToNextModel(errorType);
      if (switched) {
        message.info('已自动切换到备用模型，正在重试...');
        return true;
      }
    }
    
    return false;
  }, [recordError, switchToNextModel, isAutoSwitchEnabled]);

  return {
    handleSuccess,
    handleError,
    isAutoSwitchEnabled,
  };
};

const getErrorTypeFromMessage = (errorMessage: string): string | undefined => {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('quota') || message.includes('额度')) return 'quota_exceeded';
  if (message.includes('rate limit') || message.includes('频率')) return 'rate_limit';
  if (message.includes('balance') || message.includes('余额')) return 'insufficient_balance';
  if (message.includes('model not found') || message.includes('模型不存在')) return 'model_not_found';
  if (message.includes('access denied') || message.includes('权限')) return 'access_denied';
  if (message.includes('invalid api key') || message.includes('密钥无效')) return 'invalid_api_key';
  
  return undefined;
};

export const useModelForTask = (taskType: 'levelGeneration' | 'solver' | 'general') => {
  const currentModel = useCurrentModel();
  const selectModel = useModelSelector().selectModel;

  useEffect(() => {
    let recommended: ModelInfo[] = [];

    switch (taskType) {
      case 'levelGeneration':
        recommended = getRecommendedModels('分析');
        break;
      case 'solver':
        recommended = getRecommendedModels('推理');
        break;
      default:
        recommended = getRecommendedModels('生成');
    }

    if (recommended.length > 0 && !currentModel.modelId.includes('turbo')) {
      const bestModel = recommended.find(m => 
        m.capabilities.some(c => c.includes('推理') || c.includes('分析'))
      );
      
      if (bestModel && Math.random() > 0.7) {
        console.log(`推荐使用模型: ${bestModel.name} 用于 ${taskType}`);
      }
    }
  }, [taskType, currentModel.modelId]);

  return currentModel;
};

export const useModelHealthMonitor = () => {
  const { statistics, modelHealth } = useModelStatistics();
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const allHealthy = modelHealth.every(h => h.isHealthy);
    setIsHealthy(allHealthy);
  }, [modelHealth]);

  const healthyModels = modelHealth.filter(h => h.isHealthy);
  const unhealthyModels = modelHealth.filter(h => !h.isHealthy);

  return {
    isHealthy,
    statistics,
    healthyModels,
    unhealthyModels,
    modelHealth,
  };
};

export const useModelQuota = () => {
  const usage = useModelStore(state => state.usage);
  const currentModelId = useModelStore(state => state.currentModelId);

  const currentModelUsage = usage[currentModelId] || {
    requestCount: 0,
    totalTokens: 0,
    errorCount: 0,
    lastUsed: 0,
  };

  const estimatedQuotaRemaining = 1000000 - currentModelUsage.totalTokens;
  const usagePercentage = (currentModelUsage.totalTokens / 1000000) * 100;

  return {
    currentModelId,
    usage: currentModelUsage,
    estimatedQuotaRemaining,
    usagePercentage,
    isNearLimit: usagePercentage > 80,
    isOverLimit: usagePercentage >= 100,
  };
};

export const useModelConfig = () => {
  const switchConfig = useModelStore(state => state.switchConfig);
  const isAutoSwitchEnabled = useModelStore(state => state.isAutoSwitchEnabled);
  const updateSwitchConfig = useModelStore(state => state.updateSwitchConfig);
  const toggleAutoSwitch = useModelStore(state => state.toggleAutoSwitch);
  const fallbackModels = useModelStore(state => state.fallbackModels);

  const updateConfig = useCallback((config: Partial<typeof switchConfig>) => {
    updateSwitchConfig(config);
  }, [updateSwitchConfig]);

  return {
    switchConfig,
    isAutoSwitchEnabled,
    updateConfig,
    toggleAutoSwitch,
    fallbackModels,
  };
};

export default useModelSelector;
