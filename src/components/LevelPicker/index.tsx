import React, { useRef, useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Level } from '@/types/global';
import { playClickSound } from '@/utils/animations';
import { customLevelStorage } from '@/utils/storage';
import styles from './index.module.scss';

interface LevelPickerProps {
  levels: Level[];
  currentLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onCreateNewLevel?: () => void;
  onDeleteLevel?: (levelId: string) => void;
}

const LevelPicker: React.FC<LevelPickerProps> = ({
  levels,
  currentLevelId,
  onSelectLevel,
  onCreateNewLevel,
  onDeleteLevel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [customLevels, setCustomLevels] = useState<Level[]>([]);

  const allLevels = React.useMemo(() => {
    const existingIds = new Set(levels.map(l => l.id));
    const uniqueCustomLevels = customLevels.filter(c => !existingIds.has(c.id));
    return [...levels, ...uniqueCustomLevels];
  }, [levels, customLevels]);
  
  const currentLevel = levels.find(l => l.id === currentLevelId) || 
    customLevels.find(l => l.id === currentLevelId);

  const loadCustomLevels = useCallback(() => {
    const custom = customLevelStorage.getAll();
    setCustomLevels(custom);
  }, []);

  useEffect(() => {
    loadCustomLevels();
  }, [loadCustomLevels]);

  useEffect(() => {
    if (currentLevelId && currentLevelId.startsWith('custom_')) {
      loadCustomLevels();
    }
  }, [currentLevelId, loadCustomLevels]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const button = buttonRef.current;
      const dropdown = dropdownRef.current;

      if (button && !button.contains(event.target as Node)) {
        if (dropdown && dropdown.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLevel = (levelId: string) => {
    playClickSound();
    onSelectLevel(levelId);
    setIsOpen(false);
  };

  const handleCreateNewLevel = () => {
    playClickSound();
    setIsOpen(false);
    if (onCreateNewLevel) {
      onCreateNewLevel();
    }
  };

  const handleDeleteLevel = (levelId: string, levelName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    
    if (window.confirm(`确定要删除关卡"${levelName}"吗？此操作不可恢复。`)) {
      customLevelStorage.delete(levelId);
      loadCustomLevels();
      
      if (currentLevelId === levelId && levels.length > 0) {
        onSelectLevel(levels[0].id);
      }
      
      if (onDeleteLevel) {
        onDeleteLevel(levelId);
      }
      
      message.success('关卡已删除');
    }
  };

  const getLevelIcon = (level: Level) => {
    if (level.id.startsWith('custom_')) {
      return '🎨';
    }
    const builtinLevelsCount = levels.length;
    const levelIndexInAll = allLevels.findIndex(l => l.id === level.id);
    if (levelIndexInAll === 0) return '🏁';
    if (levelIndexInAll === builtinLevelsCount - 1) return '👑';
    return '📋';
  };

  return (
    <div className={styles.levelPicker}>
      <button
        ref={buttonRef}
        className={styles.selectButton}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <span className={styles.levelIcon}>
          {currentLevel ? getLevelIcon(currentLevel) : '📋'}
        </span>
        <span className={styles.levelLabel}>
          {currentLevel ? currentLevel.name : '选择关卡'}
        </span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={styles.dropdown}
        >
          {allLevels.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <span className={styles.emptyText}>暂无关卡</span>
            </div>
          )}
          
          {allLevels.map((level, index) => {
            const isFirstBuiltin = levels.length > 0 && level.id === levels[0].id;
            const isLastBuiltin = levels.length > 0 && level.id === levels[levels.length - 1].id;
            const isCustom = level.id.startsWith('custom_');
            return (
              <div
                key={level.id}
                className={`${styles.option} ${currentLevelId === level.id ? styles.selected : ''}`}
                onClick={() => handleSelectLevel(level.id)}
              >
                <span className={styles.optionIcon}>
                  {isCustom ? '🎨' : isFirstBuiltin ? '🏁' : isLastBuiltin ? '👑' : '📋'}
                </span>
                <div className={styles.optionInfo}>
                  <span className={styles.optionLabel}>{level.name}</span>
                  <span className={styles.optionMeta}>
                    {isCustom ? '自定义关卡' : `内置关卡 · ${level.map.width}×${level.map.height}`}
                  </span>
                </div>
                {level.minCommands && (
                  <span className={styles.minCommands}>
                    ⭐ {level.minCommands}
                  </span>
                )}
                {isCustom && onDeleteLevel && (
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => handleDeleteLevel(level.id, level.name, e)}
                    title="删除关卡"
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
          
          <div className={styles.dropdownDivider} />
          
          <button
            className={styles.createButton}
            onClick={handleCreateNewLevel}
          >
            <span className={styles.createIcon}>➕</span>
            <span className={styles.createLabel}>创建新关卡</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LevelPicker;
