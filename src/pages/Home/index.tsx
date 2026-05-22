import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Guide, { defaultGuideSteps } from '@/components/Guide';
import { settingsStorage } from '@/utils/storage';
import './index.scss';

const Home: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const settings = settingsStorage.get();
    if (!settings.showHints) {
      return;
    }
    
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  const handleGuideComplete = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    setShowGuide(false);
  };

  const handleGuideSkip = () => {
    localStorage.setItem('hasSeenGuide', 'true');
    setShowGuide(false);
  };

  return (
    <div className="home-page">
      <h2>欢迎来到指令大冒险！</h2>
      <p>这是一款面向5~9岁儿童的游戏化编程启蒙工具</p>
      <div className="home-buttons">
        <Link to="/levels" className="btn">开始游戏</Link>
        <Link to="/concepts" className="btn">学习编程</Link>
        <Link to="/achievements" className="btn">查看成就</Link>
      </div>

      {showGuide && (
        <Guide
          steps={defaultGuideSteps}
          onComplete={handleGuideComplete}
          onSkip={handleGuideSkip}
          isFirstTime={true}
        />
      )}
    </div>
  );
};

export default Home;