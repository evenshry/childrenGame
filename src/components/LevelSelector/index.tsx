import React from "react";
import styles from "./index.module.scss";
import { Level, LevelRating } from "@/types/global";

interface LevelSelectorProps {
  levels: Level[];
  currentLevelId: string;
  completedLevels: string[];
  levelRatings: LevelRating[];
  onSelectLevel: (levelId: string) => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ levels, currentLevelId, completedLevels, levelRatings, onSelectLevel }) => {
  const isLevelUnlocked = (levelIndex: number): boolean => {
    if (levelIndex === 0) {
      return true;
    }
    const prevLevel = levels[levelIndex - 1];
    return completedLevels.includes(prevLevel.id);
  };

  return (
    <div className={styles.levelSelector}>
      <h2 className={styles.title}>关卡选择</h2>
      <div className={styles.levelsGrid}>
        {levels.map((level, index) => {
          const isCompleted = completedLevels.includes(level.id);
          const rating = levelRatings.find((r) => r.levelId === level.id);
          const stars = rating ? rating.stars : 0;
          const isLocked = !isLevelUnlocked(index);

          return (
            <div
              key={level.id}
              className={`${styles.levelCard} ${isCompleted ? styles.completed : ""} ${currentLevelId === level.id ? styles.current : ""} ${isLocked ? styles.locked : ""}`}
              onClick={() => !isLocked && onSelectLevel(level.id)}
            >
              <div className={styles.levelNumber}>第 {index + 1} 关</div>
              <div className={styles.levelName}>{level.name}</div>
              <div className={styles.levelStars}>
                {[1, 2, 3].map((star) => (
                  <span key={star} className={`${styles.star} ${star <= stars ? styles.active : ""}`}>
                    ★
                  </span>
                ))}
              </div>
              {isLocked && (
                <div className={styles.lockOverlay}>
                  <div className={styles.lockIcon}>🔒</div>
                  <div className={styles.lockHint}>完成上一关解锁</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(LevelSelector);
