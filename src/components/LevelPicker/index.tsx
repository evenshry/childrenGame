import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Level } from '@/types/global';
import { playClickSound } from '@/utils/animations';
import { customLevelStorage } from '@/utils/storage';
import styles from './index.module.scss';

interface LevelPickerProps {
  levels: Level[];
  currentLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onCreateNewLevel?: () => void;
}

const LevelPicker: React.FC<LevelPickerProps> = ({
  levels,
  currentLevelId,
  onSelectLevel,
  onCreateNewLevel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [customLevels, setCustomLevels] = useState<Level[]>([]);

  const currentLevel = levels.find(l => l.id === currentLevelId) || 
    customLevels.find(l => l.id === currentLevelId);
  
  const allLevels = [...levels, ...customLevels];

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

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 8;

      const dropdownWidth = 280;
      const maxItems = Math.min(allLevels.length + 2, 10);
      const dropdownHeight = maxItems * 68 + 16;

      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16;
      }
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 8;
      }

      setDropdownPosition({ top, left });
    }
  }, [allLevels.length]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      loadCustomLevels();
    }
  }, [isOpen, updatePosition, loadCustomLevels]);

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

    const handleScroll = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updatePosition]);

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

  const getLevelIcon = (level: Level) => {
    if (level.id.startsWith('custom_')) {
      return '🎨';
    }
    const levelIndex = levels.findIndex(l => l.id === level.id);
    if (levelIndex === 0) return '🏁';
    if (levelIndex === levels.length - 1) return '👑';
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
        <DropdownContent
          position={dropdownPosition}
          levels={allLevels}
          currentLevelId={currentLevelId}
          onSelectLevel={handleSelectLevel}
          onCreateNewLevel={handleCreateNewLevel}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
};

const DropdownContent: React.FC<{
  position: { top: number; left: number };
  levels: Level[];
  currentLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onCreateNewLevel: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}> = ({ position, levels, currentLevelId, onSelectLevel, onCreateNewLevel, dropdownRef }) => {
  return createPortal(
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {levels.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <span className={styles.emptyText}>暂无关卡</span>
        </div>
      )}
      
      {levels.map((level, index) => (
        <button
          key={level.id}
          className={`${styles.option} ${currentLevelId === level.id ? styles.selected : ''}`}
          onClick={() => onSelectLevel(level.id)}
        >
          <span className={styles.optionIcon}>
            {level.id.startsWith('custom_') ? '🎨' : index === 0 ? '🏁' : index === levels.length - 1 ? '👑' : '📋'}
          </span>
          <div className={styles.optionInfo}>
            <span className={styles.optionLabel}>{level.name}</span>
            <span className={styles.optionMeta}>
              {level.id.startsWith('custom_') ? '自定义关卡' : `内置关卡 · ${level.map.width}×${level.map.height}`}
            </span>
          </div>
          {level.minCommands && (
            <span className={styles.minCommands}>
              ⭐ {level.minCommands}
            </span>
          )}
        </button>
      ))}
      
      <div className={styles.dropdownDivider} />
      
      <button
        className={styles.createButton}
        onClick={onCreateNewLevel}
      >
        <span className={styles.createIcon}>➕</span>
        <span className={styles.createLabel}>创建新关卡</span>
      </button>
    </div>,
    document.body
  );
};

export default LevelPicker;
