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
    for (;;) {
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
  parent: PathNode | null;
  edge: Command[];
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

const parseStarKey = (key: string): [number, number] => {
  const [x, y] = key.split(',');
  return [Number(x), Number(y)];
};

const getStateKey = (n: PathNode): string => {
  const remaining = Array.from(n.remainingStars).sort();
  return `${n.x},${n.y},${n.dir}|${remaining.join(',')}`;
};

/** 把连续的 forward 合并为 loop，减少顶层指令数（语义不变） */
export const compressCommands = (commands: Command[]): Command[] => {
  const out: Command[] = [];
  let i = 0;
  while (i < commands.length) {
    if (commands[i].type !== 'forward') {
      out.push(commands[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < commands.length && commands[j].type === 'forward') j++;
    const run = j - i;
    if (run >= 2) {
      out.push(
        createCommand('loop', { times: run }, [createCommand('forward')]),
      );
    } else {
      out.push(commands[i]);
    }
    i = j;
  }
  return out;
};

export const findOptimalPath = (
  map: MapData,
  startX: number,
  startY: number,
  startDir: 'up' | 'down' | 'left' | 'right'
): Command[] => {
  const goal = map.cells.find((c) => c.type === 'goal');
  if (!goal) return [];

  const starKeys = map.stars.map((s) => `${s.x},${s.y}`);
  const starCoords = new Map(starKeys.map((key) => [key, parseStarKey(key)]));

  // 可采纳启发式：到终点的曼哈顿距离 + 绕路收某一颗星的最大额外代价
  // 可采纳启发式：到终点的曼哈顿距离 + 绕路收某一颗星的最大额外代价
  const heuristic = (x: number, y: number, remaining: Set<string>): number => {
    const toGoal = manhattan(x, y, goal.x, goal.y);
    let extra = 0;
    for (const key of remaining) {
      const [sx, sy] = starCoords.get(key)!;
      const detour =
        manhattan(x, y, sx, sy) + manhattan(sx, sy, goal.x, goal.y) - toGoal;
      if (detour > extra) extra = detour;
    }
    return toGoal + extra;
  };

  const reconstruct = (node: PathNode): Command[] => {
    const edges: Command[][] = [];
    let current: PathNode | null = node;
    while (current && current.edge.length > 0) {
      edges.push(current.edge);
      current = current.parent;
    }
    edges.reverse();
    return edges.flat();
  };

  const heap = new MinHeap<PathNode>();
  // 启发式可采纳但不一致，需允许以更小 g 重开已展开状态，才能保证最优
  const bestG = new Map<string, number>();
  const processed = new Set<string>();

  const initialRemaining = new Set(starKeys);
  const initH = heuristic(startX, startY, initialRemaining);
  const startKey = `${startX},${startY},${startDir}|${Array.from(initialRemaining).sort().join(',')}`;
  bestG.set(startKey, 0);

  heap.push({
    x: startX,
    y: startY,
    dir: startDir,
    parent: null,
    edge: [],
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
      return compressCommands(reconstruct(current));
    }

    const key = getStateKey(current);
    if (processed.has(key)) continue;
    processed.add(key);

    for (const { dir, dx, dy } of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!isValidPosition(nx, ny, map)) continue;

      const turnCmds = getTurnCommands(current.dir, dir);
      const newRemaining = new Set(current.remainingStars);
      // forward 本身会自动收星，无需额外 collect 指令
      newRemaining.delete(`${nx},${ny}`);

      const edge = [...turnCmds, createCommand('forward')];
      const g = current.g + edge.length;
      const h = heuristic(nx, ny, newRemaining);

      const stateKey = `${nx},${ny},${dir}|${Array.from(newRemaining).sort().join(',')}`;
      const known = bestG.get(stateKey);
      if (known !== undefined && known <= g) continue;
      bestG.set(stateKey, g);
      processed.delete(stateKey);

      heap.push({
        x: nx,
        y: ny,
        dir,
        parent: current,
        edge,
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