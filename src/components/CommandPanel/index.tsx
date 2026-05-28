import React, { useMemo } from 'react';
import CommandBlock from '@/components/CommandBlock';
import AutoSolveButton from './AutoSolveButton';
import { Command } from '@/types/global';
import styles from './index.module.scss';

const commandDefinitions: Command[] = [
  { id: 'cmd_forward', type: 'forward' },
  { id: 'cmd_left', type: 'left' },
  { id: 'cmd_right', type: 'right' },
  { id: 'cmd_loop', type: 'loop', params: { times: 2 } },
  { id: 'cmd_if', type: 'if', params: { condition: 'frontBlocked' } },
  { id: 'cmd_repeatUntil', type: 'repeatUntil', params: { condition: 'hasStar' } },
  { id: 'cmd_collect', type: 'collect' },
  { id: 'cmd_wait', type: 'wait', params: { seconds: 1 } },
  { id: 'cmd_randomTurn', type: 'randomTurn' },
];

const CommandPanel: React.FC = () => {
  const commands = useMemo(() => commandDefinitions, []);

  return (
    <div className={styles.commandPanel}>
      <div className={styles.panelHeader}>
        <h3>指令面板</h3>
        <AutoSolveButton />
      </div>
      <div className={styles.commandBlocks}>
        {commands.map((command) => (
          <CommandBlock
            key={command.id}
            command={command}
            onRemove={() => {}}
            isFromPanel={true}
          />
        ))}
      </div>
    </div>
  );
};

export default CommandPanel;
