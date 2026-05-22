import { Command, Level, LevelRating, Achievement } from '@/types/global';
import { getAllLevels } from '@/utils/constants';

// ==================== 类型定义 ====================

export interface UserInfo {
  id: string;
  nickname: string;
  avatar?: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  stars: number;
  commandsUsed: number;
  completedAt?: number;
  bestTime?: number;
  attempts: number;
}

export interface SavedProgram {
  id: string;
  name: string;
  commands: Command[];
  levelId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerStats {
  totalLevelsCompleted: number;
  totalStarsCollected: number;
  totalCommandsUsed: number;
  perfectLevels: number;
  speedRuns: number;
  consecutiveDays: number;
  customLevelsCreated: number;
  programsSaved: number;
  hintsUsed: number;
  achievementsUnlocked: number;
  totalPlayTime: number;
  lastPlayDate: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'auto';
  showHints: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

export interface GameData {
  version: string;
  user: UserInfo | null;
  progress: {
    currentLevelIndex: number;
    levels: Record<string, LevelProgress>;
  };
  customLevels: Level[];
  modifiedBuiltinLevels: Record<string, Level>;
  savedPrograms: SavedProgram[];
  achievements: Achievement[];
  stats: PlayerStats;
  settings: GameSettings;
  lastSavedAt: number;
}

// ==================== 存储键名 ====================

const STORAGE_KEYS = {
  GAME_DATA: 'children_game_data_v2',
} as const;

const CURRENT_VERSION = '2.0.0';

// ==================== 默认值 ====================

const DEFAULT_USER: UserInfo | null = null;

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.8,
  language: 'zh-CN',
  theme: 'light',
  showHints: true,
  animationSpeed: 'normal',
};

const DEFAULT_STATS: PlayerStats = {
  totalLevelsCompleted: 0,
  totalStarsCollected: 0,
  totalCommandsUsed: 0,
  perfectLevels: 0,
  speedRuns: 0,
  consecutiveDays: 0,
  customLevelsCreated: 0,
  programsSaved: 0,
  hintsUsed: 0,
  achievementsUnlocked: 0,
  totalPlayTime: 0,
  lastPlayDate: '',
};

const DEFAULT_GAME_DATA: GameData = {
  version: CURRENT_VERSION,
  user: DEFAULT_USER,
  progress: {
    currentLevelIndex: 0,
    levels: {},
  },
  customLevels: [],
  modifiedBuiltinLevels: {},
  savedPrograms: [],
  achievements: [],
  stats: DEFAULT_STATS,
  settings: DEFAULT_SETTINGS,
  lastSavedAt: Date.now(),
};

// ==================== 核心存储函数 ====================

const getGameData = (): GameData => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_DATA);
    if (!data) {
      return { ...DEFAULT_GAME_DATA };
    }
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_GAME_DATA,
      ...parsed,
      modifiedBuiltinLevels: parsed.modifiedBuiltinLevels || {},
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      stats: { ...DEFAULT_STATS, ...parsed.stats },
    };
  } catch (error) {
    console.error('Failed to get game data:', error);
    return { ...DEFAULT_GAME_DATA };
  }
};

const saveGameData = (data: GameData): void => {
  try {
    const toSave = {
      ...data,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.GAME_DATA, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save game data:', error);
  }
};

const updateGameData = (updates: Partial<GameData>): GameData => {
  const current = getGameData();
  const updated = { ...current, ...updates };
  saveGameData(updated);
  return updated;
};

// ==================== 用户管理 ====================

export const userStorage = {
  get: (): UserInfo | null => {
    return getGameData().user;
  },

  create: (nickname: string): UserInfo => {
    const user: UserInfo = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nickname,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    updateGameData({ user });
    return user;
  },

  update: (updates: Partial<UserInfo>): UserInfo | null => {
    const current = getGameData();
    if (!current.user) return null;
    const updated = { ...current.user, ...updates, lastLoginAt: Date.now() };
    updateGameData({ user: updated });
    return updated;
  },

  updateLastLogin: (): void => {
    const current = getGameData();
    if (current.user) {
      updateGameData({
        user: { ...current.user, lastLoginAt: Date.now() }
      });
    }
  },

  delete: (): void => {
    updateGameData({ user: null });
  },
};

// ==================== 关卡进度管理 ====================

export const progressStorage = {
  getCurrentLevelIndex: (): number => {
    return getGameData().progress.currentLevelIndex;
  },

  setCurrentLevelIndex: (index: number): void => {
    const data = getGameData();
    updateGameData({
      progress: { ...data.progress, currentLevelIndex: index }
    });
  },

  getLevelProgress: (levelId: string): LevelProgress | null => {
    const data = getGameData();
    return data.progress.levels[levelId] || null;
  },

  getAllLevelProgress: (): Record<string, LevelProgress> => {
    return getGameData().progress.levels;
  },

  completeLevel: (
    levelId: string,
    stars: number,
    commandsUsed: number,
    timeSpent?: number
  ): LevelProgress => {
    const data = getGameData();
    const existing = data.progress.levels[levelId];
    const isFirstComplete = !existing?.completed;

    const progress: LevelProgress = {
      levelId,
      completed: true,
      stars: Math.max(stars, existing?.stars || 0),
      commandsUsed: existing?.commandsUsed
        ? Math.min(commandsUsed, existing.commandsUsed)
        : commandsUsed,
      completedAt: existing?.completedAt || Date.now(),
      bestTime: existing?.bestTime
        ? Math.min(timeSpent || Infinity, existing.bestTime)
        : timeSpent,
      attempts: (existing?.attempts || 0) + 1,
    };

    const newLevels = { ...data.progress.levels, [levelId]: progress };
    const newStats = { ...data.stats };

    if (isFirstComplete) {
      newStats.totalLevelsCompleted += 1;
      newStats.totalStarsCollected += stars;
    }
    newStats.totalCommandsUsed += commandsUsed;

    updateGameData({
      progress: { ...data.progress, levels: newLevels },
      stats: newStats,
    });

    return progress;
  },

  incrementAttempts: (levelId: string): void => {
    const data = getGameData();
    const existing = data.progress.levels[levelId];
    const progress: LevelProgress = {
      levelId,
      completed: existing?.completed || false,
      stars: existing?.stars || 0,
      commandsUsed: existing?.commandsUsed || 0,
      attempts: (existing?.attempts || 0) + 1,
    };
    const newLevels = { ...data.progress.levels, [levelId]: progress };
    updateGameData({
      progress: { ...data.progress, levels: newLevels }
    });
  },

  getCompletedLevelIds: (): string[] => {
    const data = getGameData();
    return Object.entries(data.progress.levels)
      .filter(([_, p]) => p.completed)
      .map(([id]) => id);
  },

  getTotalStars: (): number => {
    const data = getGameData();
    return Object.values(data.progress.levels)
      .filter(p => p.completed)
      .reduce((sum, p) => sum + p.stars, 0);
  },

  getLevelRatings: (): LevelRating[] => {
    const data = getGameData();
    return Object.values(data.progress.levels)
      .filter(p => p.completed)
      .map(p => ({
        levelId: p.levelId,
        stars: p.stars,
        completedAt: p.completedAt!,
        minCommands: p.commandsUsed,
      }));
  },

  reset: (): void => {
    const data = getGameData();
    updateGameData({
      progress: { currentLevelIndex: 0, levels: {} }
    });
  },
};

// ==================== 自定义关卡管理 ====================

export const customLevelStorage = {
  getAll: (): Level[] => {
    return getGameData().customLevels;
  },

  getById: (id: string): Level | undefined => {
    const data = getGameData();
    // 先查找是否是修改过的内置关卡
    if (data.modifiedBuiltinLevels[id]) {
      return data.modifiedBuiltinLevels[id];
    }
    // 再查找自定义关卡
    return data.customLevels.find(l => l.id === id);
  },

  save: (level: Level): void => {
    const data = getGameData();
    
    // 检查是否是内置关卡
    const isBuiltinLevel = level.id.startsWith('level_');
    
    if (isBuiltinLevel) {
      // 保存为修改后的内置关卡
      const newModifiedBuiltinLevels = {
        ...data.modifiedBuiltinLevels,
        [level.id]: level,
      };
      updateGameData({ modifiedBuiltinLevels: newModifiedBuiltinLevels });
    } else {
      // 保存为自定义关卡
      const existingIndex = data.customLevels.findIndex(l => l.id === level.id);

      let newLevels: Level[];
      if (existingIndex >= 0) {
        newLevels = [...data.customLevels];
        newLevels[existingIndex] = level;
      } else {
        newLevels = [...data.customLevels, level];
        updateGameData({
          stats: { ...data.stats, customLevelsCreated: data.stats.customLevelsCreated + 1 }
        });
      }

      updateGameData({ customLevels: newLevels });
    }
  },

  delete: (id: string): void => {
    const data = getGameData();
    
    // 检查是否是修改过的内置关卡
    if (data.modifiedBuiltinLevels[id]) {
      // 从修改的内置关卡中删除，恢复为原始内置关卡
      const newModifiedBuiltinLevels = { ...data.modifiedBuiltinLevels };
      delete newModifiedBuiltinLevels[id];
      updateGameData({ modifiedBuiltinLevels: newModifiedBuiltinLevels });
    } else {
      // 删除自定义关卡
      const newLevels = data.customLevels.filter(l => l.id !== id);
      updateGameData({ customLevels: newLevels });
    }
  },

  count: (): number => {
    const data = getGameData();
    return data.customLevels.length + Object.keys(data.modifiedBuiltinLevels).length;
  },

  getModifiedBuiltinLevel: (id: string): Level | undefined => {
    return getGameData().modifiedBuiltinLevels[id];
  },
};

// ==================== 程序管理 ====================

export const programStorage = {
  getAll: (): SavedProgram[] => {
    return getGameData().savedPrograms;
  },

  getByLevel: (levelId: string): SavedProgram[] => {
    return getGameData().savedPrograms.filter(p => p.levelId === levelId);
  },

  getById: (id: string): SavedProgram | undefined => {
    return getGameData().savedPrograms.find(p => p.id === id);
  },

  save: (program: SavedProgram): void => {
    const data = getGameData();
    const existingIndex = data.savedPrograms.findIndex(p => p.id === program.id);

    let newPrograms: SavedProgram[];
    let newStats = { ...data.stats };

    if (existingIndex >= 0) {
      newPrograms = [...data.savedPrograms];
      newPrograms[existingIndex] = { ...program, updatedAt: Date.now() };
    } else {
      newPrograms = [...data.savedPrograms, {
        ...program,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
      newStats.programsSaved += 1;
    }

    updateGameData({ savedPrograms: newPrograms, stats: newStats });
  },

  delete: (id: string): void => {
    const data = getGameData();
    const newPrograms = data.savedPrograms.filter(p => p.id !== id);
    updateGameData({ savedPrograms: newPrograms });
  },

  deleteByLevel: (levelId: string): void => {
    const data = getGameData();
    const newPrograms = data.savedPrograms.filter(p => p.levelId !== levelId);
    updateGameData({ savedPrograms: newPrograms });
  },
};

// ==================== 成就管理 ====================

export const achievementStorage = {
  getAll: (): Achievement[] => {
    return getGameData().achievements;
  },

  getUnlockedIds: (): string[] => {
    return getGameData().achievements
      .filter(a => a.unlocked)
      .map(a => a.id);
  },

  unlock: (achievement: Achievement): void => {
    const data = getGameData();
    const existing = data.achievements.find(a => a.id === achievement.id);

    if (existing?.unlocked) return;

    let newAchievements: Achievement[];
    if (existing) {
      newAchievements = data.achievements.map(a =>
        a.id === achievement.id ? { ...achievement, unlocked: true, unlockedAt: Date.now() } : a
      );
    } else {
      newAchievements = [...data.achievements, { ...achievement, unlocked: true, unlockedAt: Date.now() }];
    }

    updateGameData({
      achievements: newAchievements,
      stats: { ...data.stats, achievementsUnlocked: data.stats.achievementsUnlocked + 1 }
    });
  },

  isUnlocked: (id: string): boolean => {
    const achievement = getGameData().achievements.find(a => a.id === id);
    return achievement?.unlocked || false;
  },

  getPoints: (): number => {
    const data = getGameData();
    return data.achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + (a.points || 0), 0);
  },
};

// ==================== 统计数据管理 ====================

export const statsStorage = {
  get: (): PlayerStats => {
    return getGameData().stats;
  },

  update: (updates: Partial<PlayerStats>): PlayerStats => {
    const data = getGameData();
    const newStats = { ...data.stats, ...updates };
    updateGameData({ stats: newStats });
    return newStats;
  },

  incrementHintUsage: (): void => {
    const data = getGameData();
    updateGameData({
      stats: { ...data.stats, hintsUsed: data.stats.hintsUsed + 1 }
    });
  },

  addPlayTime: (seconds: number): void => {
    const data = getGameData();
    updateGameData({
      stats: { ...data.stats, totalPlayTime: data.stats.totalPlayTime + seconds }
    });
  },

  updateConsecutiveDays: (): void => {
    const data = getGameData();
    const today = new Date().toDateString();
    const lastPlay = data.stats.lastPlayDate;

    if (lastPlay === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newConsecutive = lastPlay === yesterday
      ? data.stats.consecutiveDays + 1
      : 1;

    updateGameData({
      stats: {
        ...data.stats,
        consecutiveDays: newConsecutive,
        lastPlayDate: today
      }
    });
  },

  recordSpeedRun: (): void => {
    const data = getGameData();
    updateGameData({
      stats: { ...data.stats, speedRuns: data.stats.speedRuns + 1 }
    });
  },

  recordPerfectLevel: (): void => {
    const data = getGameData();
    updateGameData({
      stats: { ...data.stats, perfectLevels: data.stats.perfectLevels + 1 }
    });
  },
};

// ==================== 设置管理 ====================

export const settingsStorage = {
  get: (): GameSettings => {
    return getGameData().settings;
  },

  update: (updates: Partial<GameSettings>): GameSettings => {
    const data = getGameData();
    const newSettings = { ...data.settings, ...updates };
    updateGameData({ settings: newSettings });
    return newSettings;
  },

  toggleSound: (): boolean => {
    const data = getGameData();
    const newValue = !data.settings.soundEnabled;
    updateGameData({ settings: { ...data.settings, soundEnabled: newValue } });
    return newValue;
  },

  toggleMusic: (): boolean => {
    const data = getGameData();
    const newValue = !data.settings.musicEnabled;
    updateGameData({ settings: { ...data.settings, musicEnabled: newValue } });
    return newValue;
  },

  setVolume: (volume: number): void => {
    const data = getGameData();
    updateGameData({ settings: { ...data.settings, volume } });
  },
};

// ==================== 数据导入导出 ====================

export const dataExport = {
  export: (): string => {
    const data = getGameData();
    return JSON.stringify({
      ...data,
      exportedAt: Date.now(),
    }, null, 2);
  },

  import: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.version && data.progress) {
        saveGameData({
          ...DEFAULT_GAME_DATA,
          ...data,
          version: CURRENT_VERSION,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },

  download: (filename: string = 'children_game_backup'): void => {
    const data = dataExport.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  upload: (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const success = dataExport.import(result);
        resolve(success);
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  },
};

// ==================== 数据清理 ====================

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.GAME_DATA);
};

export const resetProgress = (): void => {
  const data = getGameData();
  updateGameData({
    progress: { currentLevelIndex: 0, levels: {} },
    stats: DEFAULT_STATS,
    achievements: [],
  });
};

// ==================== 兼容旧版本的接口 ====================

export const storage = {
  getUserProgress: () => {
    const data = getGameData();
    return {
      currentLevel: data.progress.currentLevelIndex + 1,
      completedLevels: Object.entries(data.progress.levels)
        .filter(([_, p]) => p.completed)
        .map(([id, _]) => {
          const allLevels = getAllLevels();
          return allLevels.findIndex((l: Level) => l.id === id);
        })
        .filter((idx: number) => idx >= 0),
      totalStars: progressStorage.getTotalStars(),
      achievements: achievementStorage.getUnlockedIds(),
      savedPrograms: data.savedPrograms,
      lastPlayedAt: data.lastSavedAt,
    };
  },

  saveUserProgress: (progress: any) => {
    if (progress.currentLevel !== undefined) {
      progressStorage.setCurrentLevelIndex(progress.currentLevel - 1);
    }
  },

  updateUserProgress: (updates: any) => {
    const current = storage.getUserProgress();
    return { ...current, ...updates };
  },

  getCustomLevels: () => customLevelStorage.getAll(),
  saveCustomLevel: (level: Level) => customLevelStorage.save(level),
  deleteCustomLevel: (id: string) => customLevelStorage.delete(id),

  saveProgram: (program: SavedProgram) => programStorage.save(program),
  deleteProgram: (id: string) => programStorage.delete(id),
  getProgramsByLevel: (levelId: string) => programStorage.getByLevel(levelId),

  clearAllData,
};

export { getGameData, saveGameData, updateGameData };
