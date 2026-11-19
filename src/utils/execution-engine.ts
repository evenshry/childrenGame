import type { Command, ConditionType, MapData, RobotState } from '@/types/global';
import {
  evaluateCondition,
  isValidPosition,
  nextPosition,
  turnLeft,
  turnRight,
} from './geometry';

export interface ExecutionStep {
  robot: RobotState;
  collectedStars: string[];
  commandId: string | null;
  message: string;
  success: boolean;
  /** 命中调试断点，尚未执行该指令 */
  paused: boolean;
  /** 循环 / 条件等控制指令产生的展示步骤 */
  control: boolean;
  /** 已执行的原子动作数 */
  steps: number;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  robot: RobotState;
  collectedStars: string[];
  steps: number;
}

export interface ExecutionOptions {
  breakpoints?: Set<string>;
  maxLoopIterations?: number;
  maxRepeatIterations?: number;
  maxSteps?: number;
}

export const starKey = (x: number, y: number): string => `${x},${y}`;

const commandLabel = (command: Command): string => {
  switch (command.type) {
    case 'forward':
      return '前进';
    case 'left':
      return '左转';
    case 'right':
      return '右转';
    case 'loop':
      return `循环 ${command.params?.times ?? 2} 次`;
    case 'if':
      return '如果';
    case 'repeatUntil':
      return '重复直到';
    case 'collect':
      return '收集';
    case 'wait':
      return `等待 ${command.params?.seconds ?? 1} 秒`;
    case 'randomTurn':
      return '随机转向';
    default:
      return '指令';
  }
};

/**
 * 统一的程序执行器。
 * - 运行模式：消费 generator，按步骤更新 UI
 * - 调试模式：每次 next() 只推进一个原子步骤
 * - 通过 maxSteps / maxLoop / maxRepeat 防止死循环
 */
export function* runProgram(
  commands: Command[],
  initialRobot: RobotState,
  map: MapData,
  initialCollected: Iterable<string> = [],
  options: ExecutionOptions = {},
): Generator<ExecutionStep, ExecutionResult, void> {
  const maxLoop = options.maxLoopIterations ?? 100;
  const maxRepeat = options.maxRepeatIterations ?? 200;
  const maxSteps = options.maxSteps ?? 10000;
  const breakpoints = options.breakpoints ?? new Set<string>();

  const collected = new Set(initialCollected);
  let robot: RobotState = { ...initialRobot };
  let steps = 0;
  let failed = false;
  let failureMessage = '';

  const snapshot = (
    commandId: string | null,
    message: string,
    success = true,
    paused = false,
    control = false,
  ): ExecutionStep => ({
    robot: { ...robot },
    collectedStars: [...collected],
    commandId,
    message,
    success,
    paused,
    control,
    steps,
  });

  const fail = (message: string, commandId: string | null = null): ExecutionStep => {
    failed = true;
    failureMessage = message;
    return snapshot(commandId, message, false);
  };

  function* execMany(list: Command[]): Generator<ExecutionStep, boolean, void> {
    for (const command of list) {
      const ok = yield* execOne(command);
      if (!ok) return false;
    }
    return true;
  }

  function* execOne(command: Command): Generator<ExecutionStep, boolean, void> {
    if (failed) return false;
    if (steps >= maxSteps) {
      yield fail('程序执行步骤过多，可能存在死循环', command.id);
      return false;
    }
    if (breakpoints.has(command.id)) {
      yield snapshot(command.id, `断点: ${commandLabel(command)}`, true, true);
    }

    switch (command.type) {
      case 'forward': {
        const { x, y } = nextPosition(robot);
        if (!isValidPosition(x, y, map)) {
          yield fail('机器人撞墙了！', command.id);
          return false;
        }
        robot = { ...robot, x, y };
        steps++;
        const key = starKey(x, y);
        const hasStar =
          map.stars.some((star) => starKey(star.x, star.y) === key) && !collected.has(key);
        if (hasStar) collected.add(key);
        yield snapshot(
          command.id,
          hasStar ? `前进并收集星星！当前位置: (${x}, ${y})` : `前进到: (${x}, ${y})`,
        );
        return true;
      }
      case 'left':
        robot = { ...robot, dir: turnLeft(robot.dir) };
        steps++;
        yield snapshot(command.id, `左转，当前方向: ${robot.dir}`);
        return true;
      case 'right':
        robot = { ...robot, dir: turnRight(robot.dir) };
        steps++;
        yield snapshot(command.id, `右转，当前方向: ${robot.dir}`);
        return true;
      case 'randomTurn': {
        const directions: RobotState['dir'][] = ['up', 'down', 'left', 'right'];
        robot = {
          ...robot,
          dir: directions[Math.floor(Math.random() * directions.length)],
        };
        steps++;
        yield snapshot(command.id, `随机转向，当前方向: ${robot.dir}`);
        return true;
      }
      case 'collect': {
        const key = starKey(robot.x, robot.y);
        const hasStar =
          map.stars.some((star) => starKey(star.x, star.y) === key) && !collected.has(key);
        if (hasStar) {
          collected.add(key);
        }
        steps++;
        yield snapshot(command.id, hasStar ? '收集星星！' : '没有星星可以收集！');
        return true;
      }
      case 'wait':
        steps++;
        yield snapshot(command.id, `等待 ${command.params?.seconds ?? 1} 秒`);
        return true;
      case 'loop': {
        const times = Math.max(0, Math.min(command.params?.times ?? 2, maxLoop));
        yield snapshot(command.id, `开始循环 ${times} 次`, true, false, true);
        for (let i = 0; i < times; i++) {
          const ok = yield* execMany(command.children ?? []);
          if (!ok) return false;
        }
        return true;
      }
      case 'if': {
        const met = evaluateCondition(
          command.params?.condition as ConditionType | undefined,
          robot,
          map,
          collected.size,
        );
        yield snapshot(command.id, `条件判断: ${met ? '满足' : '不满足'}`, true, false, true);
        return yield* execMany(met ? command.children ?? [] : command.elseChildren ?? []);
      }
      case 'repeatUntil': {
        yield snapshot(
          command.id,
          `重复直到: ${commandLabel(command)}`,
          true,
          false,
          true,
        );
        let iterations = 0;
        while (iterations < maxRepeat) {
          const ok = yield* execMany(command.children ?? []);
          if (!ok) return false;
          iterations++;
          if (
            evaluateCondition(
              command.params?.condition as ConditionType | undefined,
              robot,
              map,
              collected.size,
            )
          ) {
            return true;
          }
        }
        yield fail(`重复执行超过 ${maxRepeat} 次仍未满足条件`, command.id);
        return false;
      }
      default:
        return true;
    }
  }

  yield* execMany(commands);

  if (failed) {
    return {
      success: false,
      message: failureMessage,
      robot,
      collectedStars: [...collected],
      steps,
    };
  }

  const atGoal = map.cells.some(
    (cell) => cell.type === 'goal' && cell.x === robot.x && cell.y === robot.y,
  );
  const allStars = [...new Set(map.stars.map((star) => starKey(star.x, star.y)))].every(
    (key) => collected.has(key),
  );

  if (atGoal && allStars) {
    return {
      success: true,
      message: '恭喜你过关了！',
      robot,
      collectedStars: [...collected],
      steps,
    };
  }
  if (!atGoal) {
    return {
      success: false,
      message: '机器人没有到达终点！',
      robot,
      collectedStars: [...collected],
      steps,
    };
  }
  return {
    success: false,
    message: '还有星星没有收集！',
    robot,
    collectedStars: [...collected],
    steps,
  };
}

/** 同步执行完整个程序（用于本地寻路验证 / 预览） */
export const simulateProgram = (
  commands: Command[],
  initialRobot: RobotState,
  map: MapData,
  initialCollected: Iterable<string> = [],
): ExecutionResult => {
  const generator = runProgram(commands, initialRobot, map, initialCollected);
  let result = generator.next();
  while (!result.done) {
    result = generator.next();
  }
  return result.value;
};

export { commandLabel };