import React, { useState } from 'react';
import { Button, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { useAIAutoSolver } from '@/hooks/useAIAutoSolver';
import { useAIStore } from '@/store/aiStore';
import { useGameStore } from '@/store/gameStore';
import { Command } from '@/types/global';

const AutoSolveButton: React.FC = () => {
  const { currentMap, setCommands } = useGameStore();
  const { solve, error } = useAIAutoSolver();
  const { isGenerating, settings, isDailyLimitReached } = useAIStore();

  const handleSolve = async () => {
    if (!settings.enableAutoSolve) {
      message.warning('AI解题功能已禁用，请在设置中开启');
      return;
    }
    
    if (isDailyLimitReached()) {
      message.warning('今日Token使用已达上限，请明天再试');
      return;
    }
    
    const robotCell = currentMap.cells.find(c => c.type === 'robot');
    const goalCell = currentMap.cells.find(c => c.type === 'goal');
    
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
      const commands: Command[] = result.commands.map((cmd: any, index: number) => ({
        id: `ai_cmd_${Date.now()}_${index}`,
        type: cmd.type as any,
        params: cmd.params,
      }));
      setCommands(commands);
      
      if (result.explanation) {
        message.success(`解题成功！${result.explanation}`);
      } else {
        message.success('解题成功！');
      }
    } else if (error) {
      message.error(error);
    }
  };

  return (
    <Button
      type="primary"
      danger
      icon={<BulbOutlined />}
      onClick={handleSolve}
      loading={isGenerating}
      disabled={isGenerating || !settings.enableAutoSolve}
      style={{ marginLeft: 8 }}
    >
      AI解题
    </Button>
  );
};

export default AutoSolveButton;
