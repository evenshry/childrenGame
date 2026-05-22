import { Command, Direction, MapData, DebugStep, RobotState, ConditionType } from '@/types/global';

// 游戏引擎工具函数

// 扁平化指令，用于调试模式
export const flattenCommands = (cmds: Command[], index: number = 0): DebugStep[] => {
  let result: DebugStep[] = [];
  let currentIndex = index;

  cmds.forEach((cmd) => {
    result.push({ command: cmd, index: currentIndex });
    currentIndex++;
    if (cmd.children && cmd.children.length > 0) {
      const childSteps = flattenCommands(cmd.children, currentIndex);
      result = result.concat(childSteps);
      currentIndex += childSteps.length;
    }
    // 处理else分支
    if (cmd.elseChildren && cmd.elseChildren.length > 0) {
      const elseSteps = flattenCommands(cmd.elseChildren, currentIndex);
      result = result.concat(elseSteps);
      currentIndex += elseSteps.length;
    }
  });

  return result;
};

// 检查位置是否有效
export const isValidPosition = (x: number, y: number, map: MapData): boolean => {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return false;
  }
  return !map.cells.some((cell) => cell.type === 'wall' && cell.x === x && cell.y === y);
};

// 检查是否到达终点
export const isAtGoal = (x: number, y: number, map: MapData): boolean => {
  return map.cells.some((cell) => cell.type === 'goal' && cell.x === x && cell.y === y);
};

// 检查位置是否有星星
export const checkStars = (x: number, y: number, map: MapData): boolean => {
  const starIndex = map.stars.findIndex((star) => star.x === x && star.y === y);
  return starIndex !== -1;
};

// 执行单个指令
export const executeCommand = (
  cmd: Command,
  robot: RobotState,
  map: MapData,
  collectedStars: number
): {
  success: boolean;
  robot: RobotState;
  collectedStars: number;
  message: string;
} => {
  let success = true;
  let message = '';
  let updatedRobot = { ...robot };
  let updatedCollectedStars = collectedStars;

  switch (cmd.type) {
    case 'forward':
      const directionOffset = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      }[updatedRobot.dir];
      const newX = updatedRobot.x + directionOffset[0];
      const newY = updatedRobot.y + directionOffset[1];

      if (isValidPosition(newX, newY, map)) {
        updatedRobot = {
          ...updatedRobot,
          x: newX,
          y: newY,
        };

        if (checkStars(newX, newY, map)) {
          updatedCollectedStars++;
          message = `收集星星！当前位置: (${newX}, ${newY})`;
        } else {
          message = `前进到: (${newX}, ${newY})`;
        }
      } else {
        success = false;
        message = '机器人撞墙了！';
      }
      break;
    case 'left':
      const dirs: Direction[] = ['up', 'left', 'down', 'right'];
      const newLeftDir = dirs[(dirs.indexOf(updatedRobot.dir) + 1) % 4];
      updatedRobot = {
        ...updatedRobot,
        dir: newLeftDir,
      };
      message = `左转，当前方向: ${getDirectionLabel(newLeftDir)}`;
      break;
    case 'right':
      const dirsRight: Direction[] = ['up', 'right', 'down', 'left'];
      const newRightDir = dirsRight[(dirsRight.indexOf(updatedRobot.dir) + 1) % 4];
      updatedRobot = {
        ...updatedRobot,
        dir: newRightDir,
      };
      message = `右转，当前方向: ${getDirectionLabel(newRightDir)}`;
      break;
    case 'loop':
      message = `开始循环 ${cmd.params?.times || 2}次`;
      break;
    case 'if':
      const condition = cmd.params?.condition;
      let conditionMet = false;

      if (condition === 'frontBlocked') {
        const directionOffset = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        }[updatedRobot.dir];
        const frontX = updatedRobot.x + directionOffset[0];
        const frontY = updatedRobot.y + directionOffset[1];
        conditionMet = !isValidPosition(frontX, frontY, map);
      } else if (condition === 'leftBlocked') {
        const leftDir = {
          up: 'left',
          left: 'down',
          down: 'right',
          right: 'up',
        }[updatedRobot.dir] as Direction;
        const directionOffset = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        }[leftDir];
        const leftX = updatedRobot.x + directionOffset[0];
        const leftY = updatedRobot.y + directionOffset[1];
        conditionMet = !isValidPosition(leftX, leftY, map);
      } else if (condition === 'rightBlocked') {
        const rightDir = {
          up: 'right',
          right: 'down',
          down: 'left',
          left: 'up',
        }[updatedRobot.dir] as Direction;
        const directionOffset = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        }[rightDir];
        const rightX = updatedRobot.x + directionOffset[0];
        const rightY = updatedRobot.y + directionOffset[1];
        conditionMet = !isValidPosition(rightX, rightY, map);
      } else if (condition === 'hasStar') {
        conditionMet = updatedCollectedStars > 0;
      } else if (condition === 'nearGoal') {
        const goal = map.cells.find((cell) => cell.type === 'goal');
        if (goal) {
          const distance = Math.abs(updatedRobot.x - goal.x) + Math.abs(updatedRobot.y - goal.y);
          conditionMet = distance <= 2;
        }
      } else if (condition === 'edgeInFront') {
        const directionOffset = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
        }[updatedRobot.dir];
        const nextX = updatedRobot.x + directionOffset[0];
        const nextY = updatedRobot.y + directionOffset[1];
        conditionMet = nextX < 0 || nextX >= map.width || nextY < 0 || nextY >= map.height;
      }

      message = `条件判断: ${conditionMet ? '满足' : '不满足'}`;
      break;
    case 'repeatUntil':
      message = '开始重复直到条件满足';
      break;
    case 'collect':
      const starIndex = map.stars.findIndex((star) => star.x === updatedRobot.x && star.y === updatedRobot.y);
      if (starIndex !== -1) {
        updatedCollectedStars++;
        message = '收集星星！';
      } else {
        message = '没有星星可以收集！';
      }
      break;
    case 'wait':
      message = `等待 ${cmd.params?.seconds || 1} 秒`;
      break;
    case 'randomTurn':
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      updatedRobot = {
        ...updatedRobot,
        dir: randomDir,
      };
      message = `随机转向，当前方向: ${getDirectionLabel(randomDir)}`;
      break;
  }

  return {
    success,
    robot: updatedRobot,
    collectedStars: updatedCollectedStars,
    message,
  };
};

// 执行完整程序
export const executeProgram = (
  commands: Command[],
  initialRobot: RobotState,
  map: MapData
): {
  success: boolean;
  robot: RobotState;
  collectedStars: number;
  message: string;
} => {
  let currentRobot = { ...initialRobot };
  let collectedStars = 0;
  let success = true;
  let message = '';

  const executeRecursive = (cmd: Command): boolean => {
    switch (cmd.type) {
      case 'forward':
      case 'left':
      case 'right':
      case 'loop':
      case 'if':
      case 'repeatUntil':
      case 'collect':
      case 'wait':
      case 'randomTurn':
        const result = executeCommand(cmd, currentRobot, map, collectedStars);
        if (!result.success) {
          success = false;
          message = result.message;
          return false;
        }
        currentRobot = result.robot;
        collectedStars = result.collectedStars;

        // 处理循环和条件指令的子指令
        if (cmd.type === 'loop') {
          const times = cmd.params?.times || 2;
          for (let i = 0; i < times; i++) {
            if (cmd.children) {
              for (const childCmd of cmd.children) {
                if (!executeRecursive(childCmd)) {
                  return false;
                }
              }
            }
          }
        } else if (cmd.type === 'if' && cmd.children) {
          const condition = cmd.params?.condition as ConditionType;
          let conditionMet = false;

          if (condition === 'frontBlocked') {
            const directionOffset = {
              up: [0, -1],
              down: [0, 1],
              left: [-1, 0],
              right: [1, 0],
            }[currentRobot.dir];
            const frontX = currentRobot.x + directionOffset[0];
            const frontY = currentRobot.y + directionOffset[1];
            conditionMet = !isValidPosition(frontX, frontY, map);
          } else if (condition === 'leftBlocked') {
            const leftDir = {
              up: 'left',
              left: 'down',
              down: 'right',
              right: 'up',
            }[currentRobot.dir] as Direction;
            const directionOffset = {
              up: [0, -1],
              down: [0, 1],
              left: [-1, 0],
              right: [1, 0],
            }[leftDir];
            const leftX = currentRobot.x + directionOffset[0];
            const leftY = currentRobot.y + directionOffset[1];
            conditionMet = !isValidPosition(leftX, leftY, map);
          } else if (condition === 'rightBlocked') {
            const rightDir = {
              up: 'right',
              right: 'down',
              down: 'left',
              left: 'up',
            }[currentRobot.dir] as Direction;
            const directionOffset = {
              up: [0, -1],
              down: [0, 1],
              left: [-1, 0],
              right: [1, 0],
            }[rightDir];
            const rightX = currentRobot.x + directionOffset[0];
            const rightY = currentRobot.y + directionOffset[1];
            conditionMet = !isValidPosition(rightX, rightY, map);
          } else if (condition === 'hasStar') {
            conditionMet = collectedStars > 0;
          } else if (condition === 'nearGoal') {
            const goal = map.cells.find((cell) => cell.type === 'goal');
            if (goal) {
              const distance = Math.abs(currentRobot.x - goal.x) + Math.abs(currentRobot.y - goal.y);
              conditionMet = distance <= 2;
            }
          }

          if (conditionMet) {
            if (cmd.children) {
              for (const childCmd of cmd.children) {
                if (!executeRecursive(childCmd)) {
                  return false;
                }
              }
            }
          } else {
            if (cmd.elseChildren) {
              for (const childCmd of cmd.elseChildren) {
                if (!executeRecursive(childCmd)) {
                  return false;
                }
              }
            }
          }
        } else if (cmd.type === 'repeatUntil' && cmd.children) {
          const repeatCondition = cmd.params?.condition;
          let repeatConditionMet = false;

          while (!repeatConditionMet) {
            for (const childCmd of cmd.children) {
              if (!executeRecursive(childCmd)) {
                return false;
              }
            }

            if (repeatCondition === 'hasStar') {
              repeatConditionMet = collectedStars > 0;
            } else if (repeatCondition === 'frontBlocked') {
              const directionOffset = {
                up: [0, -1],
                down: [0, 1],
                left: [-1, 0],
                right: [1, 0],
              }[currentRobot.dir];
              const frontX = currentRobot.x + directionOffset[0];
              const frontY = currentRobot.y + directionOffset[1];
              repeatConditionMet = !isValidPosition(frontX, frontY, map);
            } else if (repeatCondition === 'nearGoal') {
              const goal = map.cells.find((cell) => cell.type === 'goal');
              if (goal) {
                const distance = Math.abs(currentRobot.x - goal.x) + Math.abs(currentRobot.y - goal.y);
                repeatConditionMet = distance <= 2;
              }
            } else if (repeatCondition === 'edgeInFront') {
              const directionOffset = {
                up: [0, -1],
                down: [0, 1],
                left: [-1, 0],
                right: [1, 0],
              }[currentRobot.dir];
              const nextX = currentRobot.x + directionOffset[0];
              const nextY = currentRobot.y + directionOffset[1];
              repeatConditionMet = nextX < 0 || nextX >= map.width || nextY < 0 || nextY >= map.height;
            }
          }
        }
        break;
    }
    return true;
  };

  for (const cmd of commands) {
    if (!executeRecursive(cmd)) {
      break;
    }
  }

  if (success) {
    const atGoal = isAtGoal(currentRobot.x, currentRobot.y, map);
    const allStarsCollected = collectedStars >= map.stars.length;

    if (atGoal && allStarsCollected) {
      message = '恭喜你过关了！';
    } else if (!atGoal) {
      success = false;
      message = '机器人没有到达终点！';
    } else if (collectedStars < map.stars.length) {
      success = false;
      message = '还有星星没有收集！';
    }
  }

  return {
    success,
    robot: currentRobot,
    collectedStars,
    message,
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

// 获取指令标签
export const getCommandLabel = (cmd: Command): string => {
  switch (cmd.type) {
    case 'forward':
      return '前进';
    case 'left':
      return '左转';
    case 'right':
      return '右转';
    case 'loop':
      return `循环 ${cmd.params?.times || 2}次`;
    case 'if':
      return '如果';
    case 'repeatUntil':
      return '重复直到';
    case 'collect':
      return '收集';
    case 'wait':
      return `等待 ${cmd.params?.seconds || 1}秒`;
    case 'randomTurn':
      return '随机转向';
    default:
      return '指令';
  }
};
