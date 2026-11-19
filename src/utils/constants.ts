import type { Level } from '@/types/global';
import { customLevelStorage } from './storage';
import { generateId } from './id';

export { generateId };

export const getAllLevels = (): Level[] => {
  const modifiedBuiltinLevels = customLevelStorage.getAllModifiedBuiltinLevels();
  const processedBuiltinLevels = levels.map(
    (level) => modifiedBuiltinLevels[level.id] || level,
  );
  return [...processedBuiltinLevels, ...customLevelStorage.getAll()];
};

export const getLevelById = (id: string): Level | undefined => {
  const modifiedLevel = customLevelStorage.getAllModifiedBuiltinLevels()[id];
  if (modifiedLevel) {
    return modifiedLevel;
  }
  return getAllLevels().find((l) => l.id === id);
};

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
    minCommands: 5,
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
    minCommands: 10,
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
    minCommands: 15,
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
        { x: 9, y: 9, type: "goal" },
        { x: 4, y: 0, type: "wall" },
        { x: 6, y: 2, type: "wall" },
        { x: 8, y: 4, type: "wall" },
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
        { x: 5, y: 5, type: "star" },
        { x: 8, y: 1, type: "star" },
        { x: 3, y: 1, type: "star" },
        { x: 4, y: 3, type: "star" },
        { x: 6, y: 7, type: "star" },
        { x: 7, y: 8, type: "star" },
        { x: 1, y: 6, type: "star" },
      ],
    },
    minCommands: 24,
    hint: "使用所有指令类型：前进、左转、右转、循环、如果、重复直到、等待、随机转向",
    demoProgram: [
      // (0,0)->(3,0) 收 (2,0)
      { id: "d1", type: "loop", params: { times: 3 }, children: [{ id: "d1f", type: "forward" }] },
      { id: "d2", type: "right" },
      // (3,0)->(3,1) 收 (3,1)，演示 collect
      { id: "d3", type: "forward" },
      { id: "d4", type: "collect" },
      { id: "d5", type: "left" },
      // (3,1)->(8,1) 收 (8,1)
      { id: "d6", type: "loop", params: { times: 5 }, children: [{ id: "d6f", type: "forward" }] },
      { id: "d7", type: "right" },
      { id: "d8", type: "right" },
      // (8,1)->(4,1)
      { id: "d9", type: "loop", params: { times: 4 }, children: [{ id: "d9f", type: "forward" }] },
      { id: "d10", type: "left" },
      // (4,1)->(4,6) 收 (4,2)(4,3)
      { id: "d11", type: "loop", params: { times: 5 }, children: [{ id: "d11f", type: "forward" }] },
      { id: "d12", type: "right" },
      // (4,6)->(1,6) 收 (1,6)
      { id: "d13", type: "loop", params: { times: 3 }, children: [{ id: "d13f", type: "forward" }] },
      { id: "d14", type: "right" },
      { id: "d15", type: "forward" },
      { id: "d16", type: "right" },
      // (1,5)->(5,5) 收 (5,5)
      { id: "d17", type: "loop", params: { times: 4 }, children: [{ id: "d17f", type: "forward" }] },
      // 演示 if：已收集星星则再执行一次 collect
      { id: "d18", type: "if", params: { condition: "hasStar" }, children: [{ id: "d18c", type: "collect" }] },
      { id: "d19", type: "right" },
      // (5,5)->(5,7)
      { id: "d20", type: "loop", params: { times: 2 }, children: [{ id: "d20f", type: "forward" }] },
      { id: "d21", type: "left" },
      // (5,7)->(7,7) 收 (6,7)
      { id: "d22", type: "loop", params: { times: 2 }, children: [{ id: "d22f", type: "forward" }] },
      // 演示 wait
      { id: "d23", type: "wait", params: { seconds: 1 } },
      { id: "d24", type: "right" },
      // (7,7)->(7,9) 收 (7,8)
      { id: "d25", type: "loop", params: { times: 2 }, children: [{ id: "d25f", type: "forward" }] },
      { id: "d26", type: "left" },
      // 演示 repeatUntil：靠近终点前持续前进，再补一步到终点
      { id: "d27", type: "repeatUntil", params: { condition: "nearGoal" }, children: [{ id: "d27f", type: "forward" }] },
      { id: "d28", type: "forward" },
      // 演示 randomTurn：已在终点，只改变朝向不影响通关
      { id: "d29", type: "randomTurn" },
    ],
  },
];

/** 自定义 / AI 生成关卡（非内置关卡） */
export const isCustomLevelId = (id: string): boolean =>
  id.startsWith('custom_') || id.startsWith('ai_');
