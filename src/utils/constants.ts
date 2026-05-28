import { Level, Command } from "@/types/global";
import { customLevelStorage } from "./storage";

export const generateId = () => `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const getAllLevels = (): Level[] => {
  const processedBuiltinLevels = levels.map((level) => {
    const modifiedLevel = customLevelStorage.getModifiedBuiltinLevel?.(level.id);
    return modifiedLevel || level;
  });
  return [...processedBuiltinLevels, ...customLevelStorage.getAll()];
};

export const getLevelById = (id: string): Level | undefined => {
  const modifiedLevel = customLevelStorage.getModifiedBuiltinLevel?.(id);
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
    minCommands: 25,
    hint: "使用所有指令类型：前进、左转、右转、循环、如果、重复直到、等待、随机转向",
    demoProgram: [
      // ====== 1. (0,0) -> (2,0) 收集星星 ======
      { id: "s1_f1", type: "forward" },
      { id: "s1_f2", type: "forward" },
      { id: "s1_c", type: "collect" },
      
      // ====== 2. (2,0) -> (3,1) 收集星星 ======
      { id: "s2_f1", type: "forward" },
      { id: "s2_r", type: "right" },
      { id: "s2_f2", type: "forward" },
      { id: "s2_c", type: "collect" },
      
      // ====== 3. (3,1) -> (4,2) 收集星星 ======
      { id: "s3_f1", type: "forward" },
      { id: "s3_l", type: "left" },
      { id: "s3_f2", type: "forward" },
      { id: "s3_c", type: "collect" },
      
      // ====== 4. (4,2) -> (4,3) 收集星星 ======
      { id: "s4_r", type: "right" },
      { id: "s4_f", type: "forward" },
      { id: "s4_c", type: "collect" },
      
      // ====== 5. (4,3) -> (5,5) 收集星星 ======
      { id: "s5_f1", type: "forward" },
      { id: "s5_r", type: "right" },
      { id: "s5_f2", type: "forward" },
      { id: "s5_l", type: "left" },
      { id: "s5_f3", type: "forward" },
      { id: "s5_c", type: "collect" },
      
      // ====== 6. (5,5) -> (5,8) -> (7,8) 收集星星 ======
      { id: "s6_r", type: "right" },
      { id: "s6_loop1", type: "loop", params: { times: 3 }, children: [
        { id: "s6_f1", type: "forward" },
      ]},
      { id: "s6_l", type: "left" },
      { id: "s6_loop2", type: "loop", params: { times: 2 }, children: [
        { id: "s6_f2", type: "forward" },
      ]},
      { id: "s6_c", type: "collect" },
      
      // ====== 7. (7,8) -> (6,7) 收集星星 ======
      { id: "s7_l", type: "left" },
      { id: "s7_f1", type: "forward" },
      { id: "s7_r", type: "right" },
      { id: "s7_f2", type: "forward" },
      { id: "s7_c", type: "collect" },
      
      // ====== 8. (6,7) -> (1,7) -> (1,6) 收集星星 ======
      { id: "s8_l", type: "left" },
      { id: "s8_loop", type: "loop", params: { times: 5 }, children: [
        { id: "s8_f1", type: "forward" },
      ]},
      { id: "s8_l2", type: "left" },
      { id: "s8_f2", type: "forward" },
      { id: "s8_c", type: "collect" },
      
      // ====== 9. (1,6) -> (1,1) -> (8,1) 收集星星 ======
      { id: "s9_r", type: "right" },
      { id: "s9_loop1", type: "loop", params: { times: 5 }, children: [
        { id: "s9_f1", type: "forward" },
      ]},
      { id: "s9_r2", type: "right" },
      { id: "s9_loop2", type: "loop", params: { times: 7 }, children: [
        { id: "s9_f2", type: "forward" },
      ]},
      { id: "s9_c", type: "collect" },
      
      // ====== 10. (8,1) -> (9,9) 到达终点 ======
      { id: "s10_r", type: "right" },
      { id: "s10_f1", type: "forward" },
      { id: "s10_r2", type: "right" },
      { id: "s10_loop", type: "loop", params: { times: 8 }, children: [
        { id: "s10_f2", type: "forward" },
      ]},
      
      // ====== 复杂指令演示 ======
      { id: "demo_if", type: "if", params: { condition: "hasStar" }, children: [
        { id: "demo_collect", type: "collect" },
      ]},
      { id: "demo_wait", type: "wait", params: { seconds: 1 } },
      { id: "demo_repeat", type: "repeatUntil", params: { condition: "nearGoal" }, children: [
        { id: "demo_f", type: "forward" },
      ]},
      { id: "demo_rand", type: "randomTurn" },
    ],
  },
];
