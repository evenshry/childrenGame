import { Level, Command } from "@/types/global";
import { customLevelStorage } from "./storage";

// 生成唯一ID的辅助函数
export const generateId = () => `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getAllLevels = (): Level[] => {
  // 对于内置关卡，优先使用修改过的版本
  const processedBuiltinLevels = levels.map((level) => {
    const modifiedLevel = customLevelStorage.getModifiedBuiltinLevel?.(level.id);
    return modifiedLevel || level;
  });
  return [...processedBuiltinLevels, ...customLevelStorage.getAll()];
};

export const getLevelById = (id: string): Level | undefined => {
  // 先检查是否是修改过的内置关卡
  const modifiedLevel = customLevelStorage.getModifiedBuiltinLevel?.(id);
  if (modifiedLevel) {
    return modifiedLevel;
  }
  return getAllLevels().find((l) => l.id === id);
};

// 为指令演示关卡创建演示程序
export const demoProgram: Command[] = [
  // 阶段1：收集第一个星星 (2,0) - 从 (0,0) 出发
  { id: generateId(), type: "forward" }, // (1,0)
  { id: generateId(), type: "forward" }, // (2,0)
  { id: generateId(), type: "collect" },

  // 阶段2：从 (2,0) 到 (4,2)
  { id: generateId(), type: "forward" }, // (3,0)
  { id: generateId(), type: "right" }, // 方向变成 down
  { id: generateId(), type: "forward" }, // (3,1)
  { id: generateId(), type: "forward" }, // (3,2)
  { id: generateId(), type: "left" }, // 方向变成 right
  { id: generateId(), type: "forward" }, // (4,2)
  { id: generateId(), type: "collect" },

  // 阶段3：从 (4,2) 到 (6,4)
  { id: generateId(), type: "forward" }, // (5,2)
  { id: generateId(), type: "right" }, // 方向变成 down
  { id: generateId(), type: "forward" }, // (5,3)
  { id: generateId(), type: "forward" }, // (5,4)
  { id: generateId(), type: "left" }, // 方向变成 right
  { id: generateId(), type: "forward" }, // (6,4)
  { id: generateId(), type: "collect" },

  // 阶段4：从 (6,4) 到 (8,6)
  { id: generateId(), type: "forward" }, // (7,4)
  { id: generateId(), type: "right" }, // 方向变成 down
  { id: generateId(), type: "forward" }, // (7,5)
  { id: generateId(), type: "forward" }, // (7,6)
  { id: generateId(), type: "left" }, // 方向变成 right
  { id: generateId(), type: "forward" }, // (8,6)
  { id: generateId(), type: "collect" },

  // 阶段5：从 (8,6) 到 (9,9)
  { id: generateId(), type: "right" }, // 方向变成 down
  { id: generateId(), type: "forward" }, // (8,7)
  { id: generateId(), type: "forward" }, // (8,8)
  { id: generateId(), type: "forward" }, // (8,9)
  { id: generateId(), type: "left" }, // 方向变成 right
  { id: generateId(), type: "forward" }, // (9,9)
];

// 官方关卡数据
export const levels: Level[] = [
  {
    id: "level_01",
    name: "初来乍到",
    map: {
      width: 6,
      height: 6,
      cells: [
        { x: 0, y: 0, type: "robot", dir: "right" },
        { x: 5, y: 5, type: "goal" },
        { x: 4, y: 0, type: "wall" },
        { x: 4, y: 2, type: "wall" },
        { x: 4, y: 1, type: "wall" },
        { x: 4, y: 3, type: "wall" },
      ],
      stars: [{ x: 3, y: 2, type: "star" }],
    },
    minCommands: 4,
    hint: "试着用前进和右转走到终点。",
  },
  {
    id: "level_02",
    name: "障碍挑战",
    map: {
      width: 6,
      height: 6,
      cells: [
        { x: 0, y: 0, type: "robot", dir: "right" },
        { x: 5, y: 5, type: "goal" },
        { x: 2, y: 2, type: "wall" },
        { x: 3, y: 3, type: "wall" },
      ],
      stars: [
        { x: 4, y: 1, type: "star" },
        { x: 1, y: 3, type: "star" },
        { x: 2, y: 1, type: "star" },
      ],
    },
    minCommands: 6,
    hint: "避开障碍物，找到通往终点的路。",
  },
  {
    id: "level_03",
    name: "循环练习",
    map: {
      width: 8,
      height: 8,
      cells: [
        { x: 0, y: 0, type: "robot", dir: "right" },
        { x: 7, y: 7, type: "goal" },
      ],
      stars: [
        { x: 3, y: 3, type: "star" },
        { x: 5, y: 5, type: "star" },
        { x: 1, y: 1, type: "star" },
        { x: 2, y: 5, type: "star" },
        { x: 1, y: 5, type: "star" },
        { x: 6, y: 1, type: "star" },
        { x: 4, y: 1, type: "star" },
      ],
    },
    minCommands: 3,
    hint: "使用循环指令可以让代码更简洁。",
  },
  {
    id: "level_04",
    name: "指令演示",
    map: {
      width: 10,
      height: 10,
      cells: [
        { x: 0, y: 0, type: "robot", dir: "right" },
        { x: 2, y: 0, type: "star" },
        { x: 4, y: 0, type: "wall" },
        { x: 4, y: 2, type: "star" },
        { x: 6, y: 2, type: "wall" },
        { x: 6, y: 4, type: "star" },
        { x: 8, y: 4, type: "wall" },
        { x: 8, y: 6, type: "star" },
        { x: 9, y: 9, type: "goal" },
        { x: 3, y: 7, type: "wall" },
        { x: 2, y: 7, type: "wall" },
        { x: 6, y: 6, type: "wall" },
        { x: 7, y: 5, type: "wall" },
        { x: 3, y: 4, type: "wall" },
        { x: 2, y: 3, type: "wall" },
      ],
      stars: [
        { x: 2, y: 0, type: "star" },
        { x: 4, y: 2, type: "star" },
        { x: 6, y: 4, type: "star" },
        { x: 8, y: 6, type: "star" },
        { x: 3, y: 1, type: "star" },
        { x: 4, y: 3, type: "star" },
        { x: 5, y: 5, type: "star" },
        { x: 6, y: 7, type: "star" },
        { x: 7, y: 8, type: "star" },
        { x: 1, y: 6, type: "star" },
        { x: 8, y: 1, type: "star" },
      ],
    },
    minCommands: 15,
    hint: "使用所有指令类型：前进、左转、右转、循环、如果、重复直到、等待、随机转向",
    demoProgram: [
      { id: "cmd_1778743904711_9ygdrviac", type: "forward" },
      { id: "cmd_1778743904711_eprqon96s", type: "forward" },
      { id: "cmd_1778743904711_l3hpaingd", type: "collect" },
      { id: "cmd_1778743904711_izxvlu2r7", type: "forward" },
      { id: "cmd_1778743904711_9n0weaxw9", type: "right" },
      { id: "cmd_1778743904711_tr1al1bj8", type: "forward" },
      { id: "cmd_1778743904711_819gf9657", type: "forward" },
      { id: "cmd_1778743904711_lotib6ncr", type: "left" },
      { id: "cmd_1778743904711_cq1cirmtj", type: "forward" },
      { id: "cmd_1778743904711_7xviytb6s", type: "collect" },
      { id: "cmd_1778743904711_cbjy8wq0s", type: "forward" },
      { id: "cmd_1778743904711_69m8fhryw", type: "right" },
      { id: "cmd_1778743904711_5ino1q5hn", type: "forward" },
      { id: "cmd_1778743904711_6lmypz9yw", type: "forward" },
      { id: "cmd_1778743904711_2h2kmqam1", type: "left" },
      { id: "cmd_1778743904711_4mfppmv6i", type: "forward" },
      { id: "cmd_1778743904711_3emugax4p", type: "collect" },
      { id: "cmd_1778743904711_b3jexthdl", type: "forward" },
      { id: "cmd_1778743904711_maomxbkpl", type: "right" },
      { id: "cmd_1778743904711_24wfuw9p0", type: "forward" },
      { id: "cmd_1778743904711_83irsluvj", type: "forward" },
      { id: "cmd_1778743904711_29vd7bqjv", type: "left" },
      { id: "cmd_1778743904711_50q1ojyih", type: "forward" },
      { id: "cmd_1778743904711_bbzai37bd", type: "collect" },
      { id: "cmd_1778743904711_265stm1ui", type: "right" },
      { id: "cmd_1778743904711_yhsmwimm1", type: "forward" },
      { id: "cmd_1778743904711_szvlvuxr0", type: "forward" },
      { id: "cmd_1778743904711_brriq1r3d", type: "forward" },
      { id: "cmd_1778743904711_nswo8m5bq", type: "left" },
      { id: "cmd_1778743904711_ul765fn3l", type: "forward" },
    ],
  },
];
