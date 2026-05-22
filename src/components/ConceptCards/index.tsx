import React, { useState } from 'react';
import { playClickSound } from '@/utils/animations';
import styles from './index.module.scss';

export interface ConceptCard {
  id: string;
  title: string;
  icon: string;
  description: string;
  example: string;
  tips: string[];
  relatedLevel?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ConceptCardsProps {
  cards: ConceptCard[];
  onCardClick?: (card: ConceptCard) => void;
  onPracticeClick?: (levelId: number) => void;
}

const ConceptCards: React.FC<ConceptCardsProps> = ({
  cards,
  onCardClick,
  onPracticeClick,
}) => {
  const [selectedCard, setSelectedCard] = useState<ConceptCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const filteredCards = filter === 'all' 
    ? cards 
    : cards.filter(card => card.difficulty === filter);

  const handleCardClick = (card: ConceptCard) => {
    playClickSound();
    setSelectedCard(card);
    if (onCardClick) {
      onCardClick(card);
    }
  };

  const handlePracticeClick = (levelId: number | undefined) => {
    playClickSound();
    if (levelId !== undefined && onPracticeClick) {
      onPracticeClick(levelId);
    }
  };

  const getDifficultyColor = (difficulty: ConceptCard['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '#48bb78';
      case 'intermediate':
        return '#4299e1';
      case 'advanced':
        return '#9f7aea';
      default:
        return '#a0aec0';
    }
  };

  const getDifficultyLabel = (difficulty: ConceptCard['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '入门';
      case 'intermediate':
        return '进阶';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  return (
    <div className={styles.conceptCards}>
      <div className={styles.header}>
        <h2 className={styles.title}>📚 编程概念学习</h2>
        <p className={styles.subtitle}>学习编程的基础概念，掌握编程思维！</p>
      </div>

      <div className={styles.filterTabs}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
          <button
            key={level}
            className={`${styles.filterTab} ${filter === level ? styles.active : ''}`}
            onClick={() => {
              playClickSound();
              setFilter(level);
            }}
          >
            {level === 'all' ? '全部' : getDifficultyLabel(level)}
          </button>
        ))}
      </div>

      <div className={styles.cardsGrid}>
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className={`${styles.card} ${selectedCard?.id === card.id ? styles.selected : ''}`}
            onClick={() => handleCardClick(card)}
            style={{ borderColor: getDifficultyColor(card.difficulty) }}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>{card.icon}</span>
              <span 
                className={styles.difficultyBadge}
                style={{ backgroundColor: getDifficultyColor(card.difficulty) }}
              >
                {getDifficultyLabel(card.difficulty)}
              </span>
            </div>

            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardDescription}>{card.description}</p>

            {selectedCard?.id === card.id && (
              <div className={styles.cardDetails}>
                <div className={styles.exampleSection}>
                  <h4>💡 示例</h4>
                  <p>{card.example}</p>
                </div>

                <div className={styles.tipsSection}>
                  <h4>✨ 小提示</h4>
                  <ul>
                    {card.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {card.relatedLevel !== undefined && (
                  <button
                    className={styles.practiceButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePracticeClick(card.relatedLevel);
                    }}
                  >
                    🎮 去练习
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p>暂无相关概念卡片</p>
        </div>
      )}
    </div>
  );
};

export default ConceptCards;

export const defaultConceptCards: ConceptCard[] = [
  {
    id: 'sequence',
    title: '顺序执行',
    icon: '➡️',
    description: '程序按照指令的顺序，一步一步地执行。',
    example: '前进 → 左转 → 前进 → 右转',
    tips: [
      '指令会按照你放置的顺序执行',
      '先想好每一步，再开始编程',
      '可以用纸笔画出路线图',
    ],
    relatedLevel: 0,
    difficulty: 'beginner',
  },
  {
    id: 'loop',
    title: '循环',
    icon: '🔄',
    description: '重复执行一组指令，减少重复代码。',
    example: '重复3次：前进 → 右转',
    tips: [
      '当需要重复做同样的事情时，使用循环',
      '循环可以让程序更简洁',
      '注意循环的次数，不要太多也不要太少',
    ],
    relatedLevel: 3,
    difficulty: 'intermediate',
  },
  {
    id: 'condition',
    title: '条件判断',
    icon: '❓',
    description: '根据条件决定是否执行某些指令。',
    example: '如果前面有墙，就左转',
    tips: [
      '条件判断让程序更聪明',
      '可以判断：是否有墙、是否有星星等',
      '条件可以是"是"或"否"',
    ],
    relatedLevel: 5,
    difficulty: 'intermediate',
  },
  {
    id: 'debugging',
    title: '调试',
    icon: '🔧',
    description: '找出程序中的错误并修复它们。',
    example: '使用调试模式，一步一步检查程序',
    tips: [
      '调试模式可以一步一步执行程序',
      '观察每一步的结果，找出问题',
      '不要害怕犯错，错误是学习的机会',
    ],
    relatedLevel: 2,
    difficulty: 'beginner',
  },
  {
    id: 'planning',
    title: '规划',
    icon: '🗺️',
    description: '在编程之前，先想好完整的解决方案。',
    example: '先画出路线图，再编写程序',
    tips: [
      '先观察地图，找出最佳路线',
      '考虑需要收集的星星',
      '预估需要的指令数量',
    ],
    relatedLevel: 1,
    difficulty: 'beginner',
  },
  {
    id: 'pattern',
    title: '模式识别',
    icon: '🔍',
    description: '发现重复的模式，简化程序。',
    example: '发现路线中有重复的"前进-右转"模式',
    tips: [
      '观察是否有重复的动作',
      '把重复的部分用循环代替',
      '模式识别可以让程序更优雅',
    ],
    relatedLevel: 4,
    difficulty: 'intermediate',
  },
  {
    id: 'function',
    title: '函数',
    icon: '📦',
    description: '把一组指令打包，可以重复使用。',
    example: '创建"转弯"函数：右转 → 右转',
    tips: [
      '函数就像自定义的指令',
      '可以给函数起一个容易理解的名字',
      '使用函数可以让程序更清晰',
    ],
    relatedLevel: 8,
    difficulty: 'advanced',
  },
  {
    id: 'variable',
    title: '变量',
    icon: '📊',
    description: '存储和使用数据，让程序更灵活。',
    example: '用变量记录收集的星星数量',
    tips: [
      '变量可以存储数字、文字等信息',
      '变量的值可以改变',
      '用变量可以跟踪游戏状态',
    ],
    relatedLevel: 10,
    difficulty: 'advanced',
  },
];
