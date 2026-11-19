import type { Command, Direction, MapData, RobotState } from '@/types/global';
import { simulateProgram } from './execution-engine';

/**
 * 执行完整程序（同步版本，供本地寻路验证使用）。
 * 实际执行逻辑统一委托给 execution-engine，避免多套语义。
 */
export const executeProgram = (
  commands: Command[],
  initialRobot: RobotState,
  map: MapData,
): { success: boolean; robot: RobotState; collectedStars: number; message: string } => {
  const result = simulateProgram(commands, initialRobot, map);
  return {
    success: result.success,
    robot: result.robot,
    collectedStars: result.collectedStars.length,
    message: result.message,
  };
};

// 获取方向标签
export const getDirectionLabel = (dir: Direction): string => {
  switch (dir) {
    case 'up':
      return '上';
    case 'down':
      return '下';
    case 'left':
      return '左';
    case 'right':
      return '右';
    default:
      return '未知';
  }
};