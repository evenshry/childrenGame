import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ConditionType } from '@/types/global';
import styles from './index.module.scss';

interface ConditionSelectorProps {
  condition: ConditionType;
  onChange: (condition: ConditionType) => void;
}

const conditionOptions: { value: ConditionType; label: string; icon: string; description: string }[] = [
  { value: 'frontBlocked', label: '前方有障碍', icon: '🧱', description: '检测机器人正前方是否有墙壁' },
  { value: 'edgeInFront', label: '前方撞墙', icon: '🪨', description: '检测机器人前方是否碰到地图边缘' },
  { value: 'leftBlocked', label: '左边有障碍', icon: '⬅️', description: '检测机器人左边是否有墙壁' },
  { value: 'rightBlocked', label: '右边有障碍', icon: '➡️', description: '检测机器人右边是否有墙壁' },
  { value: 'hasStar', label: '已收集星星', icon: '⭐', description: '检测是否已经收集了星星' },
  { value: 'nearGoal', label: '靠近终点', icon: '🚩', description: '检测是否靠近终点位置' },
];

const DropdownContent: React.FC<{
  position: { top: number; left: number };
  condition: ConditionType;
  options: typeof conditionOptions;
  onChange: (condition: ConditionType) => void;
  onClose: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}> = ({ position, condition, options, onChange, onClose, dropdownRef }) => {
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
      {options.map((option) => (
        <button
          key={option.value}
          className={`${styles.option} ${condition === option.value ? styles.selected : ''}`}
          onClick={() => {
            onChange(option.value);
            onClose();
          }}
        >
          <span className={styles.optionIcon}>{option.icon}</span>
          <div className={styles.optionInfo}>
            <span className={styles.optionLabel}>{option.label}</span>
            <span className={styles.optionDescription}>{option.description}</span>
          </div>
        </button>
      ))}
    </div>,
    document.body
  );
};

const ConditionSelector: React.FC<ConditionSelectorProps> = ({ condition, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCondition = conditionOptions.find((opt) => opt.value === condition);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 8;

      const dropdownWidth = 240;
      const dropdownHeight = Math.min(conditionOptions.length * 52, 320);

      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 16;
      }
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 8;
      }

      setDropdownPosition({ top, left });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

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

  return (
    <div className={styles.conditionSelector}>
      <button
        ref={buttonRef}
        className={styles.selectButton}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <span className={styles.conditionIcon}>{selectedCondition?.icon}</span>
        <span className={styles.conditionLabel}>{selectedCondition?.label}</span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <DropdownContent
          position={dropdownPosition}
          condition={condition}
          options={conditionOptions}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
};

export default ConditionSelector;
