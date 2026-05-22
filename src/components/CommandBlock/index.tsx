import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Command, ConditionType } from "@/types/global";
import { playClickSound, playCollectSound } from "@/utils/animations";
import ConditionSelector from "@/components/ConditionSelector";
import styles from "./index.module.scss";

interface ChildrenDropZoneProps {
  parentCommand: Command;
  children: Command[];
  onAddChild?: (parentId: string, childCommand: Command, branch?: "children" | "elseChildren") => void;
  onRemove: (id: string) => void;
  onCopy?: (command: Command) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDropBefore?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onDropAfter?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  level: number;
  isDebugMode?: boolean;
  onToggleBreakpoint?: (id: string) => void;
  onUpdateCommand?: (id: string, updates: Partial<Command>) => void;
  isFolded?: boolean;
}

const ChildrenDropZone: React.FC<ChildrenDropZoneProps> = ({
  parentCommand,
  children,
  onAddChild,
  onRemove,
  onCopy,
  onMoveUp,
  onMoveDown,
  onDropBefore,
  onDropAfter,
  level,
  isDebugMode,
  onToggleBreakpoint,
  onUpdateCommand,
  isFolded = false,
}) => {
  const [{ isOver }, drop] = useDrop<{ command: Command; isFromPanel: boolean }, void, { isOver: boolean }>({
    accept: "command",
    drop: (item, monitor) => {
      if (monitor.didDrop()) {
        console.log("🚫 ChildrenDropZone drop skipped (already handled)", {
          parentType: parentCommand.type,
        });
        return;
      }

      if (item.isFromPanel && onAddChild) {
        console.log("📥 ChildrenDropZone drop:", {
          parentType: parentCommand.type,
          childType: item.command.type,
          branch: "children",
          level,
        });
        playCollectSound();
        onAddChild(parentCommand.id, item.command, "children");
      }
    },
    canDrop: (item) => item.isFromPanel,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`${styles.commandChildren} ${isOver ? styles.childDropOver : ""}`}
      style={{
        minHeight: isFolded ? "0" : "80px",
        maxHeight: isFolded ? "0" : "1000px",
        overflow: isFolded ? "hidden" : "visible",
        padding: isFolded ? "0 20px" : "20px",
        backgroundColor: isOver ? "rgba(102, 126, 234, 0.3)" : "rgba(244, 227, 200, 0.5)",
        border: isOver ? "2px dashed rgba(102, 126, 234, 0.8)" : "2px dashed rgba(146, 146, 146, 0.5)",
        borderRadius: "12px",
        margin: "10px 0",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isOver ? "0 0 20px rgba(102, 126, 234, 0.6)" : "none",
        transform: isOver ? "scale(1.02)" : "scale(1)",
      }}
    >
      {!isFolded &&
        children.map((child, childIndex) => (
          <CommandBlock
            key={child.id}
            command={child}
            onRemove={onRemove}
            onAddChild={onAddChild}
            onCopy={onCopy}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            level={level + 1}
            isDebugMode={isDebugMode}
            onToggleBreakpoint={onToggleBreakpoint}
            index={childIndex}
            total={children.length}
            onDropBefore={onDropBefore}
            onDropAfter={onDropAfter}
            onUpdateCommand={onUpdateCommand}
          />
        ))}
      {!isFolded && children.length === 0 && <div className={styles.addChildPlaceholder}>✨ 拖拽指令到这里添加子指令 ✨</div>}
    </div>
  );
};

interface ElseBranchDropZoneProps {
  command: Command;
  onAddChild?: (parentId: string, childCommand: Command, branch?: "children" | "elseChildren") => void;
  level: number;
  isDebugMode?: boolean;
  onToggleBreakpoint?: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy?: (command: Command) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDropBefore?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onDropAfter?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onUpdateCommand?: (id: string, updates: Partial<Command>) => void;
}

const ElseBranchDropZone: React.FC<ElseBranchDropZoneProps> = ({
  command,
  onAddChild,
  level,
  isDebugMode,
  onToggleBreakpoint,
  onRemove,
  onCopy,
  onMoveUp,
  onMoveDown,
  onDropBefore,
  onDropAfter,
  onUpdateCommand,
}) => {
  const [{ isOver }, drop] = useDrop<{ command: Command; isFromPanel: boolean }, void, { isOver: boolean }>({
    accept: "command",
    drop: (item, monitor) => {
      if (monitor.didDrop()) {
        console.log("🚫 ElseBranchDropZone drop skipped (already handled)", {
          parentType: command.type,
        });
        return;
      }

      if (item.isFromPanel && onAddChild) {
        console.log("📥 ElseBranchDropZone drop:", {
          parentType: command.type,
          childType: item.command.type,
          branch: "elseChildren",
          level,
        });
        playCollectSound();
        onAddChild(command.id, item.command, "elseChildren");
      }
    },
    canDrop: (item) => item.isFromPanel,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const elseChildrenList = command.elseChildren || [];

  return (
    <div
      ref={drop}
      className={`${styles.commandChildren} ${styles.elseChildren} ${isOver ? styles.childDropOver : ""}`}
      style={{
        minHeight: "80px",
        maxHeight: "1000px",
        overflow: "visible",
        padding: "20px",
        backgroundColor: isOver ? "rgba(255, 193, 7, 0.3)" : "rgba(255, 193, 7, 0.15)",
        border: isOver ? "2px dashed rgba(255, 193, 7, 0.8)" : "2px dashed rgba(255, 193, 7, 0.5)",
        borderRadius: "12px",
        margin: "10px 0",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isOver ? "0 0 20px rgba(255, 193, 7, 0.6)" : "none",
        transform: isOver ? "scale(1.02)" : "scale(1)",
      }}
    >
      {elseChildrenList.map((child, childIndex) => (
        <CommandBlock
          key={child.id}
          command={child}
          onRemove={onRemove}
          onAddChild={onAddChild}
          onCopy={onCopy}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          level={level + 1}
          isDebugMode={isDebugMode}
          onToggleBreakpoint={onToggleBreakpoint}
          index={childIndex}
          total={elseChildrenList.length}
          onDropBefore={onDropBefore}
          onDropAfter={onDropAfter}
          onUpdateCommand={onUpdateCommand}
        />
      ))}
      {elseChildrenList.length === 0 && <div className={styles.addChildPlaceholder}>✨ 拖拽指令到这里添加else分支 ✨</div>}
    </div>
  );
};

export interface CommandBlockProps {
  command: Command;
  onRemove: (id: string) => void;
  onAddChild?: (parentId: string, childCommand: Command, branch?: "children" | "elseChildren") => void;
  onCopy?: (command: Command) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  level?: number;
  isFromPanel?: boolean;
  isDebugMode?: boolean;
  isCurrentStep?: boolean;
  hasBreakpoint?: boolean;
  onToggleBreakpoint?: (id: string) => void;
  index?: number;
  total?: number;
  onDropBefore?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onDropAfter?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onUpdateCommand?: (id: string, updates: Partial<Command>) => void;
}

const CommandBlock: React.FC<CommandBlockProps> = React.memo(
  ({
    command,
    onRemove,
    onAddChild,
    onCopy,
    onMoveUp,
    onMoveDown,
    level = 0,
    isFromPanel = false,
    isDebugMode = false,
    isCurrentStep = false,
    hasBreakpoint = false,
    onToggleBreakpoint,
    index = 0,
    total = 0,
    onDropBefore,
    onDropAfter,
    onUpdateCommand,
  }) => {
    const [isFolded, setIsFolded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    const blockRef = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
      type: "command",
      item: { command, isFromPanel },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    drag(ref);

    const [{ isOver }, drop] = useDrop<{ command: Command; isFromPanel: boolean }, void, { isOver: boolean }>({
      accept: "command",
      hover: (item, monitor) => {
        if (!ref.current) return;

        if (item.isFromPanel) {
          return;
        }

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;

        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        if (hoverClientY < hoverMiddleY) {
          setDropPosition("before");
        } else {
          setDropPosition("after");
        }
      },
      drop: (item, monitor) => {
        if (!item.isFromPanel && dropPosition && onDropBefore && onDropAfter) {
          playClickSound();
          if (dropPosition === "before") {
            onDropBefore(index, item);
          } else {
            onDropAfter(index, item);
          }
        }
      },
      canDrop: (item) => {
        return !item.isFromPanel;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    useEffect(() => {
      if (!isOver) {
        setDropPosition(null);
      }
    }, [isOver]);

    useEffect(() => {
      drop(ref);
    }, [drop]);

    const getBlockStyleClass = () => {
      let classNames = [styles.commandBlock];
      switch (command.type) {
        case "forward":
          classNames.push(styles.forward);
          break;
        case "left":
        case "right":
          classNames.push(styles.turn);
          break;
        case "loop":
          classNames.push(styles.loop);
          break;
        case "if":
        case "repeatUntil":
          classNames.push(styles.condition);
          break;
        case "collect":
          classNames.push(styles.interaction);
          break;
        case "wait":
          classNames.push(styles.wait);
          break;
        case "randomTurn":
          classNames.push(styles.special);
          break;
      }
      if (isDragging) classNames.push(styles.dragging);
      if (isCurrentStep) classNames.push(styles.currentStep);
      if (hasBreakpoint) classNames.push(styles.breakpoint);
      if (isHovered && !isDragging) classNames.push(styles.hovered);
      if (dropPosition === "before") classNames.push(styles.dropBefore);
      if (dropPosition === "after") classNames.push(styles.dropAfter);
      return classNames.join(" ");
    };

    const getBlockIcon = () => {
      switch (command.type) {
        case "forward":
          return "🚀";
        case "left":
          return "↩️";
        case "right":
          return "↪️";
        case "loop":
          return "🔄";
        case "if":
          return "❓";
        case "repeatUntil":
          return "🔁";
        case "collect":
          return "⭐";
        case "wait":
          return "⏰";
        case "randomTurn":
          return "🎲";
        default:
          return "📝";
      }
    };

    const getBlockLabel = () => {
      switch (command.type) {
        case "forward":
          return "前进";
        case "left":
          return "左转";
        case "right":
          return "右转";
        case "loop":
          return `循环 ${command.params?.times || 2}次`;
        case "if":
          return "如果";
        case "repeatUntil":
          return "重复直到";
        case "collect":
          return "收集";
        case "wait":
          return `等待 ${command.params?.seconds || 1}秒`;
        case "randomTurn":
          return "随机转向";
        default:
          return "指令";
      }
    };

    return (
      <div ref={ref} className={styles.commandBlockWrapper}>
        <div
          className={`${styles.commandBlock} ${getBlockStyleClass()}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isDebugMode && onToggleBreakpoint && (
            <button
              className={`${styles.breakpointButton} ${hasBreakpoint ? styles.active : ""}`}
              onClick={() => {
                playClickSound();
                onToggleBreakpoint(command.id);
              }}
            >
              ●
            </button>
          )}
          <span className={styles.commandIcon}>{getBlockIcon()}</span>
          <span className={styles.commandLabel}>{getBlockLabel()}</span>

          {!isFromPanel && ["if", "repeatUntil"].includes(command.type) && onUpdateCommand && command.params?.condition && (
            <div className={styles.conditionSelectorWrapper}>
              <ConditionSelector
                condition={command.params.condition}
                onChange={(newCondition: ConditionType) => {
                  playClickSound();
                  onUpdateCommand(command.id, {
                    params: { ...command.params, condition: newCondition },
                  });
                }}
              />
            </div>
          )}

          {!isFromPanel && command.type === "loop" && onUpdateCommand && (
            <div className={styles.timesSelectorWrapper}>
              <select
                className={styles.timesSelect}
                value={command.params?.times || 2}
                onChange={(e) => {
                  playClickSound();
                  onUpdateCommand(command.id, {
                    params: { ...command.params, times: parseInt(e.target.value) },
                  });
                }}
              >
                {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num}>
                    {num}次
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isFromPanel && (
            <div className={styles.commandActions}>
              {onCopy && (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    playClickSound();
                    onCopy(command);
                  }}
                  title="复制"
                >
                  📋
                </button>
              )}

              {onMoveUp && index > 0 && (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    playClickSound();
                    onMoveUp(command.id);
                  }}
                  title="上移"
                >
                  ⬆️
                </button>
              )}

              {onMoveDown && index < total - 1 && (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    playClickSound();
                    onMoveDown(command.id);
                  }}
                  title="下移"
                >
                  ⬇️
                </button>
              )}

              {["loop", "if", "repeatUntil"].includes(command.type) && command.children && command.children.length > 0 && (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    playClickSound();
                    setIsFolded(!isFolded);
                  }}
                  title={isFolded ? "展开" : "折叠"}
                >
                  {isFolded ? "➕" : "➖"}
                </button>
              )}

              <button
                className={styles.removeButton}
                onClick={() => {
                  playClickSound();
                  onRemove(command.id);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {!isFromPanel && ["loop", "if", "repeatUntil"].includes(command.type) && (
          <>
            <ChildrenDropZone
              parentCommand={command}
              children={command.children || []}
              onAddChild={onAddChild}
              onRemove={onRemove}
              onCopy={onCopy}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDropBefore={onDropBefore}
              onDropAfter={onDropAfter}
              level={level}
              isDebugMode={isDebugMode}
              onToggleBreakpoint={onToggleBreakpoint}
              onUpdateCommand={onUpdateCommand}
              isFolded={isFolded}
            />

            {!isFolded && command.type === "if" && (
              <>
                <div className={styles.elseLabel}>否则</div>
                <ElseBranchDropZone
                  command={command}
                  onAddChild={onAddChild}
                  level={level}
                  isDebugMode={isDebugMode}
                  onToggleBreakpoint={onToggleBreakpoint}
                  onRemove={onRemove}
                  onCopy={onCopy}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onDropBefore={onDropBefore}
                  onDropAfter={onDropAfter}
                  onUpdateCommand={onUpdateCommand}
                />
              </>
            )}
          </>
        )}
      </div>
    );
  },
);

export default CommandBlock;
