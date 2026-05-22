import React, { useState, useEffect, useCallback } from "react";
import LevelEditor from "@/components/LevelEditor";
import { getAllLevels } from "@/utils/constants";
import { MapData, Level } from "@/types/global";
import styles from "./index.module.scss";

const LevelEditorPage: React.FC = () => {
  const [map, setMap] = useState<MapData>(() => getAllLevels()[0]?.map || {
    width: 6,
    height: 6,
    cells: [{ x: 0, y: 0, type: "robot" as const, dir: "right" as const }],
    stars: [],
  });

  const [levels, setLevels] = useState<Level[]>(() => getAllLevels());

  const handleMapChange = (newMap: MapData) => {
    setMap(newMap);
  };

  const handleCreateNewLevel = useCallback(() => {
    setLevels(getAllLevels());
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setLevels(getAllLevels());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className={styles.levelEditorPage}>
      <div className={styles.content}>
        <LevelEditor 
          map={map} 
          onMapChange={handleMapChange} 
          levels={levels}
          onCreateNewLevel={handleCreateNewLevel}
        />
      </div>
    </div>
  );
};

export default LevelEditorPage;
