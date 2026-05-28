import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LevelGenRequest, LevelGenResult, SolverRequest, SolverResult } from '@/api/qianwen/types';

interface AISettings {
  enableLevelGeneration: boolean;
  enableAutoSolve: boolean;
  dailyTokenLimit: number;
}

interface LevelHistoryData {
  request: LevelGenRequest;
  result: LevelGenResult | null;
  rawResponse?: any;
}

interface SolverHistoryData {
  request: SolverRequest;
  result: SolverResult | null;
  rawResponse?: any;
}

type AIHistoryData = LevelHistoryData | SolverHistoryData;

interface AIHistoryEntry {
  id: string;
  type: 'level' | 'solve';
  timestamp: number;
  tokensUsed: number;
  success: boolean;
  data: AIHistoryData;
  error?: string;
}

interface AIState {
  isGenerating: boolean;
  showSettings: boolean;
  lastGeneratedLevel: any;
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
  setLastGeneratedLevel: (level: any) => void;
  updateUsage: (input: number, output: number) => void;
  resetDailyUsage: () => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  addHistoryEntry: (entry: AIHistoryEntry) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  isDailyLimitReached: () => boolean;
  getHistoryById: (id: string) => AIHistoryEntry | undefined;
}

const DEFAULT_SETTINGS: AISettings = {
  enableLevelGeneration: true,
  enableAutoSolve: true,
  dailyTokenLimit: 10000,
};

const loadSettings = (): AISettings => {
  try {
    const saved = localStorage.getItem('ai_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const loadHistory = (): AIHistoryEntry[] => {
  try {
    const saved = localStorage.getItem('ai_history');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const useAIStore = create<AIState & AIActions>()(
  devtools(
    (set, get) => ({
      isGenerating: false,
      showSettings: false,
      lastGeneratedLevel: null,
      usage: {
        totalTokens: parseInt(localStorage.getItem('ai_total_tokens') || '0'),
        todayTokens: parseInt(localStorage.getItem('ai_today_tokens') || '0'),
      },
      settings: loadSettings(),
      generationHistory: loadHistory(),

      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setShowSettings: (show) => set({ showSettings: show }),
      setLastGeneratedLevel: (level) => set({ lastGeneratedLevel: level }),
      
      updateUsage: (input, output) => {
        set((state) => {
          const newTotal = state.usage.totalTokens + input + output;
          const newToday = state.usage.todayTokens + input + output;
          
          localStorage.setItem('ai_total_tokens', newTotal.toString());
          localStorage.setItem('ai_today_tokens', newToday.toString());
          
          return {
            usage: {
              totalTokens: newTotal,
              todayTokens: newToday,
            },
          };
        });
      },
      
      resetDailyUsage: () => {
        set((state) => ({
          usage: {
            totalTokens: state.usage.totalTokens,
            todayTokens: 0,
          },
        }));
        localStorage.setItem('ai_today_tokens', '0');
      },
      
      updateSettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.settings, ...settings };
          localStorage.setItem('ai_settings', JSON.stringify(newSettings));
          return { settings: newSettings };
        });
      },
      
      addHistoryEntry: (entry) => {
        set((state) => {
          const newHistory = [entry, ...state.generationHistory].slice(0, 100);
          localStorage.setItem('ai_history', JSON.stringify(newHistory));
          return { generationHistory: newHistory };
        });
      },
      
      deleteHistoryEntry: (id) => {
        set((state) => {
          const newHistory = state.generationHistory.filter(entry => entry.id !== id);
          localStorage.setItem('ai_history', JSON.stringify(newHistory));
          return { generationHistory: newHistory };
        });
      },
      
      clearHistory: () => {
        set({ generationHistory: [] });
        localStorage.removeItem('ai_history');
      },
      
      isDailyLimitReached: () => {
        const { usage, settings } = get();
        return usage.todayTokens >= settings.dailyTokenLimit;
      },

      getHistoryById: (id) => {
        return get().generationHistory.find(entry => entry.id === id);
      },
    })
  )
);

export type { AIHistoryEntry, AISettings, LevelHistoryData, SolverHistoryData };
