import { Command, MapData, RobotState, CellType, CommandType } from '@/types/global';
import { executeCommand, isValidPosition, checkStars } from './gameEngine';

interface PathNode {
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  commands: Command[];
  collectedStars: Set<string>;
  g: number; // 代价
  h: number; // 启发式
  f: number; // 总代价
}

// 生成唯一ID
const generateCommandId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 创建带ID的指令
const createCommand = (type: CommandType): Command => ({
  id: generateCommandId(),
  type,
  params: {}
});

// 计算曼哈顿距离作为启发式函数
const heuristic = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

// 获取转向指令列表
const getTurnCommands = (fromDir: string, toDir: string): Command[] => {
  const dirs: string[] = ['up', 'right', 'down', 'left'];
  const fromIndex = dirs.indexOf(fromDir);
  const toIndex = dirs.indexOf(toDir);
  
  const diff = (toIndex - fromIndex + 4) % 4;
  const commands: Command[] = [];
  
  if (diff === 1) {
    commands.push(createCommand('right'));
  } else if (diff === 3) {
    commands.push(createCommand('left'));
  } else if (diff === 2) {
    commands.push(createCommand('right'));
    commands.push(createCommand('right'));
  }
  
  return commands;
};

// 状态键，用于已访问集合
const getStateKey = (node: PathNode, remainingStars: Set<string>): string => {
  const starKey = Array.from(remainingStars).sort().join('|');
  return `${node.x},${node.y},${node.dir},${starKey}`;
};

export const findOptimalPath = (
  map: MapData,
  startX: number,
  startY: number,
  startDir: 'up' | 'down' | 'left' | 'right'
): Command[] => {
  const goal = map.cells.find(cell => cell.type === 'goal');
  if (!goal) return [];
  
  const goalX = goal.x;
  const goalY = goal.y;
  
  const allStars = new Set(map.stars.map(s => `${s.x},${s.y}`));
  const directions: Array<{ dir: 'up' | 'down' | 'left' | 'right', dx: number, dy: number }> = [
    { dir: 'up', dx: 0, dy: -1 },
    { dir: 'down', dx: 0, dy: 1 },
    { dir: 'left', dx: -1, dy: 0 },
    { dir: 'right', dx: 1, dy: 0 },
  ];
  
  const initialCollected = new Set<string>();
  
  const openSet: PathNode[] = [{
    x: startX,
    y: startY,
    dir: startDir,
    commands: [],
    collectedStars: initialCollected,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY) + map.stars.length * 2,
    f: heuristic(startX, startY, goalX, goalY) + map.stars.length * 2,
  }];
  
  const closedSet = new Set<string>();
  
  while (openSet.length > 0) {
    // 找到f值最小的节点
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // 计算剩余需要收集的星星
    const remainingStars = new Set(allStars);
    current.collectedStars.forEach(s => remainingStars.delete(s));
    
    // 检查是否到达目标状态
    if (current.x === goalX && current.y === goalY && remainingStars.size === 0) {
      return current.commands;
    }
    
    const stateKey = getStateKey(current, remainingStars);
    if (closedSet.has(stateKey)) continue;
    closedSet.add(stateKey);
    
    // 尝试向四个方向移动
    for (const { dir, dx, dy } of directions) {
      const newX = current.x + dx;
      const newY = current.y + dy;
      
      // 检查新位置是否有效
      if (!isValidPosition(newX, newY, map)) continue;
      
      // 计算转向指令
      const turnCommands = getTurnCommands(current.dir, dir);
      
      // 计算移动后的状态
      const newCollected = new Set(current.collectedStars);
      let extraCommands: Command[] = [...turnCommands, createCommand('forward')];
      
      // 检查是否有星星需要收集
      if (checkStars(newX, newY, map) && !newCollected.has(`${newX},${newY}`)) {
        newCollected.add(`${newX},${newY}`);
        extraCommands.push(createCommand('collect'));
      }
      
      // 计算新的代价和启发式
      const newRemaining = new Set(allStars);
      newCollected.forEach(s => newRemaining.delete(s));
      
      const newG = current.g + extraCommands.length;
      const newH = heuristic(newX, newY, goalX, goalY) + newRemaining.size * 2;
      const newF = newG + newH;
      
      const newNode: PathNode = {
        x: newX,
        y: newY,
        dir: dir,
        commands: [...current.commands, ...extraCommands],
        collectedStars: newCollected,
        g: newG,
        h: newH,
        f: newF,
      };
      
      // 检查新状态是否在已访问集合中
      const newStateKey = getStateKey(newNode, newRemaining);
      if (closedSet.has(newStateKey)) continue;
      
      // 添加到开放集合
      openSet.push(newNode);
    }
  }
  
  // 如果没有找到路径，返回空数组
  return [];
};

// 验证路径是否有效
export const validatePath = (
  commands: Command[],
  map: MapData,
  startX: number,
  startY: number,
  startDir: 'up' | 'down' | 'left' | 'right'
): boolean => {
  let robot: RobotState = { x: startX, y: startY, dir: startDir };
  let collectedStars = 0;
  
  for (const cmd of commands) {
    const result = executeCommand(cmd, robot, map, collectedStars);
    if (!result.success) {
      return false;
    }
    robot = result.robot;
    collectedStars = result.collectedStars;
  }
  
  // 检查是否到达终点并收集所有星星
  const goal = map.cells.find(cell => cell.type === 'goal');
  const atGoal = goal ? (robot.x === goal.x && robot.y === goal.y) : false;
  const allCollected = collectedStars === map.stars.length;
  
  return atGoal && allCollected;
};
