import type { Direction, MapData, ConditionType, RobotState } from '@/types/global';

/** 方向到 [dx, dy] 的映射（坐标系：y 向下为正） */
export const DIRECTION_OFFSET: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** 方向顺序（右转用） */
export const DIR_RIGHT_ORDER: Direction[] = ['up', 'right', 'down', 'left'];
/** 方向顺序（左转用） */
export const DIR_LEFT_ORDER: Direction[] = ['up', 'left', 'down', 'right'];

/** 左转：up→left→down→right→up */
export const turnLeft = (dir: Direction): Direction =>
  DIR_LEFT_ORDER[(DIR_LEFT_ORDER.indexOf(dir) + 1) % 4];

/** 右转：up→right→down→left→up */
export const turnRight = (dir: Direction): Direction =>
  DIR_RIGHT_ORDER[(DIR_RIGHT_ORDER.indexOf(dir) + 1) % 4];

/** 计算某方向左转后的朝向 */
export const leftOf = (dir: Direction): Direction => turnLeft(dir);
/** 计算某方向右转后的朝向 */
export const rightOf = (dir: Direction): Direction => turnRight(dir);

/** 获取朝向对应的下一坐标 */
export const nextPosition = (
  robot: RobotState,
  distance: number = 1
): { x: number; y: number } => {
  const [dx, dy] = DIRECTION_OFFSET[robot.dir];
  return { x: robot.x + dx * distance, y: robot.y + dy * distance };
};

/** 检查坐标是否在地图边界内 */
export const isWithinBounds = (x: number, y: number, map: MapData): boolean =>
  x >= 0 && x < map.width && y >= 0 && y < map.height;

/** 检查位置是否有效（在边界内且不是墙） */
export const isValidPosition = (x: number, y: number, map: MapData): boolean => {
  if (!isWithinBounds(x, y, map)) return false;
  return !map.cells.some((cell) => cell.type === 'wall' && cell.x === x && cell.y === y);
};

/** 曼哈顿距离 */
export const manhattan = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.abs(x1 - x2) + Math.abs(y1 - y2);

/** 条件求值：返回条件是否满足 */
export const evaluateCondition = (
  condition: ConditionType | undefined,
  robot: RobotState,
  map: MapData,
  collectedStarsCount: number,
  _collectedStarsPositions?: { x: number; y: number }[]
): boolean => {
  if (!condition) return true;

  const front = nextPosition(robot);
  const leftDir = leftOf(robot.dir);
  const rightDir = rightOf(robot.dir);
  const left = {
    x: robot.x + DIRECTION_OFFSET[leftDir][0],
    y: robot.y + DIRECTION_OFFSET[leftDir][1],
  };
  const right = {
    x: robot.x + DIRECTION_OFFSET[rightDir][0],
    y: robot.y + DIRECTION_OFFSET[rightDir][1],
  };

  switch (condition) {
    case 'frontBlocked':
      return !isValidPosition(front.x, front.y, map);
    case 'leftBlocked':
      return !isValidPosition(left.x, left.y, map);
    case 'rightBlocked':
      return !isValidPosition(right.x, right.y, map);
    case 'edgeInFront':
      return !isWithinBounds(front.x, front.y, map);
    case 'hasStar':
      return collectedStarsCount > 0;
    case 'nearGoal': {
      const goal = map.cells.find((c) => c.type === 'goal');
      if (!goal) return false;
      return manhattan(robot.x, robot.y, goal.x, goal.y) <= 2;
    }
    default:
      return true;
  }
};

/** 判断星星是否在 (x,y) 上（未被收集） */
export const starAt = (
  x: number,
  y: number,
  map: MapData,
  collectedStarsPositions?: { x: number; y: number }[]
): boolean => {
  if (!map.stars.some((s) => s.x === x && s.y === y)) return false;
  if (!collectedStarsPositions) return true;
  return !collectedStarsPositions.some((s) => s.x === x && s.y === y);
};

/** 机器人是否到达终点 */
export const isAtGoal = (robot: RobotState, map: MapData): boolean =>
  map.cells.some((c) => c.type === 'goal' && c.x === robot.x && c.y === robot.y);
