import type { Command, MapData, CommandType } from '@/types/global';
import { executeProgram } from './gameEngine';
import { isValidPosition, manhattan } from './geometry';

/** 极简优先队列（小顶堆），避免全量 sort */
class MinHeap<T extends { f: number }> {
  private items: T[] = [];
  push(item: T) {
    this.items.push(item);
    this.up(this.items.length - 1);
  }
  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.down(0);
    }
    return top;
  }
  get size() {
    return this.items.length;
  }
  private up(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f > this.items[i].f) {
        [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
        i = parent;
      } else break;
    }
  }
  private down(i: number) {
    const n = this.items.length;
    let changed = true;
    while (changed) {
      changed = false;
      let smallest = i;
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      if (left < n && this.items[left].f < this.items[smallest].f) smallest = left;
      if (right < n && this.items[right].f < this.items[smallest].f) smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}

interface PathNode {
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  commands: Command[];
  collectedStars: Set<string>;
  remainingStars: Set<string>;
  g: number;
  h: number;
  f: number;
}

/** 方向顺序（用于比较两个方向需要几次转向） */
const DIRS: Array<{ dir: 'up' | 'down' | 'left' | 'right'; dx: number; dy: number }> = [
  { dir: 'up', dx: 0, dy: -1 },
  { dir: 'right', dx: 1, dy: 0 },
  { dir: 'down', dx: 0, dy: 1 },
  { dir: 'left', dx: -1, dy: 0 },
];

const DIR_INDEX: Record<'up' | 'down' | 'left' | 'right', number> = {
  up: 0,
  right: 1,
  down: 2,
  left: 3,
};

const generateCommandId = () => `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const createCommand = (type: CommandType, params?: Command['params'], children?: Command[]): Command => ({
  id: generateCommandId(),
  type,
  params: params || {},
  children,
});

/** 两方向之间需要的转向指令（含 left/right） */
const getTurnCommands = (fromDir: string, toDir: string): Command[] => {
  const fromIdx = DIR_INDEX[fromDir as keyof typeof DIR_INDEX];
  const toIdx = DIR_INDEX[toDir as keyof typeof DIR_INDEX];
  const diff = (toIdx - fromIdx + 4) % 4;
  const cmds: Command[] = [];
  if (diff === 1) cmds.push(createCommand('right'));
  else if (diff === 2) cmds.push(createCommand('right'), createCommand('right'));
  else if (diff === 3) cmds.push(createCommand('left'));
  return cmds;
};

const getStateKey = (n: PathNode): string => {
  // 对剩余星星排序，避免每次 new Set().sort()
  const remaining = Array.from(n.remainingStars).sort();
  return `${n.x},${n.y},${n.dir}|${remaining.join(',')}`;
};

export const findOptimalPath = (
  map: MapData,
  startX: number,
  startY: number,
  startDir: 'up' | 'down' | 'left' | 'right'
): Command[] => {
  const goal = map.cells.find((c) => c.type === 'goal');
  if (!goal) return [];

  const allStarsSet = new Set(map.stars.map((s) => `${s.x},${s.y}`));

  const heap = new MinHeap<PathNode>();
  const closed = new Set<string>();

  const initialRemaining = new Set(allStarsSet);
  const initH =
    manhattan(startX, startY, goal.x, goal.y) + initialRemaining.size * 2;

  heap.push({
    x: startX,
    y: startY,
    dir: startDir,
    commands: [],
    collectedStars: new Set<string>(),
    remainingStars: initialRemaining,
    g: 0,
    h: initH,
    f: initH,
  });

  // 状态上限保护，防止超大地图卡死
  const MAX_STATES = 50000;
  let explored = 0;

  while (heap.size > 0 && explored < MAX_STATES) {
    const current = heap.pop()!;
    explored++;

    if (current.x === goal.x && current.y === goal.y && current.remainingStars.size === 0) {
      return current.commands;
    }

    const key = getStateKey(current);
    if (closed.has(key)) continue;
    closed.add(key);

    for (const { dir, dx, dy } of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!isValidPosition(nx, ny, map)) continue;

      const turnCmds = getTurnCommands(current.dir, dir);
      const newCollected = new Set(current.collectedStars);
      const newRemaining = new Set(current.remainingStars);

      const starKey = `${nx},${ny}`;
      let extraCmds = [...turnCmds, createCommand('forward')];
      if (allStarsSet.has(starKey) && !newCollected.has(starKey)) {
        newCollected.add(starKey);
        newRemaining.delete(starKey);
        extraCmds.push(createCommand('collect'));
      }

      const g = current.g + extraCmds.length;
      const h = manhattan(nx, ny, goal.x, goal.y) + newRemaining.size * 2;

      const stateKey = `${nx},${ny},${dir}|${Array.from(newRemaining).sort().join(',')}`;
      if (closed.has(stateKey)) continue;

      heap.push({
        x: nx,
        y: ny,
        dir,
        commands: [...current.commands, ...extraCmds],
        collectedStars: newCollected,
        remainingStars: newRemaining,
        g,
        h,
        f: g + h,
      });
    }
  }

  return [];
};

/** 验证路径是否有效（支持 elseChildren） */
export const validatePath = (
  commands: Command[],
  map: MapData,
  startX: number,
  startY: number,
  startDir: 'up' | 'down' | 'left' | 'right'
): boolean => {
  const result = executeProgram(commands, { x: startX, y: startY, dir: startDir }, map);
  return result.success;
};
