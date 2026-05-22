import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LevelSelector from '@/components/LevelSelector';
import { progressStorage } from '@/utils/storage';
import { levels as officialLevels, getAllLevels } from '@/utils/constants';
import './index.scss';

const Levels: React.FC = () => {
  const navigate = useNavigate();
  const [allLevels, setAllLevels] = useState(getAllLevels());
  const [currentLevelId, setCurrentLevelId] = useState<string>(officialLevels[0]?.id || '');
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);

  useEffect(() => {
    setCompletedLevelIds(progressStorage.getCompletedLevelIds());
    setAllLevels(getAllLevels());
  }, []);

  useEffect(() => {
    const updateLevelFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const levelIdParam = urlParams.get('level');
      if (levelIdParam) {
        const allLevelsNow = getAllLevels();
        const matchedLevel = allLevelsNow.find(l =>
          l.id === levelIdParam ||
          l.id === `level_0${levelIdParam}` ||
          l.id === `level_${levelIdParam.padStart(2, '0')}`
        );
        if (matchedLevel) {
          setCurrentLevelId(matchedLevel.id);
        }
      } else {
        const currentIndex = progressStorage.getCurrentLevelIndex();
        const safeIndex = Math.min(currentIndex, allLevels.length - 1);
        setCurrentLevelId(allLevels[safeIndex]?.id || allLevels[0]?.id || '');
      }
    };

    updateLevelFromUrl();

    const interval = setInterval(() => {
      setAllLevels(getAllLevels());
      setCompletedLevelIds(progressStorage.getCompletedLevelIds());
      updateLevelFromUrl();
    }, 1000);

    return () => clearInterval(interval);
  }, [allLevels.length]);

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
        levelRatings={progressStorage.getLevelRatings()}
        onSelectLevel={handleSelectLevel}
      />
    </div>
  );
};

export default Levels;
