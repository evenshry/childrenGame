import React from 'react';
import styles from './index.module.scss';

interface ProgrammingCardProps {
  title: string;
  concept: string;
  description: string;
  example: string;
  icon?: string;
}

const ProgrammingCard: React.FC<ProgrammingCardProps> = ({
  title,
  concept,
  description,
  example,
  icon,
}) => {
  return (
    <div className={styles.programmingCard}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.concept}>{concept}</div>
      <p className={styles.description}>{description}</p>
      <div className={styles.example}>
        <h4>示例：</h4>
        <pre>{example}</pre>
      </div>
    </div>
  );
};

export default React.memo(ProgrammingCard);