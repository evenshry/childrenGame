import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
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
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>© 2026 指令大冒险 - 编程启蒙游戏</p>
      </footer>
    </div>
  );
};

export default Layout;
