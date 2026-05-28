import React from 'react';
import { playClickSound } from '@/utils/animations';
import styles from './index.module.scss';

export interface HeaderProps {
  currentLevel: number;
  totalLevels: number;
  isDebugMode: boolean;
  onRunProgram: () => void;
  onToggleDebug: () => void;
  onClearProgram: () => void;
  onOpenAISettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentLevel,
  totalLevels,
  isDebugMode,
  onRunProgram,
  onToggleDebug,
  onClearProgram,
  onOpenAISettings,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.logo}>🏠</span>
        <span className={styles.levelInfo}>
          🌟 关卡 {currentLevel + 1}/{totalLevels}
        </span>
        <span className={styles.stars}>⭐ ⭐ ⭐</span>
      </div>
      <div className={styles.headerButtons}>
        <button
          className={`${styles.headerButton} ${styles.runButton}`}
          onClick={() => {
            playClickSound();
            onRunProgram();
          }}
        >
          ▶️ 运行
        </button>
        <button
          className={styles.headerButton}
          onClick={() => {
            playClickSound();
            onClearProgram();
          }}
        >
          🗑️ 清空
        </button>
        <button
          className={`${styles.headerButton} ${isDebugMode ? styles.active : ''}`}
          onClick={() => {
            playClickSound();
            onToggleDebug();
          }}
        >
          🔧 调试模式
        </button>
        {onOpenAISettings && (
          <button
            className={styles.headerButton}
            onClick={() => {
              playClickSound();
              onOpenAISettings();
            }}
          >
            🤖 AI设置
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
