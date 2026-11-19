import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LevelSelector from '@/components/LevelSelector';
import { progressStorage } from '@/utils/storage';
import { levels as officialLevels, getAllLevels } from '@/utils/constants';
import './index.scss';

const Levels: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [allLevels, setAllLevels] = useState(() => getAllLevels());
  const [currentLevelId, setCurrentLevelId] = useState<string>(
    officialLevels[0]?.id || '',
  );
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [levelRatings, setLevelRatings] = useState(() => progressStorage.getLevelRatings());

  useEffect(() => {
    const levelsNow = getAllLevels();
    setAllLevels(levelsNow);
    setCompletedLevelIds(progressStorage.getCompletedLevelIds());
    setLevelRatings(progressStorage.getLevelRatings());

    const levelIdParam = searchParams.get('level');
    const matched = levelIdParam
      ? levelsNow.find(
          (level) =>
            level.id === levelIdParam ||
            level.id === `level_0${levelIdParam}` ||
            level.id === `level_${levelIdParam.padStart(2, '0')}`,
        )
      : undefined;

    if (matched) {
      setCurrentLevelId(matched.id);
      return;
    }

    const currentIndex = progressStorage.getCurrentLevelIndex();
    const safeIndex = Math.min(Math.max(currentIndex, 0), levelsNow.length - 1);
    setCurrentLevelId(levelsNow[safeIndex]?.id || levelsNow[0]?.id || '');
  }, [searchParams]);

  const handleSelectLevel = (levelId: string) => {
    setCurrentLevelId(levelId);
    navigate(`/game?level=${levelId}`);
  };

  return (
    <div className="levels-page">
      <LevelSelector
        levels={allLevels}
        currentLevelId={currentLevelId}
        completedLevels={completedLevelIds}
        levelRatings={levelRatings}
        onSelectLevel={handleSelectLevel}
      />
    </div>
  );
};

export default Levels;