import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAIStore } from '@/store/aiStore';
import { useGameStore } from '@/store';
import AISettingsPanel from '@/components/AISettingsPanel';
import styles from './index.module.scss';

const navItems = [
  { path: '/', label: '🏠 首页' },
  { path: '/levels', label: '📋 关卡选择' },
  { path: '/editor', label: '🎨 关卡编辑器' },
  { path: '/achievements', label: '🏆 成就墙' },
  { path: '/concepts', label: '📚 编程概念' },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSettings, setShowSettings } = useAIStore();
  const { setCurrentMap, setRobot, setCommands } = useGameStore();

  const handleUseLevelResult = (result: any) => {
    if (result && result.map) {
      setCurrentMap({
        width: result.map.width,
        height: result.map.height,
        cells: result.map.cells.map((cell: any) => ({
          x: cell.x,
          y: cell.y,
          type: cell.type,
          dir: cell.dir
        })),
        stars: result.map.stars.map((star: any) => ({
          x: star.x,
          y: star.y,
          type: 'star'
        }))
      });
      
      const robotCell = result.map.cells.find((cell: any) => cell.type === "robot");
      if (robotCell) {
        setRobot({ x: robotCell.x, y: robotCell.y, dir: robotCell.dir || "right" });
      }
      
      message.success('关卡已加载！');
      
      // 如果当前不在游戏页面，跳转到游戏页面
      if (!location.pathname.includes('/game')) {
        navigate('/game');
      }
    }
  };

  const handleUseSolverResult = (result: any) => {
    if (result && result.commands) {
      const newCommands = result.commands.map((cmd: any) => ({
        ...cmd,
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setCommands(newCommands);
      message.success('解题方案已加载！');
      
      // 如果当前不在游戏页面，跳转到游戏页面
      if (!location.pathname.includes('/game')) {
        navigate('/game');
      }
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>指令大冒险</h1>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navLink} ${location.pathname === item.path ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <button
            className={styles.aiSettingsButton}
            onClick={() => setShowSettings(true)}
          >
            🤖 AI设置
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>© 2026 指令大冒险 - 编程启蒙游戏</p>
      </footer>

      <AISettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onUseLevelResult={handleUseLevelResult}
        onUseSolverResult={handleUseSolverResult}
      />
    </div>
  );
};

export default Layout;
