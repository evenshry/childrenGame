import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAIStore } from '@/store/aiStore';
import { useGameStore } from '@/store';
import AISettingsPanel from '@/components/AISettingsPanel';
import type { LevelGenResult, SolverCommand, SolverResult } from '@/api/qianwen/types';
import type { CellType, Command, CommandType, Direction, Level } from '@/types/global';
import { generateId } from '@/utils/id';
import { customLevelStorage } from '@/utils/storage';
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
  const { commitCommands, resetPreview, loadLevel } = useGameStore();

  const handleUseLevelResult = (result: LevelGenResult) => {
    if (!result?.map) return;

    const newLevel: Level = {
      id: generateId('ai'),
      name: `AI关卡 ${new Date().toLocaleString()}`,
      map: {
        width: result.map.width,
        height: result.map.height,
        cells: result.map.cells.map((cell) => ({
          x: cell.x,
          y: cell.y,
          type: cell.type as CellType,
          dir: cell.dir as Direction | undefined,
        })),
        stars: result.map.stars.map((star) => ({
          x: star.x,
          y: star.y,
          type: 'star' as CellType,
        })),
      },
      minCommands: result.minCommands,
      hint: result.hint || 'AI生成的关卡',
    };

    customLevelStorage.save(newLevel);
    message.success('关卡已加载！');

    if (location.pathname.includes('/game')) {
      loadLevel(newLevel);
    } else {
      navigate(`/game?level=${newLevel.id}`);
    }
  };

  const toCommand = (command: SolverCommand): Command => ({
    id: generateId(),
    type: command.type as CommandType,
    params: command.params as unknown as Command['params'],
    children: command.children?.map(toCommand),
    elseChildren: command.elseChildren?.map(toCommand),
  });

  const handleUseSolverResult = (result: SolverResult) => {
    if (!result?.commands) return;

    commitCommands(result.commands.map(toCommand));
    resetPreview();
    message.success('解题方案已加载！');

    if (!location.pathname.includes('/game')) {
      navigate('/game');
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
