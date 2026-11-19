import React from "react";
import { useDrop } from "react-dnd";
import CommandBlock from "@/components/CommandBlock";
import { Command } from "@/types/global";
import type { CommandLocation, DraggedCommand } from "@/utils/commandTree";
import styles from "./index.module.scss";

export interface CommandsContainerProps {
  commands: Command[];
  onAddCommand: (command: Command) => void;
  onRemoveCommand: (id: string) => void;
  onAddChild: (parentId: string, childCommand: Command, branch?: 'children' | 'elseChildren') => void;
  onCopyCommand?: (command: Command) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDropBefore?: (location: CommandLocation, draggedItem: DraggedCommand) => void;
  onDropAfter?: (location: CommandLocation, draggedItem: DraggedCommand) => void;
  isDebugMode?: boolean;
  breakpoints?: string[];
  onToggleBreakpoint?: (id: string) => void;
  onUpdateCommand?: (id: string, updates: Partial<Command>) => void;
  currentCommandId?: string | null;
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
    breakpoints = [],
    onToggleBreakpoint,
    onUpdateCommand,
    currentCommandId = null,
  }) => {
    const [{ isOver }, drop] = useDrop<DraggedCommand, void, { isOver: boolean }>({
      accept: "command",
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        if (item.isFromPanel && monitor.isOver({ shallow: true })) {
          onAddCommand(item.command);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    return (
      <div ref={drop} className={`${styles.commandsContainer} ${isOver ? styles.dropOver : ""}`}>
        {commands.map((command, index) => (
          <CommandBlock
            key={command.id}
            command={command}
            parentId={null}
            branch="children"
            onRemove={onRemoveCommand}
            onAddChild={onAddChild}
            onCopy={onCopyCommand}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            isDebugMode={isDebugMode}
            isCurrentStep={currentCommandId === command.id}
            currentCommandId={currentCommandId}
            hasBreakpoint={breakpoints.includes(command.id)}
            onToggleBreakpoint={onToggleBreakpoint}
            index={index}
            total={commands.length}
            onDropBefore={onDropBefore}
            onDropAfter={onDropAfter}
            onUpdateCommand={onUpdateCommand}
          />
        ))}
      </div>
    );
  },
);

export default CommandsContainer;