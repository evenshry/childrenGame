import React, { useState, useEffect } from 'react';
import AchievementWall from '@/components/AchievementWall';
import { achievementStorage, statsStorage } from '@/utils/storage';
import { achievementDefinitions } from '@/utils/achievements';
import { Achievement } from '@/types/global';
import './index.scss';

const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const unlockedAchievements = achievementStorage.getAll();
    const unlockedMap = new Map(unlockedAchievements.map(a => [a.id, a]));

    const achievementList = achievementDefinitions.map(def => {
      const unlockedData = unlockedMap.get(def.id);
      return {
        id: def.id,
        type: def.id as any,
        name: def.name,
        description: def.description,
        icon: def.icon,
        unlocked: !!unlockedData,
        unlockedAt: unlockedData?.unlockedAt,
        points: def.points,
      } as Achievement;
    });

    setAchievements(achievementList);
  }, []);

  return (
    <div className="achievements-page">
      <AchievementWall achievements={achievements} />
    </div>
  );
};

export default Achievements;
