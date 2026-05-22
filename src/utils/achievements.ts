import { Achievement } from '@/types/global';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  condition: (stats: PlayerStats) => boolean;
  hidden?: boolean;
  points: number;
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
}

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'first_steps',
    name: '第一步',
    description: '完成你的第一个关卡',
    icon: '👶',
    category: 'beginner',
    points: 10,
    condition: (stats) => stats.totalLevelsCompleted >= 1,
  },
  {
    id: 'star_collector',
    name: '星星收集者',
    description: '收集10颗星星',
    icon: '⭐',
    category: 'beginner',
    points: 15,
    condition: (stats) => stats.totalStarsCollected >= 10,
  },
  {
    id: 'star_master',
    name: '星星大师',
    description: '收集50颗星星',
    icon: '🌟',
    category: 'intermediate',
    points: 30,
    condition: (stats) => stats.totalStarsCollected >= 50,
  },
  {
    id: 'level_5',
    name: '初露锋芒',
    description: '完成5个关卡',
    icon: '🎯',
    category: 'beginner',
    points: 20,
    condition: (stats) => stats.totalLevelsCompleted >= 5,
  },
  {
    id: 'level_10',
    name: '小有成就',
    description: '完成10个关卡',
    icon: '🏆',
    category: 'intermediate',
    points: 40,
    condition: (stats) => stats.totalLevelsCompleted >= 10,
  },
  {
    id: 'level_20',
    name: '编程达人',
    description: '完成20个关卡',
    icon: '👑',
    category: 'advanced',
    points: 80,
    condition: (stats) => stats.totalLevelsCompleted >= 20,
  },
  {
    id: 'perfect_run',
    name: '完美通关',
    description: '以最少指令数完成一个关卡',
    icon: '💯',
    category: 'intermediate',
    points: 25,
    condition: (stats) => stats.perfectLevels >= 1,
  },
  {
    id: 'speed_demon',
    name: '速度之星',
    description: '快速完成5个关卡',
    icon: '⚡',
    category: 'advanced',
    points: 50,
    condition: (stats) => stats.speedRuns >= 5,
  },
  {
    id: 'no_hints',
    name: '独立思考',
    description: '不使用提示完成5个关卡',
    icon: '🧠',
    category: 'intermediate',
    points: 35,
    condition: (stats) => stats.hintsUsed === 0 && stats.totalLevelsCompleted >= 5,
  },
  {
    id: 'creative',
    name: '创意大师',
    description: '创建3个自定义关卡',
    icon: '🎨',
    category: 'intermediate',
    points: 30,
    condition: (stats) => stats.customLevelsCreated >= 3,
  },
  {
    id: 'programmer',
    name: '程序设计师',
    description: '保存10个程序方案',
    icon: '💾',
    category: 'beginner',
    points: 20,
    condition: (stats) => stats.programsSaved >= 10,
  },
  {
    id: 'dedicated',
    name: '坚持不懈',
    description: '连续7天玩游戏',
    icon: '📅',
    category: 'advanced',
    points: 60,
    condition: (stats) => stats.consecutiveDays >= 7,
  },
  {
    id: 'master',
    name: '编程大师',
    description: '解锁所有其他成就',
    icon: '🎖️',
    category: 'master',
    points: 200,
    condition: (stats) => stats.achievementsUnlocked >= achievementDefinitions.length - 1,
  },
];

export const checkAchievements = (stats: PlayerStats): Achievement[] => {
  const unlockedAchievements: Achievement[] = [];

  achievementDefinitions.forEach((def) => {
    if (def.condition(stats)) {
      unlockedAchievements.push({
        id: def.id,
        type: def.id as any,
        name: def.name,
        description: def.description,
        icon: def.icon,
        unlocked: true,
        unlockedAt: Date.now(),
      });
    }
  });

  return unlockedAchievements;
};

export const getAchievementById = (id: string): AchievementDefinition | undefined => {
  return achievementDefinitions.find((def) => def.id === id);
};

export const getAchievementsByCategory = (category: AchievementDefinition['category']): AchievementDefinition[] => {
  return achievementDefinitions.filter((def) => def.category === category);
};

export const getTotalPoints = (unlockedIds: string[]): number => {
  return unlockedIds.reduce((total, id) => {
    const def = getAchievementById(id);
    return total + (def?.points || 0);
  }, 0);
};

export const getAchievementProgress = (stats: PlayerStats): {
  total: number;
  unlocked: number;
  points: number;
  totalPoints: number;
} => {
  const unlocked = checkAchievements(stats);
  const totalPoints = achievementDefinitions.reduce((sum, def) => sum + def.points, 0);
  const points = getTotalPoints(unlocked.map((a) => a.id));

  return {
    total: achievementDefinitions.length,
    unlocked: unlocked.length,
    points,
    totalPoints,
  };
};

export const getNextAchievements = (stats: PlayerStats, count: number = 3): AchievementDefinition[] => {
  const unlockedIds = checkAchievements(stats).map((a) => a.id);

  return achievementDefinitions
    .filter((def) => !unlockedIds.includes(def.id) && !def.hidden)
    .slice(0, count);
};

export const getAchievementCategoryInfo = (category: AchievementDefinition['category']): {
  name: string;
  color: string;
  icon: string;
} => {
  switch (category) {
    case 'beginner':
      return { name: '初学者', color: '#48bb78', icon: '🌱' };
    case 'intermediate':
      return { name: '进阶者', color: '#4299e1', icon: '🌿' };
    case 'advanced':
      return { name: '高级者', color: '#9f7aea', icon: '🌳' };
    case 'master':
      return { name: '大师', color: '#ffd93d', icon: '🏆' };
    default:
      return { name: '未知', color: '#a0aec0', icon: '❓' };
  }
};
