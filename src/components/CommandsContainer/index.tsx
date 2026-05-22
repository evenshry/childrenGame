import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import CommandBlock from "@/components/CommandBlock";
import { Command, DebugStep } from "@/types/global";
import styles from "./index.module.scss";

export interface CommandsContainerProps {
  commands: Command[];
  onAddCommand: (command: Command) => void;
  onRemoveCommand: (id: string) => void;
  onAddChild: (parentId: string, childCommand: Command, branch?: 'children' | 'elseChildren') => void;
  onCopyCommand?: (command: Command) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDropBefore?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  onDropAfter?: (index: number, draggedItem: { command: Command; isFromPanel: boolean }) => void;
  isDebugMode?: boolean;
  currentStep?: number;
  debugSteps?: DebugStep[];
  breakpoints?: string[];
  onToggleBreakpoint?: (id: string) => void;
  onUpdateCommand?: (id: string, updates: Partial<Command>) => void;
}

const CommandsContainer: React.FC<CommandsContainerProps> = React.memo(
  ({
    commands,
    onAddCommand,
    onRemoveCommand,
    onAddChild,
    onCopyCommand,
    onMoveUp,
    onMoveDown,
    onDropBefore,
    onDropAfter,
    isDebugMode = false,
    currentStep = 0,
    debugSteps = [],
    breakpoints = [],
    onToggleBreakpoint,
    onUpdateCommand,
  }) => {
    const [{ isOver }, drop] = useDrop<{ command: Command; isFromPanel: boolean }, void, { isOver: boolean }>({
      accept: "command",
      drop: (item, monitor) => {
        if (monitor.didDrop()) {
          console.log('🚫 CommandsContainer drop skipped (already handled)');
          return;
        }
        
        if (item.isFromPanel && monitor.isOver({ shallow: true })) {
          console.log('📥 CommandsContainer drop:', {
            commandType: item.command.type,
            level: 'root',
          });
          onAddCommand(item.command);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    useEffect(() => {
      console.log("commands list", JSON.stringify(commands));
    }, [commands]);

    return (
      <div ref={drop} className={`${styles.commandsContainer} ${isOver ? styles.dropOver : ""}`}>
        {commands.map((command, index) => {
          // 检查是否是当前执行步骤
          const isCurrentStep = debugSteps.some((step) => step.command.id === command.id && step.index === currentStep);
          // 检查是否有断点
          const hasBreakpoint = breakpoints.includes(command.id);

          return (
            <CommandBlock
              key={command.id}
              command={command}
              onRemove={onRemoveCommand}
              onAddChild={onAddChild}
              onCopy={onCopyCommand}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isDebugMode={isDebugMode}
              isCurrentStep={isCurrentStep}
              hasBreakpoint={hasBreakpoint}
              onToggleBreakpoint={onToggleBreakpoint}
              index={index}
              total={commands.length}
              onDropBefore={onDropBefore}
              onDropAfter={onDropAfter}
              onUpdateCommand={onUpdateCommand}
            />
          );
        })}
      </div>
    );
  },
);

export default CommandsContainer;
