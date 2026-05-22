import { Command, Direction, MapData, Cell, RobotState } from '@/types/global';

export interface ExecutionResult {
  success: boolean;
  message: string;
  robot: RobotState;
  collectedStars: { x: number; y: number }[];
  steps: number;
}

export interface ExecutionContext {
  robot: RobotState;
  map: MapData;
  collectedStars: { x: number; y: number }[];
  commands: Command[];
  currentIndex: number;
  maxSteps: number;
  executionHistory: {
    robot: RobotState;
    collectedStars: { x: number; y: number }[];
  }[];
}

export class ExecutionEngine {
  private context: ExecutionContext | null = null;
  private abortController: AbortController | null = null;
  private stepDelay: number = 0;

  constructor(stepDelay: number = 0) {
    this.stepDelay = stepDelay;
  }

  public setStepDelay(delay: number) {
    this.stepDelay = delay;
  }

  public async execute(
    commands: Command[],
    initialRobot: RobotState,
    map: MapData,
    onStep?: (step: number, robot: RobotState) => void,
    onCollect?: (x: number, y: number) => void
  ): Promise<ExecutionResult> {
    this.abortController = new AbortController();

    this.context = {
      robot: { ...initialRobot },
      map,
      collectedStars: [],
      commands,
      currentIndex: 0,
      maxSteps: commands.length * 10,
      executionHistory: [],
    };

    const result = await this.executeCommands(
      commands,
      onStep,
      onCollect
    );

    return result;
  }

  private async executeCommands(
    commands: Command[],
    onStep?: (step: number, robot: RobotState) => void,
    onCollect?: (x: number, y: number) => void
  ): Promise<ExecutionResult> {
    if (!this.context) {
      return this.createErrorResult('Execution context not initialized');
    }

    for (let i = 0; i < commands.length; i++) {
      if (this.abortController?.signal.aborted) {
        return this.createErrorResult('Execution aborted');
      }

      const command = commands[i];
      this.context.currentIndex = i;

      const stepResult = await this.executeCommand(command, onCollect);

      if (!stepResult.success) {
        return {
          ...stepResult,
          steps: i + 1,
          robot: this.context.robot,
          collectedStars: this.context.collectedStars,
        };
      }

      if (onStep) {
        onStep(i + 1, { ...this.context.robot });
      }

      if (this.stepDelay > 0) {
        await this.delay(this.stepDelay);
      }

      if (i >= this.context.maxSteps) {
        return this.createErrorResult('Maximum steps exceeded');
      }
    }

    return this.createSuccessResult();
  }

  private async executeCommand(
    command: Command,
    onCollect?: (x: number, y: number) => void
  ): Promise<{ success: boolean; message: string }> {
    if (!this.context) {
      return { success: false, message: 'No execution context' };
    }

    switch (command.type) {
      case 'forward':
        return this.moveForward();
      case 'left':
        return this.turnLeft();
      case 'right':
        return this.turnRight();
      case 'loop':
        return this.executeLoop(command, onCollect);
      case 'if':
        return this.executeCondition(command, onCollect);
      case 'repeatUntil':
        return this.executeRepeatUntil(command, onCollect);
      case 'collect':
        return this.collectStar(onCollect);
      case 'wait':
        return { success: true, message: '等待指令' };
      case 'randomTurn':
        return this.randomTurn();
      default:
        return { success: true, message: 'Unknown command' };
    }
  }

  private moveForward(): { success: boolean; message: string } {
    if (!this.context) return { success: false, message: 'No context' };

    const { robot, map } = this.context;
    const { nextX, nextY } = this.getNextPosition(robot);

    if (!this.isValidPosition(nextX, nextY)) {
      return { success: false, message: '撞墙了！' };
    }

    const cell = map.cells.find((c) => c.x === nextX && c.y === nextY);
    if (cell?.type === 'wall') {
      return { success: false, message: '撞墙了！' };
    }

    robot.x = nextX;
    robot.y = nextY;

    return { success: true, message: '移动成功' };
  }

  private turnLeft(): { success: boolean; message: string } {
    if (!this.context) return { success: false, message: 'No context' };

    const { robot } = this.context;
    const directions: Direction[] = ['up', 'left', 'down', 'right'];
    const currentIndex = directions.indexOf(robot.dir);
    robot.dir = directions[(currentIndex + 1) % 4];

    return { success: true, message: '左转成功' };
  }

  private turnRight(): { success: boolean; message: string } {
    if (!this.context) return { success: false, message: 'No context' };

    const { robot } = this.context;
    const directions: Direction[] = ['up', 'left', 'down', 'right'];
    const currentIndex = directions.indexOf(robot.dir);
    robot.dir = directions[(currentIndex + 3) % 4];

    return { success: true, message: '右转成功' };
  }

  private randomTurn(): { success: boolean; message: string } {
    if (!this.context) return { success: false, message: 'No context' };

    const { robot } = this.context;
    const directions: Direction[] = ['up', 'left', 'down', 'right'];
    const randomIndex = Math.floor(Math.random() * directions.length);
    robot.dir = directions[randomIndex];

    return { success: true, message: '随机转向成功' };
  }

  private async executeLoop(
    command: Command,
    onCollect?: (x: number, y: number) => void
  ): Promise<{ success: boolean; message: string }> {
    if (!this.context || !command.children || !command.params?.times) {
      return { success: true, message: 'Loop executed' };
    }

    const times = Math.min(command.params.times, 10);

    for (let i = 0; i < times; i++) {
      if (this.abortController?.signal.aborted) {
        return { success: false, message: 'Loop aborted' };
      }

      const result = await this.executeCommands(command.children, undefined, onCollect);

      if (!result.success) {
        return result;
      }
    }

    return { success: true, message: '循环执行完成' };
  }

  private async executeCondition(
    command: Command,
    onCollect?: (x: number, y: number) => void
  ): Promise<{ success: boolean; message: string }> {
    if (!this.context || !command.children) {
      return { success: true, message: 'Condition evaluated' };
    }

    const shouldExecute = this.evaluateCondition(command.params?.condition as string);

    if (shouldExecute) {
      return await this.executeCommands(command.children, undefined, onCollect);
    }

    return { success: true, message: '条件不满足，跳过' };
  }

  private async executeRepeatUntil(
    command: Command,
    onCollect?: (x: number, y: number) => void
  ): Promise<{ success: boolean; message: string }> {
    if (!this.context || !command.children) {
      return { success: true, message: 'Repeat until executed' };
    }

    const maxIterations = 50;

    for (let i = 0; i < maxIterations; i++) {
      if (this.abortController?.signal.aborted) {
        return { success: false, message: 'Repeat until aborted' };
      }

      const result = await this.executeCommands(command.children, undefined, onCollect);

      if (!result.success) {
        return result;
      }

      if (this.evaluateCondition(command.params?.condition as string)) {
        return { success: true, message: '重复直到条件满足' };
      }
    }

    return { success: false, message: '重复次数过多' };
  }

  private collectStar(
    onCollect?: (x: number, y: number) => void
  ): { success: boolean; message: string } {
    if (!this.context) return { success: false, message: 'No context' };

    const { robot, map, collectedStars } = this.context;
    const star = map.stars.find(
      (s) => s.x === robot.x && s.y === robot.y &&
      !collectedStars.some(cs => cs.x === s.x && cs.y === s.y)
    );

    if (star) {
      collectedStars.push({ x: star.x, y: star.y });
      if (onCollect) {
        onCollect(star.x, star.y);
      }
      return { success: true, message: '收集星星！' };
    }

    return { success: false, message: '这里没有星星' };
  }

  private evaluateCondition(condition: string | undefined): boolean {
    if (!this.context || !condition) return true;

    const { robot, map, collectedStars } = this.context;

    switch (condition) {
      case 'atStar':
        return map.stars.some(
          (s) => s.x === robot.x && s.y === robot.y &&
          !collectedStars.some(cs => cs.x === s.x && cs.y === s.y)
        );
      case 'atGoal':
        return map.cells.some(
          (c) => c.type === 'goal' && c.x === robot.x && c.y === robot.y
        );
      case 'facingWall': {
        const { nextX, nextY } = this.getNextPosition(robot);
        return !this.isValidPosition(nextX, nextY) ||
          this.context!.map.cells.some((c) => c.type === 'wall' && c.x === nextX && c.y === nextY);
      }
      case 'allStarsCollected':
        return collectedStars.length >= map.stars.length;
      default:
        return true;
    }
  }

  private getNextPosition(
    robot: RobotState,
    distance: number = 1
  ): { nextX: number; nextY: number } {
    switch (robot.dir) {
      case 'up':
        return { nextX: robot.x, nextY: robot.y - distance };
      case 'down':
        return { nextX: robot.x, nextY: robot.y + distance };
      case 'left':
        return { nextX: robot.x - distance, nextY: robot.y };
      case 'right':
        return { nextX: robot.x + distance, nextY: robot.y };
      default:
        return { nextX: robot.x, nextY: robot.y };
    }
  }

  private isValidPosition(x: number, y: number): boolean {
    if (!this.context) return false;
    const { map } = this.context;
    return x >= 0 && x < map.width && y >= 0 && y < map.height;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createSuccessResult(): ExecutionResult {
    if (!this.context) {
      return {
        success: false,
        message: 'No context',
        robot: { x: 0, y: 0, dir: 'right' },
        collectedStars: [],
        steps: 0,
      };
    }

    const { robot, collectedStars } = this.context;
    const { map } = this.context;

    const atGoal = map.cells.some(
      (c) => c.type === 'goal' && c.x === robot.x && c.y === robot.y
    );
    const allStarsCollected = collectedStars.length >= map.stars.length;

    if (atGoal && allStarsCollected) {
      return {
        success: true,
        message: '恭喜过关！',
        robot,
        collectedStars,
        steps: this.context.commands.length,
      };
    } else if (!atGoal) {
      return {
        success: false,
        message: '没有到达终点',
        robot,
        collectedStars,
        steps: this.context.commands.length,
      };
    } else {
      return {
        success: false,
        message: '还有星星没有收集',
        robot,
        collectedStars,
        steps: this.context.commands.length,
      };
    }
  }

  private createErrorResult(message: string): ExecutionResult {
    if (!this.context) {
      return {
        success: false,
        message,
        robot: { x: 0, y: 0, dir: 'right' },
        collectedStars: [],
        steps: 0,
      };
    }

    return {
      success: false,
      message,
      robot: this.context.robot,
      collectedStars: this.context.collectedStars,
      steps: this.context.currentIndex,
    };
  }

  public abort() {
    this.abortController?.abort();
  }

  public reset() {
    this.abort();
    this.context = null;
    this.abortController = null;
  }
}

export const createExecutionEngine = (stepDelay: number = 0): ExecutionEngine => {
  return new ExecutionEngine(stepDelay);
};
