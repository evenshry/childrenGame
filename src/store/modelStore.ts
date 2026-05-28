import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ModelInfo, DEFAULT_MODEL_CONFIGS, getModelById } from '@/config/models';
import { ModelManager, getModelManager, ModelSwitchConfig } from '@/utils/modelManager';

interface ModelState {
  currentModelId: string;
  fallbackModels: string[];
  usage: Record<string, {
    requestCount: number;
    totalTokens: number;
    errorCount: number;
    lastUsed: number;
  }>;
  switchConfig: ModelSwitchConfig;
  isAutoSwitchEnabled: boolean;
}

interface ModelActions {
  setCurrentModel: (modelId: string) => boolean;
  getCurrentModel: () => ModelInfo;
  getFallbackModels: () => ModelInfo[];
  getAvailableFallback: () => ModelInfo[];
  recordUsage: (tokens?: number) => void;
  recordError: () => void;
  updateSwitchConfig: (config: Partial<ModelSwitchConfig>) => void;
  toggleAutoSwitch: (enabled?: boolean) => void;
  resetUsage: (modelId?: string) => void;
  getStatistics: () => {
    totalRequests: number;
    totalTokens: number;
    totalErrors: number;
    modelCount: number;
    averageErrorRate: number;
  };
  getModelHealth: () => Array<{ modelId: string; isHealthy: boolean; errorRate: number }>;
}

type ModelStore = ModelState & ModelActions;

const loadInitialState = (): Partial<ModelState> => {
  try {
    const saved = localStorage.getItem('model_store');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load model store:', error);
  }
  return {
    currentModelId: DEFAULT_MODEL_CONFIGS.defaultModel,
    fallbackModels: DEFAULT_MODEL_CONFIGS.fallbackModels,
    usage: {},
    switchConfig: {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      fallbackOnError: true,
      fallbackOnQuotaExceeded: true,
    },
    isAutoSwitchEnabled: true,
  };
};

const initialState = loadInitialState();

export const useModelStore = create<ModelStore>()(
  devtools(
    persist(
      (set, get) => ({
        currentModelId: initialState.currentModelId || DEFAULT_MODEL_CONFIGS.defaultModel,
        fallbackModels: initialState.fallbackModels || DEFAULT_MODEL_CONFIGS.fallbackModels,
        usage: initialState.usage || {},
        switchConfig: initialState.switchConfig || {
          enabled: true,
          maxRetries: 3,
          retryDelayMs: 1000,
          fallbackOnError: true,
          fallbackOnQuotaExceeded: true,
        },
        isAutoSwitchEnabled: initialState.isAutoSwitchEnabled ?? true,

        setCurrentModel: (modelId: string) => {
          const model = getModelById(modelId);
          if (model) {
            set({ currentModelId: modelId });
            return true;
          }
          return false;
        },

        getCurrentModel: () => {
          const state = get();
          const model = getModelById(state.currentModelId);
          if (model) return model;
          
          const defaultModel = getModelById(DEFAULT_MODEL_CONFIGS.defaultModel);
          if (defaultModel) return defaultModel;
          
          return DEFAULT_MODEL_CONFIGS.models[0];
        },

        getFallbackModels: () => {
          const state = get();
          return state.fallbackModels
            .map(id => getModelById(id))
            .filter((model): model is ModelInfo => model !== undefined);
        },

        getAvailableFallback: () => {
          const state = get();
          return state.fallbackModels
            .filter(id => id !== state.currentModelId)
            .map(id => getModelById(id))
            .filter((model): model is ModelInfo => model !== undefined)
            .filter(model => {
              const usage = state.usage[model.id];
              return !usage || usage.errorCount < 5;
            });
        },

        recordUsage: (tokens?: number) => {
          const state = get();
          const currentModelId = state.currentModelId;
          const now = Date.now();
          
          set((s) => {
            const currentUsage = s.usage[currentModelId] || {
              requestCount: 0,
              totalTokens: 0,
              errorCount: 0,
              lastUsed: 0,
            };
            
            return {
              usage: {
                ...s.usage,
                [currentModelId]: {
                  requestCount: currentUsage.requestCount + 1,
                  totalTokens: currentUsage.totalTokens + (tokens || 0),
                  errorCount: currentUsage.errorCount,
                  lastUsed: now,
                },
              },
            };
          });
        },

        recordError: () => {
          const state = get();
          const currentModelId = state.currentModelId;
          const now = Date.now();
          
          set((s) => {
            const currentUsage = s.usage[currentModelId] || {
              requestCount: 0,
              totalTokens: 0,
              errorCount: 0,
              lastUsed: 0,
            };
            
            return {
              usage: {
                ...s.usage,
                [currentModelId]: {
                  ...currentUsage,
                  errorCount: currentUsage.errorCount + 1,
                  lastUsed: now,
                },
              },
            };
          });
        },

        updateSwitchConfig: (config: Partial<ModelSwitchConfig>) => {
          set((s) => ({
            switchConfig: { ...s.switchConfig, ...config },
          }));
        },

        toggleAutoSwitch: (enabled?: boolean) => {
          set((s) => ({
            isAutoSwitchEnabled: enabled !== undefined ? enabled : !s.isAutoSwitchEnabled,
          }));
        },

        resetUsage: (modelId?: string) => {
          if (modelId) {
            set((s) => {
              const newUsage = { ...s.usage };
              delete newUsage[modelId];
              return { usage: newUsage };
            });
          } else {
            set({ usage: {} });
          }
        },

        getStatistics: () => {
          const state = get();
          const usageValues = Object.values(state.usage);
          
          const totalRequests = usageValues.reduce((sum, u) => sum + u.requestCount, 0);
          const totalTokens = usageValues.reduce((sum, u) => sum + u.totalTokens, 0);
          const totalErrors = usageValues.reduce((sum, u) => sum + u.errorCount, 0);
          const modelCount = usageValues.length;
          const averageErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
          
          return {
            totalRequests,
            totalTokens,
            totalErrors,
            modelCount,
            averageErrorRate,
          };
        },

        getModelHealth: () => {
          const state = get();
          return Object.entries(state.usage).map(([modelId, usage]) => ({
            modelId,
            isHealthy: usage.errorCount < 3,
            errorRate: usage.requestCount > 0 ? usage.errorCount / usage.requestCount : 0,
          }));
        },
      }),
      {
        name: 'model_store',
        partialize: (state) => ({
          currentModelId: state.currentModelId,
          fallbackModels: state.fallbackModels,
          usage: state.usage,
          switchConfig: state.switchConfig,
          isAutoSwitchEnabled: state.isAutoSwitchEnabled,
        }),
      }
    )
  )
);

export const useCurrentModel = () => {
  const currentModel = useModelStore(state => state.getCurrentModel());
  const currentModelId = useModelStore(state => state.currentModelId);
  return { model: currentModel, modelId: currentModelId };
};

export const useModelSwitch = () => {
  const recordUsage = useModelStore(state => state.recordUsage);
  const recordError = useModelStore(state => state.recordError);
  const isAutoSwitchEnabled = useModelStore(state => state.isAutoSwitchEnabled);
  const getAvailableFallback = useModelStore(state => state.getAvailableFallback);
  const setCurrentModel = useModelStore(state => state.setCurrentModel);
  const switchConfig = useModelStore(state => state.switchConfig);

  const switchToNextModel = async (errorType?: string): Promise<boolean> => {
    if (!isAutoSwitchEnabled) return false;

    const availableModels = getAvailableFallback();
    if (availableModels.length === 0) return false;

    const nextModel = availableModels[0];
    setCurrentModel(nextModel.id);
    
    return true;
  };

  return {
    recordUsage,
    recordError,
    isAutoSwitchEnabled,
    switchToNextModel,
    switchConfig,
  };
};

export const useModelStatistics = () => {
  const statistics = useModelStore(state => state.getStatistics());
  const modelHealth = useModelStore(state => state.getModelHealth());
  
  return { statistics, modelHealth };
};

export default useModelStore;
