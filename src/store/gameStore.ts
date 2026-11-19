import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Command, Level, MapData, RobotState } from '@/types/global';
import { levels, getAllLevels } from '@/utils/constants';
import { progressStorage } from '@/utils/storage';
import { cloneCommands, removeCommandFromTree } from '@/utils/commandTree';

interface CommandHistory {
  commands: Command[];
}

interface GameState {
  currentLevelIndex: number;
  currentLevelData: Level;
  currentMap: MapData;
  robot: RobotState;
  commands: Command[];
  collectedStars: { x: number; y: number }[];
  isDebugMode: boolean;
  isRunning: boolean;
  history: CommandHistory[];
  historyIndex: number;
  maxHistoryLength: number;
}

interface GameActions {
  setRobot: (robot: RobotState) => void;
  setCollectedStars: (stars: { x: number; y: number }[]) => void;
  setIsDebugMode: (isDebug: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  /** 提交指令并写入 undo 历史；所有用户编辑入口都应走这里 */
  commitCommands: (commands: Command[]) => void;
  addCommand: (command: Command) => void;
  removeCommand: (id: string) => void;
  clearCommands: () => void;
  saveToHistory: (commands: Command[]) => void;
  undo: () => Command[] | null;
  redo: () => Command[] | null;
  /** 把机器人 / 星星恢复到关卡初始状态（不清空程序） */
  resetPreview: () => void;
  /** 完整加载一关：地图、机器人、程序、星星、历史全部重置 */
  loadLevel: (level: Level) => void;
  nextLevel: () => void;
  prevLevel: () => void;
}

const getRobotFromLevel = (level: Level): RobotState => {
  const robotCell = level.map.cells.find((cell) => cell.type === 'robot');
  return robotCell
    ? { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || 'right' }
    : { x: 0, y: 0, dir: 'right' };
};

const getInitialLevel = (): Level => {
  const allLevels = getAllLevels();
  const savedIndex = progressStorage.getCurrentLevelIndex();
  const safeIndex = Math.min(Math.max(savedIndex, 0), allLevels.length - 1);
  return allLevels[safeIndex] || allLevels[0] || levels[0];
};

const initialLevel = getInitialLevel();

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
      currentLevelIndex: Math.max(
        0,
        getAllLevels().findIndex((level) => level.id === initialLevel.id),
      ),
      currentLevelData: initialLevel,
      currentMap: initialLevel.map,
      robot: getRobotFromLevel(initialLevel),
      commands: [],
      collectedStars: [],
      isDebugMode: false,
      isRunning: false,
      history: [{ commands: [] }],
      historyIndex: 0,
      maxHistoryLength: 50,

      setRobot: (robot) => set({ robot }),
      setCollectedStars: (stars) => set({ collectedStars: stars }),
      setIsDebugMode: (isDebug) => set({ isDebugMode: isDebug }),
      setIsRunning: (running) => set({ isRunning: running }),

      commitCommands: (commands) => {
        set({ commands });
        get().saveToHistory(commands);
      },

      addCommand: (command) => {
        const newCommands = [...get().commands, command];
        get().commitCommands(newCommands);
      },

      removeCommand: (id) => {
        const newCommands = removeCommandFromTree(get().commands, id);
        get().commitCommands(newCommands);
      },

      clearCommands: () => {
        set({
          commands: [],
          collectedStars: [],
          robot: getRobotFromLevel(get().currentLevelData),
        });
        get().saveToHistory([]);
      },

      /**
       * 统一管理 undo/redo 历史：
       *  - 截断 future 分支（historyIndex 之后的）
       *  - push 一条新记录
       *  - 超长时从头部丢弃，并同步修正 historyIndex
       */
      saveToHistory: (commands) => {
        const { history, historyIndex, maxHistoryLength } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ commands: cloneCommands(commands) });

        let newIndex = newHistory.length - 1;
        if (newHistory.length > maxHistoryLength) {
          const overflow = newHistory.length - maxHistoryLength;
          newHistory.splice(0, overflow);
          newIndex = maxHistoryLength - 1;
        }

        set({ history: newHistory, historyIndex: newIndex });
      },

      undo: () => {
        const { history, historyIndex, currentLevelData } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          set({
            historyIndex: newIndex,
            commands: cloneCommands(history[newIndex].commands),
            robot: getRobotFromLevel(currentLevelData),
            collectedStars: [],
          });
          return history[newIndex].commands;
        }
        return null;
      },

      redo: () => {
        const { history, historyIndex, currentLevelData } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          set({
            historyIndex: newIndex,
            commands: cloneCommands(history[newIndex].commands),
            robot: getRobotFromLevel(currentLevelData),
            collectedStars: [],
          });
          return history[newIndex].commands;
        }
        return null;
      },

      resetPreview: () => {
        const { currentLevelData } = get();
        set({
          robot: getRobotFromLevel(currentLevelData),
          collectedStars: [],
        });
      },

      loadLevel: (level) => {
        const allLevels = getAllLevels();
        const levelIndex = allLevels.findIndex((item) => item.id === level.id);
        const safeIndex = levelIndex >= 0 ? levelIndex : 0;

        progressStorage.setCurrentLevelIndex(safeIndex);
        set({
          currentLevelIndex: safeIndex,
          currentLevelData: level,
          currentMap: level.map,
          robot: getRobotFromLevel(level),
          commands: [],
          collectedStars: [],
          history: [{ commands: [] }],
          historyIndex: 0,
          isRunning: false,
        });
      },

      nextLevel: () => {
        const { currentLevelIndex } = get();
        const allLevels = getAllLevels();
        const nextLevel = allLevels[currentLevelIndex + 1];
        if (nextLevel) get().loadLevel(nextLevel);
      },

      prevLevel: () => {
        const { currentLevelIndex } = get();
        const allLevels = getAllLevels();
        const prevLevel = allLevels[currentLevelIndex - 1];
        if (prevLevel) get().loadLevel(prevLevel);
      },
    }),
  ),
);