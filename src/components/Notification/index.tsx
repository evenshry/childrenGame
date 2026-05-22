import React, { useEffect } from 'react';
import { playSuccessSound, playErrorSound, celebrateWin } from '@/utils/animations';
import styles from './index.module.scss';

export interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    if (type === 'success') {
      playSuccessSound();
      setTimeout(() => {
        const notification = document.querySelector(`.${styles.notification}`) as HTMLElement | null;
        if (notification) {
          celebrateWin(notification);
        }
      }, 100);
    } else if (type === 'error') {
      playErrorSound();
    }
  }, [type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '🎉';
      case 'error':
        return '😢';
      case 'info':
        return '💡';
      case 'warning':
        return '⚠️';
      default:
        return '💡';
    }
  };

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.message}>{message}</span>
    </div>
  );
};

export default Notification;
