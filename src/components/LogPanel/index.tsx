import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'debug';
  timestamp: number;
}

export interface LogPanelProps {
  logs: string[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'error'>('all');
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    const newLogs: LogEntry[] = logs.map((log, index) => {
      let type: LogEntry['type'] = 'info';
      let message = log;
      
      if (log.includes('成功') || log.includes('过关') || log.includes('完成')) {
        type = 'success';
      } else if (log.includes('失败') || log.includes('错误') || log.includes('撞墙')) {
        type = 'error';
      } else if (log.includes('警告') || log.includes('注意')) {
        type = 'warning';
      } else if (log.includes('断点')) {
        type = 'debug';
      }
      
      return {
        id: `log_${Date.now()}_${index}`,
        message: log,
        type,
        timestamp: Date.now(),
      };
    });
    
    setVisibleLogs(newLogs);
  }, [logs]);

  useEffect(() => {
    if (logContainerRef.current && isAutoScroll) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogs, isAutoScroll]);

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAutoScroll(isAtBottom);
    }
  };

  const getFilteredLogs = () => {
    if (filter === 'all') return visibleLogs;
    return visibleLogs.filter(log => log.type === filter);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'debug':
        return '🔴';
      default:
        return '📝';
    }
  };

  const clearLogs = () => {
    setVisibleLogs([]);
  };

  return (
    <div className={styles.executionLog}>
      <div className={styles.logHeader}>
        <h4>📋 执行日志</h4>
        <div className={styles.logControls}>
          <select 
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">全部</option>
            <option value="success">成功</option>
            <option value="error">错误</option>
            <option value="info">信息</option>
          </select>
          <button className={styles.clearButton} onClick={clearLogs} title="清空日志">
            🗑️
          </button>
        </div>
      </div>
      
      <div className={styles.logContainer} ref={logContainerRef} onScroll={handleScroll}>
        {getFilteredLogs().map((log, index) => (
          <div 
            key={log.id} 
            className={`${styles.logEntry} ${styles[log.type]}`}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span className={styles.logIcon}>{getLogIcon(log.type)}</span>
            <span className={styles.logMessage}>{log.message}</span>
          </div>
        ))}
        {getFilteredLogs().length === 0 && (
          <div className={`${styles.logEntry} ${styles.empty}`}>
            ✨ 暂无执行日志
          </div>
        )}
      </div>
      
      <div className={styles.logFooter}>
        <span className={styles.logCount}>
          共 {getFilteredLogs().length} 条日志
        </span>
        {!isAutoScroll && (
          <button 
            className={styles.scrollToBottom}
            onClick={() => {
              setIsAutoScroll(true);
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
              }
            }}
          >
            ⬇️ 滚动到底部
          </button>
        )}
      </div>
    </div>
  );
};

export default LogPanel;
