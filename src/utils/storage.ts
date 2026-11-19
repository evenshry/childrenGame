import { Level, LevelRating, Achievement, SavedProgram } from '@/types/global';

// ==================== 类型定义 ====================

export type { SavedProgram };

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
  showHints: boolean;
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

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  showHints: true,
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

const createDefaultGameData = (): GameData => ({
  version: CURRENT_VERSION,
  user: null,
  progress: {
    currentLevelIndex: 0,
    levels: {},
  },
  customLevels: [],
  modifiedBuiltinLevels: {},
  savedPrograms: [],
  achievements: [],
  stats: { ...DEFAULT_STATS },
  settings: { ...DEFAULT_SETTINGS },
  lastSavedAt: Date.now(),
});

// ==================== 核心存储函数 ====================

/** 内存缓存：避免每次读取都 JSON.parse 整个存档 */
let gameDataCache: GameData | null = null;

const getGameData = (): GameData => {
  if (gameDataCache) return gameDataCache;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GAME_DATA);
    if (!data) {
      gameDataCache = createDefaultGameData();
      return gameDataCache;
    }
    const parsed = JSON.parse(data) as Partial<GameData>;
    gameDataCache = {
      ...createDefaultGameData(),
      ...parsed,
      progress: {
        currentLevelIndex: parsed.progress?.currentLevelIndex ?? 0,
        levels: parsed.progress?.levels ?? {},
      },
      modifiedBuiltinLevels: parsed.modifiedBuiltinLevels || {},
      customLevels: Array.isArray(parsed.customLevels) ? parsed.customLevels : [],
      savedPrograms: Array.isArray(parsed.savedPrograms) ? parsed.savedPrograms : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      stats: { ...DEFAULT_STATS, ...parsed.stats },
    };
    return gameDataCache;
  } catch (error) {
    console.error('Failed to get game data:', error);
    gameDataCache = createDefaultGameData();
    return gameDataCache;
  }
};

const saveGameData = (data: GameData): void => {
  const toSave = { ...data, lastSavedAt: Date.now() };
  gameDataCache = toSave;
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_DATA, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save game data:', error);
  }
};

const updateGameData = (updates: Partial<GameData>): GameData => {
  const updated = { ...getGameData(), ...updates };
  saveGameData(updated);
  return updated;
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
      bestTime:
        timeSpent === undefined
          ? existing?.bestTime
          : existing?.bestTime === undefined
            ? timeSpent
            : Math.min(timeSpent, existing.bestTime),
      attempts: existing?.attempts || 0,
    };

    const newLevels = { ...data.progress.levels, [levelId]: progress };
    const newStats = { ...data.stats };

    if (isFirstComplete) {
      newStats.totalLevelsCompleted += 1;
    }
    // 后续补收的星星也要累计
    newStats.totalStarsCollected += Math.max(0, progress.stars - (existing?.stars || 0));
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
      ...existing,
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
      .filter(([, p]) => p.completed)
      .map(([id]) => id);
  },

  getLevelRatings: (): LevelRating[] => {
    const data = getGameData();
    return Object.values(data.progress.levels)
      .filter(p => p.completed)
      .map(p => ({
        levelId: p.levelId,
        stars: p.stars,
        completedAt: p.completedAt ?? 0,
        minCommands: p.commandsUsed,
      }));
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
      updateGameData({
        modifiedBuiltinLevels: {
          ...data.modifiedBuiltinLevels,
          [level.id]: level,
        },
      });
    } else {
      const existingIndex = data.customLevels.findIndex(l => l.id === level.id);
      const newStats = { ...data.stats };

      let newLevels: Level[];
      if (existingIndex >= 0) {
        newLevels = [...data.customLevels];
        newLevels[existingIndex] = level;
      } else {
        newLevels = [...data.customLevels, level];
        newStats.customLevelsCreated += 1;
      }

      updateGameData({ customLevels: newLevels, stats: newStats });
    }
  },

  delete: (id: string): void => {
    const data = getGameData();

    // 检查是否是修改过的内置关卡：删除修改，恢复为原始内置关卡
    if (data.modifiedBuiltinLevels[id]) {
      const newModifiedBuiltinLevels = { ...data.modifiedBuiltinLevels };
      delete newModifiedBuiltinLevels[id];
      updateGameData({ modifiedBuiltinLevels: newModifiedBuiltinLevels });
    } else {
      updateGameData({
        customLevels: data.customLevels.filter(l => l.id !== id),
      });
    }
  },

  getAllModifiedBuiltinLevels: (): Record<string, Level> => {
    return getGameData().modifiedBuiltinLevels;
  },
};

// ==================== 程序管理 ====================

export const programStorage = {
  getByLevel: (levelId: string): SavedProgram[] => {
    return getGameData().savedPrograms.filter(p => p.levelId === levelId);
  },

  save: (program: SavedProgram): void => {
    const data = getGameData();
    const existingIndex = data.savedPrograms.findIndex(p => p.id === program.id);

    let newPrograms: SavedProgram[];
    const newStats = { ...data.stats };

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
    updateGameData({
      savedPrograms: data.savedPrograms.filter(p => p.id !== id),
    });
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
};

// ==================== 统计数据管理 ====================

export const statsStorage = {
  get: (): PlayerStats => {
    return getGameData().stats;
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
};

// 其它标签页写入存档时丢弃内存缓存，避免互相覆盖
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.GAME_DATA) {
      gameDataCache = null;
    }
  });
}