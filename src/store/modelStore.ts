import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ModelInfo, DEFAULT_MODEL_CONFIGS, getModelById } from '@/config/models';

export interface ModelSwitchConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  fallbackOnError: boolean;
  fallbackOnQuotaExceeded: boolean;
}

interface ModelUsage {
  requestCount: number;
  totalTokens: number;
  errorCount: number;
  lastUsed: number;
}

interface ModelState {
  currentModelId: string;
  fallbackModels: string[];
  usage: Record<string, ModelUsage>;
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

const DEFAULT_SWITCH_CONFIG: ModelSwitchConfig = {
  enabled: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  fallbackOnError: true,
  fallbackOnQuotaExceeded: true,
};

const emptyUsage = (): ModelUsage => ({
  requestCount: 0,
  totalTokens: 0,
  errorCount: 0,
  lastUsed: 0,
});

export const useModelStore = create<ModelStore>()(
  devtools(
    persist(
      (set, get) => ({
        currentModelId: DEFAULT_MODEL_CONFIGS.defaultModel,
        fallbackModels: DEFAULT_MODEL_CONFIGS.fallbackModels,
        usage: {},
        switchConfig: DEFAULT_SWITCH_CONFIG,
        isAutoSwitchEnabled: true,

        setCurrentModel: (modelId: string) => {
          const model = getModelById(modelId);
          if (!model) return false;
          set({ currentModelId: modelId });
          return true;
        },

        getCurrentModel: () => {
          const state = get();
          return (
            getModelById(state.currentModelId) ??
            getModelById(DEFAULT_MODEL_CONFIGS.defaultModel) ??
            DEFAULT_MODEL_CONFIGS.models[0]
          );
        },

        getFallbackModels: () =>
          get()
            .fallbackModels.map((id) => getModelById(id))
            .filter((model): model is ModelInfo => model !== undefined),

        getAvailableFallback: () =>
          get()
            .fallbackModels.filter((id) => id !== get().currentModelId)
            .map((id) => getModelById(id))
            .filter((model): model is ModelInfo => model !== undefined)
            .filter((model) => (get().usage[model.id]?.errorCount ?? 0) < 5),

        recordUsage: (tokens?: number) => {
          const currentModelId = get().currentModelId;
          const now = Date.now();
          set((state) => {
            const current = state.usage[currentModelId] ?? emptyUsage();
            return {
              usage: {
                ...state.usage,
                [currentModelId]: {
                  requestCount: current.requestCount + 1,
                  totalTokens: current.totalTokens + (tokens || 0),
                  errorCount: current.errorCount,
                  lastUsed: now,
                },
              },
            };
          });
        },

        recordError: () => {
          const currentModelId = get().currentModelId;
          const now = Date.now();
          set((state) => {
            const current = state.usage[currentModelId] ?? emptyUsage();
            return {
              usage: {
                ...state.usage,
                [currentModelId]: {
                  ...current,
                  errorCount: current.errorCount + 1,
                  lastUsed: now,
                },
              },
            };
          });
        },

        updateSwitchConfig: (config) => {
          set((state) => ({ switchConfig: { ...state.switchConfig, ...config } }));
        },

        toggleAutoSwitch: (enabled) => {
          set((state) => ({
            isAutoSwitchEnabled: enabled !== undefined ? enabled : !state.isAutoSwitchEnabled,
          }));
        },

        resetUsage: (modelId) => {
          if (modelId) {
            set((state) => {
              const usage = { ...state.usage };
              delete usage[modelId];
              return { usage };
            });
          } else {
            set({ usage: {} });
          }
        },

        getStatistics: () => {
          const usageValues = Object.values(get().usage);
          const totalRequests = usageValues.reduce((sum, item) => sum + item.requestCount, 0);
          const totalTokens = usageValues.reduce((sum, item) => sum + item.totalTokens, 0);
          const totalErrors = usageValues.reduce((sum, item) => sum + item.errorCount, 0);
          return {
            totalRequests,
            totalTokens,
            totalErrors,
            modelCount: usageValues.length,
            averageErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
          };
        },

        getModelHealth: () =>
          Object.entries(get().usage).map(([modelId, usage]) => ({
            modelId,
            isHealthy: usage.errorCount < 3,
            errorRate: usage.requestCount > 0 ? usage.errorCount / usage.requestCount : 0,
          })),
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
      },
    ),
  ),
);

export default useModelStore;