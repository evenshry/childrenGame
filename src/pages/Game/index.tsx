import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, message, Modal, Spin } from 'antd';
import {
  BulbOutlined,
  LeftOutlined,
  RightOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  BugOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import CommandPanel from '@/components/CommandPanel';
import CommandsContainer from '@/components/CommandsContainer';
import GameCanvas from '@/components/GameCanvas';
import LogPanel from '@/components/LogPanel';
import Notification from '@/components/Notification';
import HintSystem, { generateHints } from '@/components/HintSystem';
import { useGameStore } from '@/store';
import { levels, generateId, getAllLevels } from '@/utils/constants';
import { getDirectionLabel } from '@/utils/gameEngine';
import { playClickSound, playLevelUpSound } from '@/utils/animations';
import { checkAchievements } from '@/utils/achievements';
import {
  progressStorage,
  statsStorage,
  achievementStorage,
  programStorage,
} from '@/utils/storage';
import { useAIAutoSolver } from '@/hooks/useAIAutoSolver';
import { useAIStore } from '@/store/aiStore';
import {
  runProgram,
  simulateProgram,
  type ExecutionResult,
  type ExecutionStep,
} from '@/utils/execution-engine';
import {
  cloneCommands,
  cloneCommandWithNewIds,
  appendChildCommand,
  updateCommandInTree,
  duplicateCommandInTree,
  moveCommandByOffset,
  moveOrInsertCommand,
  type CommandBranch,
  type CommandLocation,
  type DraggedCommand,
} from '@/utils/commandTree';
import type { SolverCommand, SolverResult } from '@/api/qianwen/types';
import type { Command, CommandType, MapData, RobotState, Achievement, SavedProgram } from '@/types/global';
import styles from './index.module.scss';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const starsToPositions = (keys: string[]): { x: number; y: number }[] =>
  keys.map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });

const getStartRobot = (map: MapData): RobotState => {
  const robotCell = map.cells.find((cell) => cell.type === 'robot');
  return robotCell
    ? { x: robotCell.x, y: robotCell.y, dir: robotCell.dir || 'right' }
    : { x: 0, y: 0, dir: 'right' };
};

const toFullCommand = (command: SolverCommand): Command => ({
  id: generateId(),
  type: command.type as CommandType,
  params: command.params as unknown as Command['params'],
  children: command.children?.map(toFullCommand),
  elseChildren: command.elseChildren?.map(toFullCommand),
});

const solverResultToCommands = (result: SolverResult): Command[] =>
  result.commands.map(toFullCommand);

const demoPromptKey = (levelId: string): string => `demo_prompt_dismissed_${levelId}`;

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
    setRobot,
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
    commitCommands,
    resetPreview,
    loadLevel,
  } = useGameStore();

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [allLevelsCount, setAllLevelsCount] = useState(() => getAllLevels().length);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const currentAchievement = achievementQueue.length > 0 ? achievementQueue[0] : null;
  const [showSolveModal, setShowSolveModal] = useState(false);

  // 调试状态
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugRobot, setDebugRobot] = useState<RobotState>(robot);
  const [debugStars, setDebugStars] = useState<{ x: number; y: number }[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [debugCommandId, setDebugCommandId] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<string[]>([]);
  const [debugSpeed, setDebugSpeed] = useState(500);

  // 程序保存 / 加载
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [programName, setProgramName] = useState('');
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>([]);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { solve } = useAIAutoSolver();
  const { settings, isGenerating, isDailyLimitReached } = useAIStore();

  const initializedLevelRef = useRef(false);
  const runTokenRef = useRef(0);
  const runTimerRef = useRef<number | null>(null);
  const debugGeneratorRef = useRef<Generator<
    ExecutionStep,
    ExecutionResult,
    void
  > | null>(null);
  const continueDebugRef = useRef(false);
  const breakpointsRef = useRef(new Set<string>());
  const commandsRef = useRef(commands);
  const levelStartRef = useRef(Date.now());
  const runningRef = useRef(false);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  // 关卡切换（包括上一关 / 下一关）时重置运行、调试与预览状态
  const previousLevelIdRef = useRef(currentLevelData.id);
  useEffect(() => {
    if (previousLevelIdRef.current === currentLevelData.id) return;
    previousLevelIdRef.current = currentLevelData.id;

    runTokenRef.current++;
    runningRef.current = false;
    continueDebugRef.current = false;
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    debugGeneratorRef.current = null;
    setIsDebugging(false);
    setDebugCommandId(null);
    setDebugLogs([]);
    setDebugStars([]);
    setDebugRobot(getStartRobot(useGameStore.getState().currentMap));
    setBreakpoints([]);
    breakpointsRef.current = new Set();
    setIsRunning(false);
    levelStartRef.current = Date.now();
    setShowDemoPrompt(
      !!currentLevelData.demoProgram &&
        !localStorage.getItem(demoPromptKey(currentLevelData.id)),
    );
    setAllLevelsCount(getAllLevels().length);
  }, [currentLevelData.id, currentLevelData.demoProgram, setIsRunning]);

  const loadSavedPrograms = useCallback(() => {
    setSavedPrograms(programStorage.getByLevel(currentLevelData.id));
  }, [currentLevelData.id]);

  useEffect(() => {
    loadSavedPrograms();
  }, [loadSavedPrograms]);

  // 根据 URL / 已保存进度加载关卡（只在关卡真正变化时重置）
  useEffect(() => {
    const allLevels = getAllLevels();
    const levelIdParam = searchParams.get('level');
    const requested = levelIdParam
      ? allLevels.find(
          (level) =>
            level.id === levelIdParam ||
            level.id === `level_0${levelIdParam}` ||
            level.id === `level_${levelIdParam.padStart(2, '0')}`,
        )
      : undefined;
    const savedLevel =
      allLevels[Math.min(progressStorage.getCurrentLevelIndex(), allLevels.length - 1)] ??
      levels[0];
    const level = requested ?? savedLevel;

    const currentLevelId = useGameStore.getState().currentLevelData.id;
    if (!initializedLevelRef.current || level.id !== currentLevelId) {
      loadLevel(level);
      levelStartRef.current = Date.now();
      continueDebugRef.current = false;
      debugGeneratorRef.current = null;
      setIsDebugging(false);
      setDebugLogs([]);
      setDebugCommandId(null);
      setBreakpoints([]);
      breakpointsRef.current = new Set();
      setShowDemoPrompt(
        !!level.demoProgram &&
          useGameStore.getState().commands.length === 0 &&
          !localStorage.getItem(demoPromptKey(level.id)),
      );
    }
    initializedLevelRef.current = true;
    setAllLevelsCount(allLevels.length);
  }, [searchParams, loadLevel]);

  // 同步 URL 中的 level 参数
  useEffect(() => {
    const level = getAllLevels()[currentLevelIndex];
    if (!level) return;
    if (searchParams.get('level') !== level.id) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('level', level.id);
      navigate({ search: nextParams.toString() }, { replace: true });
    }
  }, [currentLevelIndex, searchParams, navigate]);

  // 清理运行中的定时器与调试状态
  useEffect(
    () => () => {
      runTokenRef.current++;
      continueDebugRef.current = false;
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current);
        runTimerRef.current = null;
      }
      debugGeneratorRef.current = null;
      useGameStore.getState().setIsRunning(false);
    },
    [],
  );

  // 记录游戏时长
  useEffect(() => {
    const timer = window.setInterval(() => statsStorage.addPlayTime(30), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSaveProgram = useCallback(() => {
    if (commands.length === 0) {
      setNotification({ message: '请先添加指令', type: 'warning' });
      return;
    }
    if (!programName.trim()) {
      setNotification({ message: '请输入程序名称', type: 'warning' });
      return;
    }

    const program: SavedProgram = {
      id: `program_${generateId()}`,
      name: programName.trim(),
      commands: cloneCommands(commands),
      levelId: currentLevelData.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    programStorage.save(program);
    setShowSaveDialog(false);
    setProgramName('');
    loadSavedPrograms();
    setNotification({ message: '程序保存成功！', type: 'success' });
  }, [commands, programName, currentLevelData.id, loadSavedPrograms]);

  const handleLoadProgram = useCallback(
    (program: SavedProgram) => {
      commitCommands(cloneCommands(program.commands));
      resetPreview();
      setShowLoadDialog(false);
      setNotification({ message: `已加载程序: ${program.name}`, type: 'success' });
    },
    [commitCommands, resetPreview],
  );

  const handleDeleteProgram = useCallback(
    (programId: string) => {
      programStorage.delete(programId);
      loadSavedPrograms();
      setNotification({ message: '程序已删除', type: 'info' });
    },
    [loadSavedPrograms],
  );

  const handleUndo = useCallback(() => {
    if (undo()) {
      setNotification({ message: '已撤销', type: 'info' });
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    if (redo()) {
      setNotification({ message: '已重做', type: 'info' });
    }
  }, [redo]);

  const loadDemoProgram = useCallback(() => {
    const demo = currentLevelData.demoProgram;
    if (!demo) return;
    commitCommands(demo.map(cloneCommandWithNewIds));
    resetPreview();
    setShowDemoPrompt(false);
    setNotification({ message: '已加载演示程序！', type: 'success' });
  }, [currentLevelData, commitCommands, resetPreview]);

  const handleAddCommand = useCallback(
    (command: Command) => {
      const newCommand = cloneCommandWithNewIds(command);
      const nextCommands = [...commands, newCommand];
      addCommand(newCommand);

      const startRobot = getStartRobot(currentMap);
      const preview = simulateProgram(nextCommands, startRobot, currentMap);
      setRobot(preview.robot);
      setCollectedStars(starsToPositions(preview.collectedStars));

      if (!preview.success && preview.message === '机器人撞墙了！') {
        setNotification({ message: preview.message, type: 'error' });
      }
    },
    [commands, currentMap, addCommand, setRobot, setCollectedStars],
  );

  const handleRemoveCommand = useCallback(
    (id: string) => {
      removeCommand(id);
      resetPreview();
    },
    [removeCommand, resetPreview],
  );

  const handleAddChild = useCallback(
    (parentId: string, childCommand: Command, branch: CommandBranch = 'children') => {
      const child = cloneCommandWithNewIds(childCommand);
      commitCommands(appendChildCommand(commands, parentId, child, branch));
      resetPreview();
    },
    [commands, commitCommands, resetPreview],
  );

  const handleUpdateCommand = useCallback(
    (id: string, updates: Partial<Command>) => {
      commitCommands(updateCommandInTree(commands, id, updates));
      resetPreview();
    },
    [commands, commitCommands, resetPreview],
  );

  const handleCopyCommand = useCallback(
    (command: Command) => {
      commitCommands(duplicateCommandInTree(commands, command.id));
      resetPreview();
      setNotification({ message: '已复制指令', type: 'success' });
    },
    [commands, commitCommands, resetPreview],
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      commitCommands(moveCommandByOffset(commands, id, -1));
      resetPreview();
    },
    [commands, commitCommands, resetPreview],
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      commitCommands(moveCommandByOffset(commands, id, 1));
      resetPreview();
    },
    [commands, commitCommands, resetPreview],
  );

  const handleDropBefore = useCallback(
    (location: CommandLocation, draggedItem: DraggedCommand) => {
      const next = moveOrInsertCommand(commands, location, draggedItem);
      if (next !== commands) {
        commitCommands(next);
        resetPreview();
      }
    },
    [commands, commitCommands, resetPreview],
  );

  const handleDropAfter = useCallback(
    (location: CommandLocation, draggedItem: DraggedCommand) => {
      handleDropBefore({ ...location, index: location.index + 1 }, draggedItem);
    },
    [handleDropBefore],
  );

  const handleLevelComplete = useCallback(
    (commandsUsed: number, elapsedMs: number) => {
      playLevelUpSound();

      const level = currentLevelData;
      const previous = progressStorage.getLevelProgress(level.id);
      progressStorage.completeLevel(level.id, level.map.stars.length, commandsUsed);

      const isPerfect = commandsUsed <= (level.minCommands || 1);
      if (isPerfect && !previous?.completed) {
        statsStorage.recordPerfectLevel();
      }
      if (!previous?.completed && elapsedMs < 60_000) {
        statsStorage.recordSpeedRun();
      }

      statsStorage.updateConsecutiveDays();

      const updatedStats = statsStorage.get();
      const unlockedIds = achievementStorage.getUnlockedIds();
      const nextQueue = [...achievementQueue];
      checkAchievements(updatedStats).forEach((achievement) => {
        if (!unlockedIds.includes(achievement.id)) {
          achievementStorage.unlock(achievement);
          nextQueue.push(achievement);
        }
      });
      if (nextQueue.length > achievementQueue.length) {
        setAchievementQueue(nextQueue);
      }
    },
    [currentLevelData, achievementQueue],
  );

  const handleRunProgram = useCallback(async () => {
    if (runningRef.current || isRunning || isDebugging || commands.length === 0) return;
    runningRef.current = true;

    const token = ++runTokenRef.current;
    progressStorage.incrementAttempts(currentLevelData.id);
    const startRobot = getStartRobot(currentMap);
    resetPreview();
    setIsRunning(true);

    const generator = runProgram(commands, startRobot, currentMap);
    let result: ExecutionResult | null = null;

    try {
      for (;;) {
        const next = generator.next();
        if (next.done) {
          result = next.value;
          break;
        }
        const step = next.value;
        setRobot(step.robot);
        setCollectedStars(starsToPositions(step.collectedStars));
        await sleep(step.waitMs ?? (step.control ? 120 : 240));
        if (runTokenRef.current !== token) return;
      }
    } finally {
      if (runTokenRef.current === token) {
        setIsRunning(false);
      }
      runningRef.current = false;
    }

    if (!result || runTokenRef.current !== token) return;

    setNotification({
      message: result.message,
      type: result.success ? 'success' : 'error',
    });
    if (result.success) {
      handleLevelComplete(commands.length, Date.now() - levelStartRef.current);
    }
  }, [
    isRunning,
    isDebugging,
    commands,
    currentMap,
    resetPreview,
    setIsRunning,
    setRobot,
    setCollectedStars,
    handleLevelComplete,
    currentLevelData.id,
  ]);

  const stepDebugOnce = useCallback((): ExecutionStep | ExecutionResult | null => {
    const generator = debugGeneratorRef.current;
    if (!generator) return null;

    const next = generator.next();
    if (next.done) {
      debugGeneratorRef.current = null;
      setIsDebugging(false);
      setDebugCommandId(null);
      setDebugRobot(next.value.robot);
      setDebugStars(starsToPositions(next.value.collectedStars));
      setRobot(next.value.robot);
      setCollectedStars(starsToPositions(next.value.collectedStars));
      setDebugLogs((logs) => [...logs, next.value.message].slice(-500));
      setNotification({
        message: next.value.message,
        type: next.value.success ? 'success' : 'error',
      });
      if (next.value.success) {
        handleLevelComplete(
          commandsRef.current.length,
          Date.now() - levelStartRef.current,
        );
      }
      return next.value;
    }

    const step = next.value;
    setDebugRobot(step.robot);
    setDebugStars(starsToPositions(step.collectedStars));
    setDebugCommandId(step.commandId);
    setDebugLogs((logs) => [...logs, `${step.control ? '▶ ' : ''}${step.message}`].slice(-500));
    if (step.paused) {
      setNotification({ message: step.message, type: 'info' });
    }
    return step;
  }, [handleLevelComplete, setRobot, setCollectedStars]);

  const handleStartDebug = useCallback(() => {
    if (isRunning) return;
    runTokenRef.current++;
    continueDebugRef.current = false;
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }

    const startRobot = getStartRobot(currentMap);
    resetPreview();
    setDebugRobot(startRobot);
    setDebugStars([]);
    setDebugLogs([]);
    setDebugCommandId(null);
    setIsDebugging(true);
    breakpointsRef.current = new Set(breakpoints);
    debugGeneratorRef.current = runProgram(commands, startRobot, currentMap, [], {
      breakpoints: breakpointsRef.current,
    });
  }, [isRunning, currentMap, resetPreview, commands, breakpoints]);

  const handleStepDebug = useCallback(() => {
    if (!isDebugging) return;
    stepDebugOnce();
  }, [isDebugging, stepDebugOnce]);

  const handleContinueDebug = useCallback(() => {
    if (!isDebugging || !debugGeneratorRef.current) return;
    continueDebugRef.current = true;

    const tick = () => {
      if (!continueDebugRef.current || !debugGeneratorRef.current) return;
      const step = stepDebugOnce();
      if (!step || !debugGeneratorRef.current) {
        continueDebugRef.current = false;
        return;
      }
      if ('paused' in step && step.paused) {
        continueDebugRef.current = false;
        return;
      }
      runTimerRef.current = window.setTimeout(tick, debugSpeed);
    };

    tick();
  }, [isDebugging, stepDebugOnce, debugSpeed]);

  const handleStopDebug = useCallback(() => {
    continueDebugRef.current = false;
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    debugGeneratorRef.current = null;
    setIsDebugging(false);
    setDebugCommandId(null);
    setDebugLogs([]);
    resetPreview();
  }, [resetPreview]);

  const handleToggleBreakpoint = useCallback((commandId: string) => {
    setBreakpoints((current) => {
      const next = current.includes(commandId)
        ? current.filter((id) => id !== commandId)
        : [...current, commandId];
      // 原地更新 generator 使用的 Set，确保调试开始后切换断点仍然生效
      if (breakpointsRef.current.has(commandId)) {
        breakpointsRef.current.delete(commandId);
      } else {
        breakpointsRef.current.add(commandId);
      }
      return next;
    });
  }, []);

  const handleAutoSolve = useCallback(async () => {
    if (isRunning || isDebugging) return;
    if (!settings.enableAutoSolve) {
      message.warning('AI 自动解题功能已禁用，请在设置中开启');
      return;
    }
    if (isDailyLimitReached()) {
      message.warning('今日 Token 使用已达上限，请明天再试');
      return;
    }

    const robotCell = currentMap.cells.find((cell) => cell.type === 'robot');
    const goalCell = currentMap.cells.find((cell) => cell.type === 'goal');
    if (!robotCell || !goalCell) {
      message.error('无法找到机器人或目标位置');
      return;
    }

    setShowSolveModal(true);
    try {
      const result = await solve({
        map: currentMap,
        startX: robotCell.x,
        startY: robotCell.y,
        startDir: robotCell.dir || 'right',
        goalX: goalCell.x,
        goalY: goalCell.y,
      });

      if (result) {
        commitCommands(solverResultToCommands(result));
        resetPreview();
        message.success('AI 解题成功！');
        if (result.explanation) {
          message.info(result.explanation);
        }
      } else {
        message.error('AI 解题失败，请重试');
      }
    } catch {
      message.error('AI 解题失败，请重试');
    } finally {
      setShowSolveModal(false);
    }
  }, [
    settings.enableAutoSolve,
    isDailyLimitReached,
    currentMap,
    solve,
    commitCommands,
    resetPreview,
    isRunning,
    isDebugging,
  ]);

  const dismissDemoPrompt = useCallback(() => {
    localStorage.setItem(demoPromptKey(currentLevelData.id), '1');
    setShowDemoPrompt(false);
  }, [currentLevelData.id]);

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
                  <span className={styles.levelName}>{currentLevelData.name}</span>
                  <span className={styles.levelBadge}>
                    🌟 {currentLevelIndex + 1}/{allLevelsCount}
                  </span>
                </div>
                <div className={styles.levelNav}>
                  <Button
                    icon={<LeftOutlined />}
                    onClick={prevLevel}
                    disabled={currentLevelIndex === 0 || currentLevelIndex >= allLevelsCount}
                  >
                    上一关
                  </Button>
                  <Button
                    icon={<RightOutlined />}
                    onClick={nextLevel}
                    disabled={currentLevelIndex >= allLevelsCount - 1}
                  >
                    下一关
                  </Button>
                  <div className={styles.spacer}></div>
                  <Button
                    icon={<SaveOutlined />}
                    type="primary"
                    onClick={() => {
                      playClickSound();
                      setShowSaveDialog(true);
                    }}
                  >
                    保存
                  </Button>
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => {
                      playClickSound();
                      setShowLoadDialog(true);
                    }}
                  >
                    加载
                  </Button>
                </div>
              </div>

              <div className={styles.editorButtons}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    playClickSound();
                    void handleRunProgram();
                  }}
                  disabled={isRunning || isDebugging || commands.length === 0}
                  loading={isRunning}
                >
                  运行
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    playClickSound();
                    clearCommands();
                  }}
                  disabled={isRunning}
                >
                  清空
                </Button>
                <Button
                  type={isDebugMode ? 'primary' : 'default'}
                  icon={<BugOutlined />}
                  onClick={() => {
                    playClickSound();
                    setIsDebugMode(!isDebugMode);
                  }}
                >
                  调试模式
                </Button>
                <Button
                  icon={<UndoOutlined />}
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="撤销"
                />
                <Button
                  icon={<RedoOutlined />}
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="重做"
                />
                <div className={styles.spacer}></div>
                <Button
                  type="primary"
                  icon={<BulbOutlined />}
                  onClick={() => {
                    void handleAutoSolve();
                  }}
                  disabled={isGenerating || isRunning || isDebugging}
                >
                  AI解题
                </Button>
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
                  breakpoints={breakpoints}
                  onToggleBreakpoint={handleToggleBreakpoint}
                  onUpdateCommand={handleUpdateCommand}
                  currentCommandId={debugCommandId}
                />
              </div>

              {isDebugMode && (
                <div className={styles.debugControls}>
                  <h4>🔧 调试控制</h4>
                  <div className={styles.debugButtons}>
                    <button
                      onClick={handleStartDebug}
                      disabled={isDebugging}
                      className={styles.startButton}
                    >
                      ▶️ 开始调试
                    </button>
                    <button
                      onClick={handleStepDebug}
                      disabled={!isDebugging}
                      className={styles.stepButton}
                    >
                      ⏭️ 单步执行
                    </button>
                    <button
                      onClick={handleContinueDebug}
                      disabled={!isDebugging}
                      className={styles.continueButton}
                    >
                      ▶️▶️ 继续执行
                    </button>
                    <button
                      onClick={handleStopDebug}
                      disabled={!isDebugging}
                      className={styles.stopButton}
                    >
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
                      onChange={(event) => setDebugSpeed(Number(event.target.value))}
                      className={styles.speedSlider}
                    />
                    <span>{debugSpeed}ms</span>
                  </div>
                </div>
              )}

              {isDebugMode && <LogPanel logs={debugLogs} />}
            </div>
          </div>

          <div className={styles.previewSection}>
            <h3>预览区</h3>
            <GameCanvas
              map={currentMap}
              robot={isDebugging ? debugRobot : robot}
              collectedStars={isDebugging ? debugStars : collectedStars}
            />
            {isDebugMode && (
              <div className={styles.debugInfo}>
                <h4>调试信息</h4>
                <div className={styles.debugStats}>
                  <div>已执行步骤: {debugLogs.length}</div>
                  <div>
                    收集星星: {debugStars.length}/{currentMap.stars.length}
                  </div>
                  <div>
                    机器人位置: ({isDebugging ? debugRobot.x : robot.x},{' '}
                    {isDebugging ? debugRobot.y : robot.y})
                  </div>
                  <div>
                    机器人方向: {getDirectionLabel(isDebugging ? debugRobot.dir : robot.dir)}
                  </div>
                </div>
              </div>
            )}
            <div className={styles.hintSection}>
              <HintSystem
                hints={generateHints(
                  currentLevelData.id,
                  currentLevelData.minCommands <= 3
                    ? 'basic'
                    : currentLevelData.minCommands <= 6
                      ? 'loop'
                      : 'collect',
                )}
                levelHint={currentLevelData.hint}
                onUseHint={() => statsStorage.incrementHintUsage()}
              />
            </div>
          </div>
        </div>
      </main>

      <Modal
        title="AI 正在解题..."
        open={showSolveModal}
        footer={null}
        closable={false}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>正在分析关卡并生成最优解，请稍候...</p>
        </div>
      </Modal>

      {showDemoPrompt && (
        <div className={styles.demoPromptOverlay} onClick={dismissDemoPrompt}>
          <div className={styles.demoPrompt} onClick={(event) => event.stopPropagation()}>
            <h4>指令演示</h4>
            <p>此关卡包含一个演示程序，展示了所有指令类型的使用方法。</p>
            <p>是否加载演示程序？</p>
            <div className={styles.demoPromptActions}>
              <button onClick={dismissDemoPrompt}>关闭</button>
              <button onClick={loadDemoProgram}>加载演示</button>
            </div>
          </div>
        </div>
      )}

      {currentAchievement && (
        <div
          className={styles.achievementOverlay}
          onClick={() => setAchievementQueue((queue) => queue.slice(1))}
        >
          <div
            className={styles.achievementPopup}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.achievementIcon}>{currentAchievement.icon}</div>
            <h3 className={styles.achievementTitle}>🎉 成就解锁！</h3>
            <h4 className={styles.achievementName}>{currentAchievement.name}</h4>
            <p className={styles.achievementDescription}>
              {currentAchievement.description}
            </p>
            <button
              className={styles.achievementClose}
              onClick={() => setAchievementQueue((queue) => queue.slice(1))}
            >
              太棒了！
            </button>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className={styles.demoPromptOverlay} onClick={() => setShowSaveDialog(false)}>
          <div className={styles.demoPrompt} onClick={(event) => event.stopPropagation()}>
            <h4>💾 保存程序</h4>
            <p>请输入程序名称：</p>
            <input
              type="text"
              value={programName}
              onChange={(event) => setProgramName(event.target.value)}
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

      {showLoadDialog && (
        <div className={styles.demoPromptOverlay} onClick={() => setShowLoadDialog(false)}>
          <div className={styles.demoPrompt} onClick={(event) => event.stopPropagation()}>
            <h4>📂 加载程序</h4>
            <p>选择要加载的程序：</p>
            <div className={styles.programList}>
              {savedPrograms.length === 0 ? (
                <p className={styles.emptyPrograms}>暂无保存的程序</p>
              ) : (
                savedPrograms.map((program) => (
                  <div key={program.id} className={styles.programItem}>
                    <button
                      className={styles.loadButton}
                      onClick={() => handleLoadProgram(program)}
                    >
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

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default Game;