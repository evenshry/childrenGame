// 方向类型
export type Direction = "up" | "down" | "left" | "right";

// 指令类型
export type CommandType = 
  | "forward" | "left" | "right" 
  | "loop" | "if" | "repeatUntil"
  | "collect" | "wait" | "randomTurn";

// 条件类型
export type ConditionType = 
  | "frontBlocked" | "leftBlocked" | "rightBlocked" | "hasStar"
  | "nearGoal" | "edgeInFront";

// 单元格类型
export type CellType = "empty" | "robot" | "goal" | "wall" | "star" | "switch" | "key" | "bridge" | "door";

// 指令接口
export interface Command {
  id: string;
  type: CommandType;
  params?: {
    times?: number;
    condition?: ConditionType;
    seconds?: number;
    direction?: Direction;
    targetX?: number;
    targetY?: number;
  };
  children?: Command[];
  elseChildren?: Command[];
}

// 单元格接口
export interface Cell {
  x: number;
  y: number;
  type: CellType;
  dir?: Direction;
}

// 地图数据接口
export interface MapData {
  width: number;
  height: number;
  cells: Cell[];
  stars: Cell[];
}

// 关卡接口
export interface Level {
  id: string;
  name: string;
  map: MapData;
  minCommands: number;
  hint: string;
  demoProgram?: Command[];
}

// 调试步骤接口
export interface DebugStep {
  command: Command;
  index: number;
}

// 机器人状态接口
export interface RobotState {
  x: number;
  y: number;
  dir: Direction;
}

// 成就类型
export type AchievementType =
  | "first_program"
  | "complete_level_1"
  | "complete_level_5"
  | "complete_level_10"
  | "collect_all_stars"
  | "use_loop"
  | "use_condition"
  | "perfect_solution";

// 成就接口
export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
  icon: string;
  points?: number;
}

// 关卡星级评价
export interface LevelRating {
  levelId: string;
  stars: number; // 1-3
  completedAt: number;
  minCommands: number;
}

// 保存的程序接口
export interface SavedProgram {
  id: string;
  name: string;
  commands: Command[];
  levelId: string;
  createdAt: number;
  updatedAt: number;
}
