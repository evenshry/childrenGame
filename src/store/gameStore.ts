import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Command, Level, MapData, RobotState } from '@/types/global';
import { levels, getAllLevels } from '@/utils/constants';
import { progressStorage } from '@/utils/storage';

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
  isLevelEditor: boolean;
  isRunning: boolean;
  isDebugging: boolean;
  history: CommandHistory[];
  historyIndex: number;
  maxHistoryLength: number;
}

interface GameActions {
  setCurrentLevelIndex: (index: number) => void;
  setCurrentLevelData: (level: Level) => void;
  setCurrentMap: (map: MapData) => void;
  setRobot: (robot: RobotState) => void;
  setCommands: (commands: Command[]) => void;
  setCollectedStars: (stars: { x: number; y: number }[]) => void;
  setIsDebugMode: (isDebug: boolean) => void;
  setIsLevelEditor: (isEditor: boolean) => void;
  setIsRunning: (isRunning: boolean) => void;
  setIsDebugging: (isDebugging: boolean) => void;
  addCommand: (command: Command) => void;
  removeCommand: (id: string) => void;
  clearCommands: () => void;
  saveToHistory: (commands: Command[]) => void;
  undo: () => Command[] | null;
  redo: () => Command[] | null;
  resetLevel: () => void;
  nextLevel: () => void;
  prevLevel: () => void;
}

const initialRobot: RobotState = {
  x: 0,
  y: 0,
  dir: 'right',
};

const getInitialLevel = (): Level => {
  const allLevels = getAllLevels();
  const savedIndex = progressStorage.getCurrentLevelIndex();
  const safeIndex = Math.min(savedIndex, allLevels.length - 1);
  return allLevels[safeIndex] || allLevels[0] || levels[0];
};

const initialLevel = getInitialLevel();

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
      currentLevelIndex: progressStorage.getCurrentLevelIndex(),
      currentLevelData: initialLevel,
      currentMap: initialLevel.map,
      robot: initialRobot,
      commands: [],
      collectedStars: [],
      isDebugMode: false,
      isLevelEditor: false,
      isRunning: false,
      isDebugging: false,
      history: [],
      historyIndex: -1,
      maxHistoryLength: 50,

      setCurrentLevelIndex: (index) => {
        progressStorage.setCurrentLevelIndex(index);
        set({ currentLevelIndex: index });
      },
      setCurrentLevelData: (level) => set({ currentLevelData: level }),
      setCurrentMap: (map) => set({ currentMap: map }),
      setRobot: (robot) => set({ robot }),
      setCommands: (commands) => set({ commands }),
      setCollectedStars: (stars) => set({ collectedStars: stars }),
      setIsDebugMode: (isDebug) => set({ isDebugMode: isDebug }),
      setIsLevelEditor: (isEditor) => set({ isLevelEditor: isEditor }),
      setIsRunning: (running) => set({ isRunning: running }),
      setIsDebugging: (debugging) => set({ isDebugging: debugging }),

      addCommand: (command) => {
        const { commands } = get();
        const newCommands = [...commands, command];
        set({ commands: newCommands });
        get().saveToHistory(newCommands);
      },

      removeCommand: (id) => {
        const removeFromList = (cmds: Command[]): Command[] => {
          return cmds.filter((cmd) => {
            if (cmd.id === id) return false;
            if (cmd.children) {
              cmd.children = removeFromList(cmd.children);
            }
            return true;
          });
        };
        const newCommands = removeFromList(get().commands);
        set({ commands: newCommands });
        get().saveToHistory(newCommands);
      },

      clearCommands: () => {
        set({ commands: [], collectedStars: [], robot: initialRobot });
        get().saveToHistory([]);
      },

      saveToHistory: (commands) => {
        const { history, historyIndex, maxHistoryLength } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ commands: JSON.parse(JSON.stringify(commands)) });

        if (newHistory.length > maxHistoryLength) {
          newHistory.shift();
        } else {
          set({ historyIndex: historyIndex + 1 });
        }

        set({ history: newHistory });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= 0) {
          const newIndex = historyIndex - 1;
          set({ historyIndex: newIndex, commands: JSON.parse(JSON.stringify(history[newIndex].commands)) });
          return history[newIndex].commands;
        }
        return null;
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          set({ historyIndex: newIndex, commands: JSON.parse(JSON.stringify(history[newIndex].commands)) });
          return history[newIndex].commands;
        }
        return null;
      },

      resetLevel: () => {
        const { currentLevelData } = get();
        const robotCell = currentLevelData.map.cells.find((cell) => cell.type === 'robot');
        const robot = robotCell
          ? { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || 'right' }
          : initialRobot;

        set({
          robot,
          commands: [],
          collectedStars: [],
          history: [],
          historyIndex: -1,
        });
      },

      nextLevel: () => {
        const { currentLevelIndex } = get();
        const allLevels = getAllLevels();
        if (currentLevelIndex < allLevels.length - 1) {
          const nextIndex = currentLevelIndex + 1;
          const nextLevel = allLevels[nextIndex];
          const robotCell = nextLevel.map.cells.find((cell) => cell.type === 'robot');
          const robot = robotCell
            ? { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || 'right' }
            : initialRobot;

          progressStorage.setCurrentLevelIndex(nextIndex);
          set({
            currentLevelIndex: nextIndex,
            currentLevelData: nextLevel,
            currentMap: nextLevel.map,
            robot,
            commands: [],
            collectedStars: [],
            history: [],
            historyIndex: -1,
          });
        }
      },

      prevLevel: () => {
        const { currentLevelIndex } = get();
        if (currentLevelIndex > 0) {
          const prevIndex = currentLevelIndex - 1;
          const allLevels = getAllLevels();
          const prevLevel = allLevels[prevIndex];
          const robotCell = prevLevel.map.cells.find((cell) => cell.type === 'robot');
          const robot = robotCell
            ? { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || 'right' }
            : initialRobot;

          progressStorage.setCurrentLevelIndex(prevIndex);
          set({
            currentLevelIndex: prevIndex,
            currentLevelData: prevLevel,
            currentMap: prevLevel.map,
            robot,
            commands: [],
            collectedStars: [],
            history: [],
            historyIndex: -1,
          });
        }
      },
    })
  )
);
