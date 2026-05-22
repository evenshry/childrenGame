import React, { useState, useEffect } from 'react';
import { playClickSound } from '@/utils/animations';
import styles from './index.module.scss';

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface GuideProps {
  steps: GuideStep[];
  onComplete: () => void;
  onSkip?: () => void;
  isFirstTime?: boolean;
}

const Guide: React.FC<GuideProps> = ({
  steps,
  onComplete,
  onSkip,
  isFirstTime = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (isFirstTime && currentStep === 0) {
      setTimeout(() => {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }, 500);
    }
  }, [isFirstTime]);

  const handleNext = () => {
    playClickSound();
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 300);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    playClickSound();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    playClickSound();
    setIsVisible(false);
    setTimeout(() => {
      if (onSkip) {
        onSkip();
      } else {
        onComplete();
      }
    }, 300);
  };

  const handleDotClick = (index: number) => {
    playClickSound();
    setCurrentStep(index);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.guideOverlay}>
      {showCelebration && (
        <div className={styles.celebration}>
          🎉🎊🎉🎊🎉
        </div>
      )}
      
      <div className={styles.guideContainer}>
        <div className={styles.guideHeader}>
          <div className={styles.stepIndicator}>
            步骤 {currentStep + 1} / {steps.length}
          </div>
          {!isLastStep && (
            <button className={styles.skipButton} onClick={handleSkip}>
              跳过教程
            </button>
          )}
        </div>

        <div className={styles.guideContent}>
          <div className={styles.stepIcon}>
            {step.id === 'welcome' && '👋'}
            {step.id === 'commands' && '🧩'}
            {step.id === 'drag' && '✋'}
            {step.id === 'run' && '▶️'}
            {step.id === 'debug' && '🔧'}
            {step.id === 'complete' && '🎓'}
            {!['welcome', 'commands', 'drag', 'run', 'debug', 'complete'].includes(step.id) && '💡'}
          </div>
          
          <h2 className={styles.stepTitle}>{step.title}</h2>
          <p className={styles.stepDescription}>{step.description}</p>

          {step.image && (
            <div className={styles.stepImage}>
              <img src={step.image} alt={step.title} />
            </div>
          )}
        </div>

        <div className={styles.guideFooter}>
          <div className={styles.progressDots}>
            {steps.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
                onClick={() => handleDotClick(index)}
              >
                {index < currentStep ? '✓' : ''}
              </button>
            ))}
          </div>

          <div className={styles.navigationButtons}>
            {currentStep > 0 && (
              <button className={styles.previousButton} onClick={handlePrevious}>
                ⬅️ 上一步
              </button>
            )}
            
            <button 
              className={`${styles.nextButton} ${isLastStep ? styles.finishButton : ''}`} 
              onClick={handleNext}
            >
              {isLastStep ? '🎉 开始游戏！' : '下一步 ➡️'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;

export const defaultGuideSteps: GuideStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到「指令大冒险」！🌟',
    description: '这是一款专为小朋友设计的编程启蒙游戏。在这里，你将学习如何通过指令来控制机器人！',
  },
  {
    id: 'commands',
    title: '认识指令块 🧩',
    description: '左边有很多指令块，它们就像是机器人的动作命令。每个指令块都有不同的功能：前进、左转、右转等。',
  },
  {
    id: 'drag',
    title: '拖拽指令 ✋',
    description: '把左边的指令块拖到右边的程序区域，就像拼积木一样！可以一个接一个地组合它们。',
  },
  {
    id: 'run',
    title: '运行程序 ▶️',
    description: '点击顶部的"运行"按钮，你的机器人就会按照你的指令开始行动啦！看看它能不能顺利到达终点呢？',
  },
  {
    id: 'debug',
    title: '调试模式 🔧',
    description: '如果遇到困难，可以开启"调试模式"。你可以一步一步地执行程序，看看机器人每一步都在做什么。',
  },
  {
    id: 'complete',
    title: '完成挑战 🎓',
    description: '收集所有星星，把机器人送到终点，你就完成这一关啦！继续挑战更多关卡，学习更多编程知识吧！',
  },
];
