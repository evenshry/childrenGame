import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playClickSound, playCollectSound } from '@/utils/animations';
import styles from './index.module.scss';

export interface Hint {
  id: string;
  text: string;
  type?: 'basic' | 'detailed' | 'advanced';
}

export interface HintSystemProps {
  hints: Hint[];
  levelHint?: string;
  onUseHint?: (hintIndex: number) => void;
  maxHints?: number;
}

const HintPanel: React.FC<{
  hints: Hint[];
  levelHint?: string;
  currentHintIndex: number;
  hintsUsed: number;
  maxHints: number;
  onShowHint: () => void;
  onClose: () => void;
  position: { top: number; left: number };
}> = ({
  hints,
  levelHint,
  currentHintIndex,
  hintsUsed,
  maxHints,
  onShowHint,
  onClose,
  position,
}) => {
  const canShowMoreHints = currentHintIndex < hints.length - 1 && hintsUsed < maxHints;

  return createPortal(
    <div
      className={styles.hintPanel}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className={styles.hintHeader}>
        <h4>💡 提示</h4>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      {levelHint && (
        <div className={styles.levelHint}>
          <strong>关卡提示：</strong>
          <p>{levelHint}</p>
        </div>
      )}

      {hints.length > 0 && currentHintIndex >= 0 && (
        <div className={styles.hintsList}>
          {hints.slice(0, currentHintIndex + 1).map((hint, index) => (
            <div
              key={hint.id}
              className={`${styles.hintItem} ${styles[hint.type || 'basic']}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={styles.hintNumber}>
                {index + 1}
              </div>
              <div className={styles.hintContent}>
                <p>{hint.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {canShowMoreHints && (
        <button className={styles.moreHintButton} onClick={onShowHint}>
          🔍 查看下一个提示
        </button>
      )}

      {currentHintIndex >= hints.length - 1 && (
        <div className={styles.allHintsUsed}>
          <p>你已经看过所有提示了！🎯</p>
          <p className={styles.encouragement}>相信自己，你一定能行的！💪</p>
        </div>
      )}
    </div>,
    document.body
  );
};

const HintSystem: React.FC<HintSystemProps> = ({
  hints,
  levelHint,
  onUseHint,
  maxHints = 3,
}) => {
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [showHints, setShowHints] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePanelPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 8;

      const panelWidth = 320;
      const panelHeight = Math.min(hints.length * 60 + 100, 400);

      if (left + panelWidth > window.innerWidth) {
        left = window.innerWidth - panelWidth - 16;
      }
      if (top + panelHeight > window.innerHeight) {
        top = rect.top - panelHeight - 8;
      }

      setPanelPosition({ top, left });
    }
  };

  useEffect(() => {
    if (showHints) {
      updatePanelPosition();
    }
  }, [showHints]);

  useEffect(() => {
    if (!showHints) return;

    const handleClickOutside = (event: MouseEvent) => {
      const button = buttonRef.current;
      const panel = document.querySelector(`.${styles.hintPanel}`);

      if (button && !button.contains(event.target as Node)) {
        if (panel && panel.contains(event.target as Node)) {
          return;
        }
        setShowHints(false);
      }
    };

    const handleResize = () => {
      updatePanelPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [showHints]);

  const handleShowHint = () => {
    playClickSound();
    if (currentHintIndex < hints.length - 1 && hintsUsed < maxHints) {
      const nextIndex = currentHintIndex + 1;
      setCurrentHintIndex(nextIndex);
      setHintsUsed(hintsUsed + 1);
      if (onUseHint) {
        onUseHint(nextIndex);
      }
    }
    updatePanelPosition();
    setShowHints(true);
  };

  const handleClose = () => {
    playClickSound();
    setShowHints(false);
  };

  const canShowMoreHints = currentHintIndex < hints.length - 1 && hintsUsed < maxHints;
  const remainingHints = maxHints - hintsUsed;

  return (
    <div className={styles.hintSystem}>
      <button
        ref={buttonRef}
        className={styles.hintButton}
        onClick={handleShowHint}
        disabled={!canShowMoreHints && !showHints}
      >
        💡
        {showHints ? '查看提示' : '获取提示'}
        <span className={styles.hintCount}>
          {remainingHints > 0 ? `(${remainingHints})` : '(已用完)'}
        </span>
      </button>

      {showHints && (
        <HintPanel
          hints={hints}
          levelHint={levelHint}
          currentHintIndex={currentHintIndex}
          hintsUsed={hintsUsed}
          maxHints={maxHints}
          onShowHint={handleShowHint}
          onClose={handleClose}
          position={panelPosition}
        />
      )}
    </div>
  );
};

export default HintSystem;

export const generateHints = (levelId: string, levelType: string): Hint[] => {
  const baseHints: Record<string, Hint[]> = {
    'basic': [
      { id: 'hint1', text: '试试用"前进"指令让机器人移动', type: 'basic' },
      { id: 'hint2', text: '注意机器人的朝向，它面向哪个方向？', type: 'basic' },
      { id: 'hint3', text: '可能需要多次"前进"才能到达终点', type: 'detailed' },
    ],
    'loop': [
      { id: 'hint1', text: '这一关有很多重复的动作', type: 'basic' },
      { id: 'hint2', text: '使用"循环"指令可以重复执行一组命令', type: 'basic' },
      { id: 'hint3', text: '把前进和转向放进循环里试试', type: 'detailed' },
    ],
    'collect': [
      { id: 'hint1', text: '这一关需要收集星星', type: 'basic' },
      { id: 'hint2', text: '规划一条路线，确保能经过所有星星', type: 'basic' },
      { id: 'hint3', text: '使用"循环"可以让路线更简洁', type: 'advanced' },
    ],
  };

  return baseHints[levelType] || baseHints['basic'];
};
