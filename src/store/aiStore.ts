import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  LevelGenRequest,
  LevelGenResult,
  SolverRequest,
  SolverResult,
} from '@/api/qianwen/types';

interface AISettings {
  enableLevelGeneration: boolean;
  enableAutoSolve: boolean;
  dailyTokenLimit: number;
  apiKey: string;
  apiBaseUrl: string;
}

interface LevelHistoryData {
  request: LevelGenRequest;
  result: LevelGenResult | null;
  rawResponse?: unknown;
}

interface SolverHistoryData {
  request: SolverRequest;
  result: SolverResult | null;
  rawResponse?: unknown;
}

interface AIHistoryBase {
  id: string;
  timestamp: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export type AIHistoryEntry =
  | (AIHistoryBase & { type: 'level'; data: LevelHistoryData })
  | (AIHistoryBase & { type: 'solve'; data: SolverHistoryData });

interface AIState {
  isGenerating: boolean;
  showSettings: boolean;
  lastGeneratedLevel: LevelGenResult | null;
  usage: {
    totalTokens: number;
    todayTokens: number;
  };
  settings: AISettings;
  generationHistory: AIHistoryEntry[];
}

interface AIActions {
  setIsGenerating: (isGenerating: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setLastGeneratedLevel: (level: LevelGenResult | null) => void;
  updateUsage: (input: number, output: number) => void;
  resetDailyUsage: () => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  addHistoryEntry: (entry: AIHistoryEntry) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  isDailyLimitReached: () => boolean;
  getHistoryById: (id: string) => AIHistoryEntry | undefined;
}

const SETTINGS_KEY = 'ai_settings';
const HISTORY_KEY = 'ai_history';
const TOTAL_TOKENS_KEY = 'ai_total_tokens';
const TODAY_TOKENS_KEY = 'ai_today_tokens';
const USAGE_DATE_KEY = 'ai_usage_date';

const DEFAULT_SETTINGS: AISettings = {
  enableLevelGeneration: true,
  enableAutoSolve: true,
  dailyTokenLimit: 10000,
  apiKey: '',
  apiBaseUrl:
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
};

const todayKey = (): string => new Date().toDateString();

const loadSettings = (): AISettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<AISettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const loadHistory = (): AIHistoryEntry[] => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? (parsed as AIHistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const loadUsage = (): { totalTokens: number; todayTokens: number } => {
  const totalTokens = parseInt(localStorage.getItem(TOTAL_TOKENS_KEY) || '0', 10) || 0;
  let todayTokens = parseInt(localStorage.getItem(TODAY_TOKENS_KEY) || '0', 10) || 0;

  if (localStorage.getItem(USAGE_DATE_KEY) !== todayKey()) {
    todayTokens = 0;
    localStorage.setItem(TODAY_TOKENS_KEY, '0');
    localStorage.setItem(USAGE_DATE_KEY, todayKey());
  }

  return { totalTokens, todayTokens };
};

export const useAIStore = create<AIState & AIActions>()(
  devtools(
    (set, get) => ({
      isGenerating: false,
      showSettings: false,
      lastGeneratedLevel: null,
      usage: loadUsage(),
      settings: loadSettings(),
      generationHistory: loadHistory(),

      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setShowSettings: (show) => set({ showSettings: show }),
      setLastGeneratedLevel: (level) => set({ lastGeneratedLevel: level }),

      updateUsage: (input, output) => {
        const { usage } = get();
        const newTotal = usage.totalTokens + input + output;
        const newToday = usage.todayTokens + input + output;

        localStorage.setItem(TOTAL_TOKENS_KEY, newTotal.toString());
        localStorage.setItem(TODAY_TOKENS_KEY, newToday.toString());
        localStorage.setItem(USAGE_DATE_KEY, todayKey());

        set({ usage: { totalTokens: newTotal, todayTokens: newToday } });
      },

      resetDailyUsage: () => {
        localStorage.setItem(TODAY_TOKENS_KEY, '0');
        localStorage.setItem(USAGE_DATE_KEY, todayKey());
        set({ usage: { totalTokens: get().usage.totalTokens, todayTokens: 0 } });
      },

      updateSettings: (settings) => {
        const newSettings = { ...get().settings, ...settings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        set({ settings: newSettings });
      },

      addHistoryEntry: (entry) => {
        const newHistory = [entry, ...get().generationHistory].slice(0, 100);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        set({ generationHistory: newHistory });
      },

      deleteHistoryEntry: (id) => {
        const newHistory = get().generationHistory.filter((entry) => entry.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        set({ generationHistory: newHistory });
      },

      clearHistory: () => {
        localStorage.removeItem(HISTORY_KEY);
        set({ generationHistory: [] });
      },

      isDailyLimitReached: () => {
        if (localStorage.getItem(USAGE_DATE_KEY) !== todayKey()) {
          get().resetDailyUsage();
          return false;
        }
        const { usage, settings } = get();
        return usage.todayTokens >= settings.dailyTokenLimit;
      },

      getHistoryById: (id) => get().generationHistory.find((entry) => entry.id === id),
    }),
  ),
);

export type { AISettings, LevelHistoryData, SolverHistoryData };

export const getApiKey = (): string => {
  const { settings } = useAIStore.getState();
  if (settings.apiKey) {
    return settings.apiKey;
  }
  return import.meta.env.VITE_QIANWEN_API_KEY || '';
};

export const getApiBaseUrl = (): string => {
  const { settings } = useAIStore.getState();
  if (settings.apiBaseUrl) {
    return settings.apiBaseUrl;
  }
  return (
    import.meta.env.VITE_QIANWEN_API_BASE_URL ||
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
  );
};

export const hasApiKey = (): boolean => !!getApiKey();