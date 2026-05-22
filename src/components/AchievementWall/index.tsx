import React, { useState, useEffect } from 'react';
import { Achievement } from '@/types/global';
import {
  achievementDefinitions,
  getAchievementCategoryInfo,
  getAchievementProgress,
  PlayerStats,
} from '@/utils/achievements';
import { playClickSound, celebrateWin } from '@/utils/animations';
import styles from './index.module.scss';

interface AchievementWallProps {
  achievements: Achievement[];
  playerStats?: PlayerStats;
}

const AchievementWall: React.FC<AchievementWallProps> = ({
  achievements,
  playerStats,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);

  const unlockedMap = new Map(
    achievements.filter(a => a.unlocked).map(a => [a.id, a])
  );

  const progress = playerStats
    ? getAchievementProgress(playerStats)
    : {
        total: achievementDefinitions.length,
        unlocked: unlockedMap.size,
        points: 0,
        totalPoints: achievementDefinitions.reduce((sum, def) => sum + def.points, 0),
      };

  const filteredDefinitions = achievementDefinitions.filter((def) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unlocked') return unlockedMap.has(def.id);
    if (selectedCategory === 'locked') return !unlockedMap.has(def.id);
    return def.category === selectedCategory;
  });

  const categories = [
    { id: 'all', name: '全部', icon: '📋' },
    { id: 'unlocked', name: '已解锁', icon: '✅' },
    { id: 'locked', name: '未解锁', icon: '🔒' },
    { id: 'beginner', name: '初学者', icon: '🌱' },
    { id: 'intermediate', name: '进阶者', icon: '🌿' },
    { id: 'advanced', name: '高级者', icon: '🌳' },
    { id: 'master', name: '大师', icon: '🏆' },
  ];

  const handleCategoryChange = (categoryId: string) => {
    playClickSound();
    setSelectedCategory(categoryId);
  };

  const handleAchievementClick = (achievementId: string, isUnlocked: boolean) => {
    playClickSound();
    if (isUnlocked) {
      const element = document.querySelector(`[data-achievement-id="${achievementId}"]`);
      if (element) {
        celebrateWin(element as HTMLElement);
      }
    }
  };

  return (
    <div className={styles.achievementWall}>
      <div className={styles.header}>
        <h2 className={styles.title}>🏆 成就墙</h2>
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(progress.unlocked / progress.total) * 100}%` }}
            />
          </div>
          <div className={styles.progressText}>
            <span>已解锁 {progress.unlocked}/{progress.total}</span>
            <span>积分 {progress.points}/{progress.totalPoints}</span>
          </div>
        </div>
      </div>

      <div className={styles.categoryTabs}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.active : ''}`}
            onClick={() => handleCategoryChange(cat.id)}
          >
            <span className={styles.categoryIcon}>{cat.icon}</span>
            <span className={styles.categoryName}>{cat.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.achievementsGrid}>
        {filteredDefinitions.map((def) => {
          const isUnlocked = unlockedMap.has(def.id);
          const categoryInfo = getAchievementCategoryInfo(def.category);
          const unlockedAchievement = unlockedMap.get(def.id);

          return (
            <div
              key={def.id}
              data-achievement-id={def.id}
              className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : styles.locked}`}
              style={{ borderColor: categoryInfo.color }}
              onMouseEnter={() => setHoveredAchievement(def.id)}
              onMouseLeave={() => setHoveredAchievement(null)}
              onClick={() => handleAchievementClick(def.id, isUnlocked)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.categoryBadge} style={{ backgroundColor: categoryInfo.color }}>
                  {categoryInfo.icon}
                </span>
                <span className={styles.pointsBadge}>{def.points}分</span>
              </div>

              <div className={styles.iconWrapper}>
                <span className={styles.icon}>{isUnlocked ? def.icon : '❓'}</span>
                {!isUnlocked && <div className={styles.lockOverlay}>🔒</div>}
              </div>

              <h3 className={styles.achievementName}>
                {isUnlocked ? def.name : '???'}
              </h3>

              <p className={styles.achievementDescription}>
                {isUnlocked || !def.hidden ? def.description : '完成特定条件解锁'}
              </p>

              {isUnlocked && unlockedAchievement?.unlockedAt && (
                <p className={styles.unlockedAt}>
                  ✨ {new Date(unlockedAchievement.unlockedAt).toLocaleDateString()}
                </p>
              )}

              {hoveredAchievement === def.id && !isUnlocked && (
                <div className={styles.hintTooltip}>
                  继续努力，即将解锁！
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredDefinitions.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎯</span>
          <p>暂无成就</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(AchievementWall);
