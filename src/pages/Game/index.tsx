import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import CommandPanel from "@/components/CommandPanel";
import CommandsContainer from "@/components/CommandsContainer";
import GameCanvas from "@/components/GameCanvas";
import LogPanel from "@/components/LogPanel";
import Notification from "@/components/Notification";
import HintSystem, { generateHints } from "@/components/HintSystem";
import { useGameStore } from "@/store";
import { levels, generateId, getAllLevels } from "@/utils/constants";
import { executeCommand, flattenCommands, getDirectionLabel, getCommandLabel, isValidPosition } from "@/utils/gameEngine";
import { playClickSound, playSuccessSound, playLevelUpSound } from "@/utils/animations";
import { checkAchievements, achievementDefinitions } from "@/utils/achievements";
import { progressStorage, statsStorage, achievementStorage, programStorage } from "@/utils/storage";
import type { Command, RobotState, DebugStep, Direction, Achievement, SavedProgram, ConditionType } from "@/types/global";
import styles from "./index.module.scss";

const deepCopyCommands = (cmds: Command[]): Command[] => {
  return cmds.map((cmd) => ({
    ...cmd,
    children: cmd.children ? deepCopyCommands(cmd.children) : undefined,
  }));
};

const Game: React.FC = () => {
  const {
    currentLevelIndex,
    currentLevelData,
    currentMap,
    robot,
    commands,
    collectedStars,
    isDebugMode,
    isRunning,
    history,
    historyIndex,
    setCurrentLevelIndex,
    setCurrentLevelData,
    setCurrentMap,
    setRobot,
    setCommands,
    setCollectedStars,
    setIsDebugMode,
    setIsRunning,
    addCommand,
    removeCommand,
    clearCommands,
    undo,
    redo,
    nextLevel,
    prevLevel,
  } = useGameStore();

  const [isDebugging, setIsDebugging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [breakpoints, setBreakpoints] = useState<string[]>([]);
  const [debugRobot, setDebugRobot] = useState<RobotState>(robot);
  const [debugCollectedStars, setDebugCollectedStars] = useState(0);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [debugSpeed, setDebugSpeed] = useState(500);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" | "warning" } | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<{ robot: RobotState; collectedStars: { x: number; y: number }[] }[]>([]);
  const [allLevelsCount, setAllLevelsCount] = useState(getAllLevels().length);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAchievementNotification, setShowAchievementNotification] = useState<Achievement | null>(null);
  const [levelHint, setLevelHint] = useState<string>("");
  
  // 程序保存/加载相关状态
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [programName, setProgramName] = useState("");
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAllLevelsCount(getAllLevels().length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadSavedPrograms();
  }, [currentLevelData.id]);

  const loadSavedPrograms = useCallback(() => {
    const programs = programStorage.getByLevel(currentLevelData.id);
    setSavedPrograms(programs);
  }, [currentLevelData.id]);

  const handleSaveProgram = useCallback(() => {
    if (commands.length === 0) {
      setNotification({ message: "请先添加指令", type: "warning" });
      return;
    }
    
    if (!programName.trim()) {
      setNotification({ message: "请输入程序名称", type: "warning" });
      return;
    }

    const program: SavedProgram = {
      id: `program_${Date.now()}`,
      name: programName.trim(),
      commands: deepCopyCommands(commands),
      levelId: currentLevelData.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    programStorage.save(program);
    setShowSaveDialog(false);
    setProgramName("");
    loadSavedPrograms();
    setNotification({ message: "程序保存成功！", type: "success" });
  }, [commands, programName, currentLevelData.id, loadSavedPrograms]);

  const handleLoadProgram = useCallback((program: SavedProgram) => {
    setCommands(deepCopyCommands(program.commands));
    setShowLoadDialog(false);
    setNotification({ message: `已加载程序: ${program.name}`, type: "success" });
  }, [setCommands]);

  const handleDeleteProgram = useCallback((programId: string) => {
    programStorage.delete(programId);
    loadSavedPrograms();
    setNotification({ message: "程序已删除", type: "info" });
  }, [loadSavedPrograms]);

  useEffect(() => {
    const levelIdParam = searchParams.get("level");
    const allCurrentLevels = getAllLevels();

    let level;
    if (levelIdParam) {
      level = allCurrentLevels.find(
        (l) => l.id === levelIdParam || l.id === `level_0${levelIdParam}` || l.id === `level_${levelIdParam.padStart(2, "0")}`,
      );
    }

    if (!level) {
      level = allCurrentLevels[0] || levels[0];
    }

    const levelIndex = allCurrentLevels.findIndex((l) => l.id === level.id);
    setCurrentLevelIndex(levelIndex !== -1 ? levelIndex : 0);
    setCurrentLevelData(level);
    setCurrentMap(level.map);

    const robotCell = level.map.cells.find((cell) => cell.type === "robot");
    if (robotCell) {
      const newRobot = { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || "right" };
      setRobot(newRobot);
      setDebugRobot(newRobot);
    }

    setShowDemoPrompt(!!level.demoProgram && commands.length === 0);
  }, [searchParams]);

  useEffect(() => {
    const allCurrentLevels = getAllLevels();
    const level = allCurrentLevels[currentLevelIndex];
    if (level) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set("level", level.id);
      navigate(`?${searchParams.toString()}`, { replace: true });
    }
  }, [currentLevelIndex, location.search, navigate]);

  const handleUndo = useCallback(() => {
    const result = undo();
    if (result) {
      setNotification({ message: "已撤销", type: "info" });
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const result = redo();
    if (result) {
      setNotification({ message: "已重做", type: "info" });
    }
  }, [redo]);

  const loadDemoProgram = useCallback(() => {
    if (currentLevelData.demoProgram) {
      const deepClonedDemo = currentLevelData.demoProgram.map((cmd) => ({
        ...cmd,
        id: generateId(),
        children: cmd.children?.map((child) => ({ ...child, id: generateId() })),
      }));

      setCommands(deepClonedDemo);
      setShowDemoPrompt(false);
      setNotification({ message: "已加载演示程序！包含所有指令类型的使用示例。", type: "success" });
    }
  }, [currentLevelData, setCommands]);

  const handleAddCommand = useCallback(
    (command: Command) => {
      const newCommand = {
        ...command,
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        children: command.children ? [...command.children] : undefined,
      };
      addCommand(newCommand);

      const currentRobotState = { ...robot };
      const currentCollectedStars = [...collectedStars];

      const result = executeCommand(newCommand, currentRobotState, currentMap, 0);
      const { success, robot: updatedRobot, message } = result;

      if (success) {
        setExecutionHistory([...executionHistory, { robot: currentRobotState, collectedStars: currentCollectedStars }]);

        const startRobot = { ...currentRobotState };
        const animateRobot = (targetRobot: typeof updatedRobot, step = 0) => {
          if (step < 10) {
            const progress = step / 10;
            const newX = startRobot.x + (targetRobot.x - startRobot.x) * progress;
            const newY = startRobot.y + (targetRobot.y - startRobot.y) * progress;
            setRobot({ x: newX, y: newY, dir: targetRobot.dir });
            setTimeout(() => animateRobot(targetRobot, step + 1), 50);
          } else {
            setRobot(updatedRobot);
          }
        };

        animateRobot(updatedRobot);
      } else {
        setNotification({ message, type: "error" });
      }
    },
    [robot, collectedStars, currentMap, addCommand, setRobot, executionHistory],
  );

  const handleRemoveCommand = useCallback(
    (id: string) => {
      removeCommand(id);

      if (executionHistory.length > 0) {
        const lastExecution = executionHistory[executionHistory.length - 1];
        setExecutionHistory(executionHistory.slice(0, -1));
        setRobot(lastExecution.robot);
        setCollectedStars(lastExecution.collectedStars);
      } else {
        const initialRobot = {
          x: currentMap.cells.find((cell) => cell.type === "robot")?.x || 0,
          y: currentMap.cells.find((cell) => cell.type === "robot")?.y || 0,
          dir: currentMap.cells.find((cell) => cell.type === "robot")?.dir || "right",
        };
        setRobot(initialRobot);
        setCollectedStars([]);
      }
    },
    [removeCommand, executionHistory, setRobot, setCollectedStars, currentMap],
  );

  const handleAddChild = useCallback(
    (parentId: string, childCommand: Command, branch: 'children' | 'elseChildren' = 'children') => {
      let found = false;
      
      const addChildCommand = (cmds: Command[]): Command[] => {
        return cmds.map((cmd) => {
          if (cmd.id === parentId) {
            found = true;
            const newChild: Command = {
              ...childCommand,
              id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              children: childCommand.children ? [...childCommand.children] : undefined,
            };
            if (branch === 'children') {
              console.log('✅ handleAddChild:', {
                parentType: cmd.type,
                childType: childCommand.type,
                branch,
              });
              return { ...cmd, children: [...(cmd.children || []), newChild] };
            } else {
              console.log('✅ handleAddChild:', {
                parentType: cmd.type,
                childType: childCommand.type,
                branch,
              });
              return { ...cmd, elseChildren: [...(cmd.elseChildren || []), newChild] };
            }
          }
          if (cmd.children) {
            const updated = addChildCommand(cmd.children);
            if (updated !== cmd.children) {
              return { ...cmd, children: updated };
            }
          }
          if (cmd.elseChildren) {
            const updated = addChildCommand(cmd.elseChildren);
            if (updated !== cmd.elseChildren) {
              return { ...cmd, elseChildren: updated };
            }
          }
          return cmd;
        });
      };
      
      const newCommands = addChildCommand(commands);
      
      if (!found) {
        console.warn('❌ handleAddChild: Parent not found', parentId);
      }
      
      setCommands(newCommands);
    },
    [commands, setCommands],
  );

  const handleUpdateCommand = useCallback(
    (id: string, updates: Partial<Command>) => {
      const updateCommand = (cmds: Command[]): Command[] => {
        return cmds.map((cmd) => {
          if (cmd.id === id) {
            return { ...cmd, ...updates };
          }
          if (cmd.children) {
            return { ...cmd, children: updateCommand(cmd.children) };
          }
          return cmd;
        });
      };
      const newCommands = updateCommand(commands);
      setCommands(newCommands);
    },
    [commands, setCommands],
  );

  const handleCopyCommand = useCallback(
    (command: Command) => {
      const copyCommand = (cmd: Command): Command => {
        const newCmd = { ...cmd, id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        if (cmd.children) {
          newCmd.children = cmd.children.map(copyCommand);
        }
        return newCmd;
      };
      const newCommand = copyCommand(command);
      setCommands([...commands, newCommand]);
      setNotification({ message: "已复制指令", type: "success" });
    },
    [commands, setCommands],
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      const moveCommand = (cmds: Command[]): Command[] => {
        const index = cmds.findIndex((cmd) => cmd.id === id);
        if (index > 0) {
          const newCmds = [...cmds];
          [newCmds[index - 1], newCmds[index]] = [newCmds[index], newCmds[index - 1]];
          return newCmds;
        }
        return cmds.map((cmd) => (cmd.children ? { ...cmd, children: moveCommand(cmd.children) } : cmd));
      };
      const newCommands = moveCommand(commands);
      setCommands(newCommands);
    },
    [commands, setCommands],
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      const moveCommand = (cmds: Command[]): Command[] => {
        const index = cmds.findIndex((cmd) => cmd.id === id);
        if (index >= 0 && index < cmds.length - 1) {
          const newCmds = [...cmds];
          [newCmds[index], newCmds[index + 1]] = [newCmds[index + 1], newCmds[index]];
          return newCmds;
        }
        return cmds.map((cmd) => (cmd.children ? { ...cmd, children: moveCommand(cmd.children) } : cmd));
      };
      const newCommands = moveCommand(commands);
      setCommands(newCommands);
    },
    [commands, setCommands],
  );

  const handleDropBefore = useCallback(
    (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => {
      const newCommand = draggedItem.isFromPanel
        ? { ...draggedItem.command, id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
        : draggedItem.command;

      const moveAndInsert = (cmds: Command[]): Command[] => {
        const removeById = (list: Command[]): Command[] => {
          return list.filter((cmd) => {
            if (cmd.id === draggedItem.command.id) return false;
            if (cmd.children) {
              cmd.children = removeById(cmd.children);
            }
            return true;
          });
        };

        const withoutDragged = removeById(cmds);
        const insertAtIndex = (list: Command[], targetIndex: number, item: Command): Command[] => {
          const result: Command[] = [];
          let inserted = false;
          let currentIndex = 0;

          for (const cmd of list) {
            if (currentIndex === targetIndex && !inserted) {
              result.push(item);
              inserted = true;
            }
            result.push(cmd.children ? { ...cmd, children: insertAtIndex(cmd.children, targetIndex, item) } : cmd);
            currentIndex++;
          }

          if (!inserted && currentIndex === targetIndex) {
            result.push(item);
          }

          return result;
        };

        return insertAtIndex(withoutDragged, index, newCommand);
      };

      const newCommands = moveAndInsert(commands);
      setCommands(newCommands);
    },
    [commands, setCommands],
  );

  const handleDropAfter = useCallback(
    (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => {
      handleDropBefore(index + 1, draggedItem);
    },
    [handleDropBefore],
  );

  const handleStartDebug = useCallback(() => {
    const robotCell = currentMap.cells.find((cell) => cell.type === "robot");
    if (robotCell) {
      setDebugRobot({ x: robotCell.x, y: robotCell.y, dir: robotCell.dir || "right" });
    }
    setDebugCollectedStars(0);
    setCurrentStep(0);
    setExecutionLog([]);
    setDebugSteps(flattenCommands(commands));
    setIsDebugging(true);
  }, [currentMap, commands, setDebugRobot]);

  const handleStepDebug = useCallback(() => {
    if (!isDebugging || currentStep >= debugSteps.length) return;

    const currentDebugStep = debugSteps[currentStep];
    const cmd = currentDebugStep.command;

    if (breakpoints.includes(cmd.id)) {
      setExecutionLog([...executionLog, `断点: ${getCommandLabel(cmd)}`]);
      return;
    }

    const result = executeCommand(cmd, debugRobot, currentMap, debugCollectedStars);
    const { success, robot: updatedRobot, collectedStars: updatedCollectedStars, message } = result;

    if (updatedRobot.x !== debugRobot.x || updatedRobot.y !== debugRobot.y) {
      setDebugRobot(updatedRobot);
    }
    if (updatedCollectedStars !== debugCollectedStars) {
      setDebugCollectedStars(updatedCollectedStars);
    }

    setExecutionLog([...executionLog, `第${currentStep + 1}步: ${getCommandLabel(cmd)} → ${message}`]);

    if (!success) {
      setIsDebugging(false);
      setNotification({ message, type: "error" });
      return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep >= debugSteps.length) {
      setIsDebugging(false);
      const atGoal = currentMap.cells.some((cell) => cell.type === "goal" && cell.x === updatedRobot.x && cell.y === updatedRobot.y);
      const allStarsCollected = updatedCollectedStars >= currentMap.stars.length;

      if (atGoal && allStarsCollected) {
        setExecutionLog([...executionLog, "恭喜你过关了！"]);
        setNotification({ message: "恭喜你过关了！", type: "success" });
      } else if (!atGoal) {
        setExecutionLog([...executionLog, "机器人没有到达终点！"]);
        setNotification({ message: "机器人没有到达终点！", type: "error" });
      } else if (updatedCollectedStars < currentMap.stars.length) {
        setExecutionLog([...executionLog, "还有星星没有收集！"]);
        setNotification({ message: "还有星星没有收集！", type: "error" });
      }
    }
  }, [isDebugging, currentStep, debugSteps, breakpoints, debugRobot, currentMap, debugCollectedStars, executionLog]);

  const handleContinueDebug = useCallback(() => {
    const autoStep = () => {
      if (!isDebugging || currentStep >= debugSteps.length) return;
      const currentDebugStep = debugSteps[currentStep];
      if (breakpoints.includes(currentDebugStep.command.id)) return;
      handleStepDebug();
      setTimeout(autoStep, debugSpeed);
    };
    autoStep();
  }, [isDebugging, currentStep, debugSteps, breakpoints, handleStepDebug, debugSpeed]);

  const handleStopDebug = useCallback(() => {
    setIsDebugging(false);
    setCurrentStep(0);
    setExecutionLog([]);
  }, []);

  const handleToggleBreakpoint = useCallback(
    (commandId: string) => {
      if (breakpoints.includes(commandId)) {
        setBreakpoints(breakpoints.filter((id) => id !== commandId));
      } else {
        setBreakpoints([...breakpoints, commandId]);
      }
    },
    [breakpoints],
  );

  const handleLevelComplete = useCallback((starsCollected: number, commandsUsed: number) => {
    playLevelUpSound();
    
    const level = currentLevelData;
    
    progressStorage.completeLevel(level.id, starsCollected, commandsUsed);
    
    const isPerfect = starsCollected >= level.map.stars.length && commandsUsed <= (level.minCommands || 1);
    if (isPerfect) {
      statsStorage.recordPerfectLevel();
    }
    
    statsStorage.updateConsecutiveDays();
    
    const updatedStats = statsStorage.get();
    const achievements = checkAchievements(updatedStats);
    const unlockedIds = achievementStorage.getUnlockedIds();
    
    achievements.forEach((achievement) => {
      if (!unlockedIds.includes(achievement.id)) {
        achievementStorage.unlock(achievement);
        setShowAchievementNotification(achievement);
      }
    });
  }, [currentLevelData]);

  const handleRunProgram = useCallback(() => {
    setIsRunning(true);
    setCollectedStars([]);

    const robotCell = currentMap.cells.find((cell) => cell.type === "robot");
    if (robotCell) {
      setRobot({ x: robotCell.x, y: robotCell.y, dir: robotCell.dir || "right" });
    }

    const initialRobot = {
      x: currentMap.cells.find((cell) => cell.type === "robot")?.x || 0,
      y: currentMap.cells.find((cell) => cell.type === "robot")?.y || 0,
      dir: currentMap.cells.find((cell) => cell.type === "robot")?.dir || "right",
    };

    let currentRobot = { ...initialRobot };
    let collectedStarsCount = 0;
    let collectedStarsPositions: { x: number; y: number }[] = [];
    let success = true;
    let message = "";

    const executeRecursive = async (cmd: Command): Promise<boolean> => {
      return new Promise(async (resolve) => {
        switch (cmd.type) {
          case "forward":
          case "left":
          case "right":
          case "collect":
          case "wait":
          case "randomTurn":
            const result = executeCommand(cmd, currentRobot, currentMap, collectedStarsCount);
            if (!result.success) {
              success = false;
              message = result.message;
              resolve(false);
              return;
            }

            const startRobot = { ...currentRobot };
            const updatedRobot = result.robot;
            const updatedCollectedStars = result.collectedStars;

            const animateRobot = (step = 0) => {
              if (step < 10) {
                const progress = step / 10;
                const newX = startRobot.x + (updatedRobot.x - startRobot.x) * progress;
                const newY = startRobot.y + (updatedRobot.y - startRobot.y) * progress;
                setRobot({ x: newX, y: newY, dir: updatedRobot.dir });
                setTimeout(() => animateRobot(step + 1), 50);
              } else {
                setRobot(updatedRobot);
                currentRobot = updatedRobot;

                if (updatedCollectedStars > collectedStarsCount) {
                  const starAtCurrentPosition = currentMap.stars.find((star) => star.x === updatedRobot.x && star.y === updatedRobot.y);
                  if (starAtCurrentPosition) {
                    setTimeout(() => {
                      collectedStarsPositions.push({ x: updatedRobot.x, y: updatedRobot.y });
                      setCollectedStars([...collectedStarsPositions]);
                    }, 500);
                  }
                }

                collectedStarsCount = updatedCollectedStars;
                setTimeout(() => resolve(true), 300);
              }
            };
            animateRobot();
            break;

          case "loop":
            const times = cmd.params?.times || 2;
            let loopSuccess = true;
            for (let i = 0; i < times; i++) {
              if (cmd.children) {
                for (const childCmd of cmd.children) {
                  const childResult = await executeRecursive(childCmd);
                  if (!childResult) {
                    loopSuccess = false;
                    break;
                  }
                }
              }
              if (!loopSuccess) break;
            }
            resolve(loopSuccess);
            break;

          case "if": {
            const condition = cmd.params?.condition as ConditionType;
            let conditionMet = false;

            if (condition === "frontBlocked") {
              const directionOffset: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
              const [dx, dy] = directionOffset[currentRobot.dir];
              conditionMet = !isValidPosition(currentRobot.x + dx, currentRobot.y + dy, currentMap);
            } else if (condition === "leftBlocked") {
              const leftDir: Record<Direction, Direction> = { up: "left", left: "down", down: "right", right: "up" };
              const directionOffset: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
              const [dx, dy] = directionOffset[leftDir[currentRobot.dir]];
              conditionMet = !isValidPosition(currentRobot.x + dx, currentRobot.y + dy, currentMap);
            } else if (condition === "rightBlocked") {
              const rightDir: Record<Direction, Direction> = { up: "right", right: "down", down: "left", left: "up" };
              const directionOffset: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
              const [dx, dy] = directionOffset[rightDir[currentRobot.dir]];
              conditionMet = !isValidPosition(currentRobot.x + dx, currentRobot.y + dy, currentMap);
            } else if (condition === "hasStar") {
              conditionMet = collectedStarsCount > 0;
            } else if (condition === "nearGoal") {
              const goal = currentMap.cells.find((cell) => cell.type === "goal");
              if (goal) {
                const distance = Math.abs(currentRobot.x - goal.x) + Math.abs(currentRobot.y - goal.y);
                conditionMet = distance <= 2;
              }
            }

            if (conditionMet) {
              if (cmd.children) {
                let ifSuccess = true;
                for (const childCmd of cmd.children) {
                  const childResult = await executeRecursive(childCmd);
                  if (!childResult) {
                    ifSuccess = false;
                    break;
                  }
                }
                resolve(ifSuccess);
                return;
              }
            } else {
              // 执行else分支
              if (cmd.elseChildren) {
                let elseSuccess = true;
                for (const childCmd of cmd.elseChildren) {
                  const childResult = await executeRecursive(childCmd);
                  if (!childResult) {
                    elseSuccess = false;
                    break;
                  }
                }
                resolve(elseSuccess);
                return;
              }
            }
            resolve(true);
            break;
          }

          case "repeatUntil":
            if (cmd.children) {
              const repeatCondition = cmd.params?.condition;
              let repeatConditionMet = false;

              while (!repeatConditionMet) {
                let repeatSuccess = true;
                for (const childCmd of cmd.children) {
                  const childResult = await executeRecursive(childCmd);
                  if (!childResult) {
                    repeatSuccess = false;
                    break;
                  }
                }

                if (!repeatSuccess) {
                  resolve(false);
                  return;
                }

                if (repeatCondition === "hasStar") {
                  repeatConditionMet = collectedStarsCount > 0;
                } else if (repeatCondition === "frontBlocked") {
                  const directionOffset: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
                  const [dx, dy] = directionOffset[currentRobot.dir];
                  repeatConditionMet = !isValidPosition(currentRobot.x + dx, currentRobot.y + dy, currentMap);
                } else if (repeatCondition === "edgeInFront") {
                  const directionOffset: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
                  const [dx, dy] = directionOffset[currentRobot.dir];
                  const nextX = currentRobot.x + dx;
                  const nextY = currentRobot.y + dy;
                  repeatConditionMet = nextX < 0 || nextX >= currentMap.width || nextY < 0 || nextY >= currentMap.height;
                } else if (repeatCondition === "nearGoal") {
                  const goal = currentMap.cells.find((cell) => cell.type === "goal");
                  if (goal) {
                    const distance = Math.abs(currentRobot.x - goal.x) + Math.abs(currentRobot.y - goal.y);
                    repeatConditionMet = distance <= 2;
                  }
                }
              }
            }
            resolve(true);
            break;
        }
      });
    };

    const runProgram = async () => {
      for (const cmd of commands) {
        const result = await executeRecursive(cmd);
        if (!result) break;
      }

      if (success) {
        const atGoal = currentMap.cells.some((cell) => cell.type === "goal" && cell.x === currentRobot.x && cell.y === currentRobot.y);
        const allStarsCollected = collectedStarsCount >= currentMap.stars.length;

        if (atGoal && allStarsCollected) {
          message = "恭喜你过关了！";
          handleLevelComplete(collectedStarsCount, commands.length);
        } else if (!atGoal) {
          success = false;
          message = "机器人没有到达终点！";
        } else if (collectedStarsCount < currentMap.stars.length) {
          success = false;
          message = "还有星星没有收集！";
        }
      }

      setIsRunning(false);
      if (message) {
        setNotification({ message, type: success ? "success" : "error" });
      }
    };

    runProgram();
  }, [currentMap, commands, setRobot, setCollectedStars, setIsRunning, handleLevelComplete]);

  return (
    <div className={styles.gameContainer}>
      <main className={styles.main}>
        <div className={styles.leftSection}>
          <div className={styles.commandSection}>
            <CommandPanel />
          </div>

          <div className={styles.programSection}>
            <div className={styles.programEditor}>
              <div className={styles.editorHeader}>
                <div className={styles.levelInfo}>
                  <span className={styles.levelName}>{currentLevelIndex < levels.length ? currentLevelData.name : "自定义关卡"}</span>
                  <span className={styles.levelBadge}>
                    🌟 {currentLevelIndex + 1}/{levels.length}
                  </span>
                </div>
                <div className={styles.levelNav}>
                  <button
                    className={styles.navButton}
                    onClick={prevLevel}
                    disabled={currentLevelIndex === 0 || currentLevelIndex >= allLevelsCount}
                  >
                    ← 上一关
                  </button>
                  <button className={styles.navButton} onClick={nextLevel} disabled={currentLevelIndex >= allLevelsCount - 1}>
                    下一关 →
                  </button>
                  <div className={styles.spacer}></div>
                  <button
                    className={`${styles.navButton} ${styles.saveButton}`}
                    onClick={() => {
                      playClickSound();
                      setShowSaveDialog(true);
                    }}
                  >
                    💾 保存
                  </button>
                  <button
                    className={`${styles.navButton} ${styles.loadButton}`}
                    onClick={() => {
                      playClickSound();
                      setShowLoadDialog(true);
                    }}
                  >
                    📂 加载
                  </button>
                </div>
              </div>

              <div className={styles.editorButtons}>
                <button
                  className={`${styles.actionButton} ${styles.runButton}`}
                  onClick={() => {
                    playClickSound();
                    handleRunProgram();
                  }}
                >
                  ▶️ 运行
                </button>
                <button
                  className={`${styles.actionButton} ${styles.clearButton}`}
                  onClick={() => {
                    playClickSound();
                    clearCommands();
                  }}
                >
                  🗑️ 清空
                </button>
                <button
                  className={`${styles.actionButton} ${isDebugMode ? styles.active : ""}`}
                  onClick={() => {
                    playClickSound();
                    setIsDebugMode(!isDebugMode);
                  }}
                >
                  🔧 调试模式
                </button>
                <button className={styles.actionButton} onClick={handleUndo} disabled={historyIndex <= 0} title="撤销">
                  <span>↩</span>
                </button>
                <button className={styles.actionButton} onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="重做">
                  <span>↪</span>
                </button>
              </div>

              <div className={styles.commandsContainerWrapper}>
                <CommandsContainer
                  commands={commands}
                  onAddCommand={handleAddCommand}
                  onRemoveCommand={handleRemoveCommand}
                  onAddChild={handleAddChild}
                  onCopyCommand={handleCopyCommand}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onDropBefore={handleDropBefore}
                  onDropAfter={handleDropAfter}
                  isDebugMode={isDebugMode}
                  currentStep={currentStep}
                  debugSteps={debugSteps}
                  breakpoints={breakpoints}
                  onToggleBreakpoint={handleToggleBreakpoint}
                  onUpdateCommand={handleUpdateCommand}
                />
              </div>

              {isDebugMode && (
                <div className={styles.debugControls}>
                  <h4>🔧 调试控制</h4>
                  <div className={styles.debugButtons}>
                    <button onClick={handleStartDebug} disabled={isDebugging} className={styles.startButton}>
                      ▶️ 开始调试
                    </button>
                    <button onClick={handleStepDebug} disabled={!isDebugging} className={styles.stepButton}>
                      ⏭️ 单步执行
                    </button>
                    <button onClick={handleContinueDebug} disabled={!isDebugging} className={styles.continueButton}>
                      ▶️▶️ 继续执行
                    </button>
                    <button onClick={handleStopDebug} disabled={!isDebugging} className={styles.stopButton}>
                      ⏹️ 停止
                    </button>
                  </div>
                  <div className={styles.debugSpeedControl}>
                    <label>⚡ 速度调节：</label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={debugSpeed}
                      onChange={(e) => setDebugSpeed(Number(e.target.value))}
                      className={styles.speedSlider}
                    />
                    <span>{debugSpeed}ms</span>
                  </div>
                </div>
              )}

              {isDebugMode && <LogPanel logs={executionLog} />}
            </div>
          </div>

          <div className={styles.previewSection}>
            <h3>预览区</h3>
            <GameCanvas
              map={currentMap}
              robot={isDebugging ? debugRobot : robot}
              collectedStars={isDebugging ? [] : collectedStars}
              isExecuting={isDebugging || isRunning}
            />
            {isDebugMode && (
              <div className={styles.debugInfo}>
                <h4>调试信息</h4>
                <div className={styles.debugStats}>
                  <div>
                    当前步骤: {currentStep + 1}/{debugSteps.length}
                  </div>
                  <div>
                    收集星星: {debugCollectedStars}/{currentMap.stars.length}
                  </div>
                  <div>
                    机器人位置: ({isDebugging ? debugRobot.x : robot.x}, {isDebugging ? debugRobot.y : robot.y})
                  </div>
                  <div>机器人方向: {getDirectionLabel(isDebugging ? debugRobot.dir : robot.dir)}</div>
                </div>
              </div>
            )}
            <div className={styles.hintSection}>
              <HintSystem
                hints={generateHints(currentLevelData.id, currentLevelData.minCommands <= 3 ? 'basic' : currentLevelData.minCommands <= 6 ? 'loop' : 'collect')}
                levelHint={currentLevelData.hint}
              />
            </div>
          </div>
        </div>
      </main>

      {showDemoPrompt && (
        <div className={styles.demoPromptOverlay} onClick={() => setShowDemoPrompt(false)}>
          <div className={styles.demoPrompt} onClick={(e) => e.stopPropagation()}>
            <h4>指令演示</h4>
            <p>此关卡包含一个演示程序，展示了所有指令类型的使用方法。</p>
            <p>是否加载演示程序？</p>
            <div className={styles.demoPromptActions}>
              <button onClick={() => setShowDemoPrompt(false)}>关闭</button>
              <button onClick={loadDemoProgram}>加载演示</button>
            </div>
          </div>
        </div>
      )}

      {showAchievementNotification && (
        <div className={styles.achievementOverlay} onClick={() => setShowAchievementNotification(null)}>
          <div className={styles.achievementPopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.achievementIcon}>{showAchievementNotification.icon}</div>
            <h3 className={styles.achievementTitle}>🎉 成就解锁！</h3>
            <h4 className={styles.achievementName}>{showAchievementNotification.name}</h4>
            <p className={styles.achievementDescription}>{showAchievementNotification.description}</p>
            <button className={styles.achievementClose} onClick={() => setShowAchievementNotification(null)}>
              太棒了！
            </button>
          </div>
        </div>
      )}

      {/* 保存程序对话框 */}
      {showSaveDialog && (
        <div className={styles.demoPromptOverlay} onClick={() => setShowSaveDialog(false)}>
          <div className={styles.demoPrompt} onClick={(e) => e.stopPropagation()}>
            <h4>💾 保存程序</h4>
            <p>请输入程序名称：</p>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="例如：我的解决方案"
              className={styles.input}
              maxLength={30}
              autoFocus
            />
            <div className={styles.demoPromptActions}>
              <button onClick={() => setShowSaveDialog(false)}>取消</button>
              <button onClick={handleSaveProgram}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 加载程序对话框 */}
      {showLoadDialog && (
        <div className={styles.demoPromptOverlay} onClick={() => setShowLoadDialog(false)}>
          <div className={styles.demoPrompt} onClick={(e) => e.stopPropagation()}>
            <h4>📂 加载程序</h4>
            <p>选择要加载的程序：</p>
            <div className={styles.programList}>
              {savedPrograms.length === 0 ? (
                <p className={styles.emptyPrograms}>暂无保存的程序</p>
              ) : (
                savedPrograms.map((program) => (
                  <div key={program.id} className={styles.programItem}>
                    <button className={styles.loadButton} onClick={() => handleLoadProgram(program)}>
                      {program.name}
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteProgram(program.id)}
                      title="删除程序"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className={styles.demoPromptActions}>
              <button onClick={() => setShowLoadDialog(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};

export default Game;
