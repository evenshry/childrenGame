import React from 'react';
import { Button, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { useAIAutoSolver } from '@/hooks/useAIAutoSolver';
import { useAIStore } from '@/store/aiStore';
import { useGameStore } from '@/store/gameStore';
import type { SolverCommand } from '@/api/qianwen/types';
import type { Command, CommandType } from '@/types/global';
import { generateId } from '@/utils/id';

const AutoSolveButton: React.FC = () => {
  const { currentMap, commitCommands, resetPreview } = useGameStore();
  const { solve } = useAIAutoSolver();
  const { isGenerating, settings, isDailyLimitReached } = useAIStore();

  const toCommand = (command: SolverCommand): Command => ({
    id: generateId(),
    type: command.type as CommandType,
    params: command.params as unknown as Command['params'],
    children: command.children?.map(toCommand),
    elseChildren: command.elseChildren?.map(toCommand),
  });

  const handleSolve = async () => {
    if (!settings.enableAutoSolve) {
      message.warning('AI解题功能已禁用，请在设置中开启');
      return;
    }
    if (isDailyLimitReached()) {
      message.warning('今日Token使用已达上限，请明天再试');
      return;
    }

    const robotCell = currentMap.cells.find((cell) => cell.type === 'robot');
    const goalCell = currentMap.cells.find((cell) => cell.type === 'goal');
    if (!robotCell || !goalCell) {
      message.warning('地图中缺少机器人或终点');
      return;
    }

    const result = await solve({
      map: {
        width: currentMap.width,
        height: currentMap.height,
        cells: currentMap.cells,
        stars: currentMap.stars,
      },
      startX: robotCell.x,
      startY: robotCell.y,
      startDir: robotCell.dir || 'right',
      goalX: goalCell.x,
      goalY: goalCell.y,
    });

    if (result) {
      commitCommands(result.commands.map(toCommand));
      resetPreview();
      message.success(
        result.explanation ? `解题成功！${result.explanation}` : '解题成功！',
      );
    } else {
      message.error('AI 解题失败，请重试');
    }
  };

  return (
    <Button
      type="primary"
      danger
      icon={<BulbOutlined />}
      onClick={() => {
        void handleSolve();
      }}
      loading={isGenerating}
      disabled={isGenerating || !settings.enableAutoSolve}
      style={{ marginLeft: 8 }}
    >
      AI解题
    </Button>
  );
};

export default AutoSolveButton;