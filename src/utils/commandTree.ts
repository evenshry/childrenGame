import type { Command } from '@/types/global';
import { generateId } from './id';

export type CommandBranch = 'children' | 'elseChildren';

export interface CommandLocation {
  parentId: string | null;
  branch: CommandBranch;
  index: number;
}

export interface DraggedCommand {
  command: Command;
  isFromPanel: boolean;
}

/** 深拷贝指令树（包含 children / elseChildren / params） */
export const cloneCommands = (commands: Command[]): Command[] =>
  commands.map((command) => ({
    ...command,
    params: command.params ? { ...command.params } : undefined,
    children: command.children ? cloneCommands(command.children) : undefined,
    elseChildren: command.elseChildren ? cloneCommands(command.elseChildren) : undefined,
  }));

/** 深拷贝并重新生成所有 ID（用于复制 / 从面板拖入） */
export const cloneCommandWithNewIds = (command: Command): Command => ({
  ...command,
  id: generateId(),
  params: command.params ? { ...command.params } : undefined,
  children: command.children?.map(cloneCommandWithNewIds),
  elseChildren: command.elseChildren?.map(cloneCommandWithNewIds),
});

/** 对整棵指令树做不可变映射 */
export const mapCommands = (
  commands: Command[],
  mapper: (command: Command) => Command,
): Command[] =>
  commands.map((command) => {
    const withChildren: Command = {
      ...command,
      children: command.children ? mapCommands(command.children, mapper) : undefined,
      elseChildren: command.elseChildren
        ? mapCommands(command.elseChildren, mapper)
        : undefined,
    };
    return mapper(withChildren);
  });

export const findCommandById = (
  commands: Command[],
  id: string,
): Command | undefined => {
  for (const command of commands) {
    if (command.id === id) return command;
    const inChildren = command.children
      ? findCommandById(command.children, id)
      : undefined;
    if (inChildren) return inChildren;
    const inElse = command.elseChildren
      ? findCommandById(command.elseChildren, id)
      : undefined;
    if (inElse) return inElse;
  }
  return undefined;
};

export const containsCommand = (command: Command, id: string): boolean => {
  if (command.id === id) return true;
  return (
    (command.children?.some((child) => containsCommand(child, id)) ?? false) ||
    (command.elseChildren?.some((child) => containsCommand(child, id)) ?? false)
  );
};

export const findCommandLocation = (
  commands: Command[],
  id: string,
  parentId: string | null = null,
  branch: CommandBranch = 'children',
): CommandLocation | null => {
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index];
    if (command.id === id) return { parentId, branch, index };

    if (command.children) {
      const found = findCommandLocation(command.children, id, command.id, 'children');
      if (found) return found;
    }
    if (command.elseChildren) {
      const found = findCommandLocation(
        command.elseChildren,
        id,
        command.id,
        'elseChildren',
      );
      if (found) return found;
    }
  }
  return null;
};

const getSiblingList = (
  commands: Command[],
  location: CommandLocation,
): Command[] | null => {
  if (location.parentId === null) return commands;
  const parent = findCommandById(commands, location.parentId);
  if (!parent) return null;
  return location.branch === 'elseChildren'
    ? parent.elseChildren ?? []
    : parent.children ?? [];
};

const insertIntoList = (
  list: Command[],
  index: number,
  command: Command,
): Command[] => {
  const safeIndex = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, safeIndex), command, ...list.slice(safeIndex)];
};

export const removeCommandFromTree = (
  commands: Command[],
  id: string,
): Command[] =>
  commands
    .filter((command) => command.id !== id)
    .map((command) => ({
      ...command,
      children: command.children
        ? removeCommandFromTree(command.children, id)
        : undefined,
      elseChildren: command.elseChildren
        ? removeCommandFromTree(command.elseChildren, id)
        : undefined,
    }));

export const insertCommandAt = (
  commands: Command[],
  location: CommandLocation,
  command: Command,
): Command[] => {
  if (location.parentId === null) {
    return insertIntoList(commands, location.index, command);
  }

  return commands.map((current) => {
    if (!containsCommand(current, location.parentId as string)) return current;

    if (current.id === location.parentId) {
      const branchKey = location.branch;
      const list = current[branchKey] ?? [];
      return {
        ...current,
        [branchKey]: insertIntoList(list, location.index, command),
      };
    }

    return {
      ...current,
      children: current.children
        ? insertCommandAt(current.children, location, command)
        : undefined,
      elseChildren: current.elseChildren
        ? insertCommandAt(current.elseChildren, location, command)
        : undefined,
    };
  });
};

export const updateCommandInTree = (
  commands: Command[],
  id: string,
  updates: Partial<Command>,
): Command[] =>
  mapCommands(commands, (command) =>
    command.id === id ? { ...command, ...updates } : command,
  );

export const appendChildCommand = (
  commands: Command[],
  parentId: string,
  child: Command,
  branch: CommandBranch = 'children',
): Command[] => {
  const parent = findCommandById(commands, parentId);
  if (!parent) return commands;
  const list = branch === 'elseChildren' ? parent.elseChildren ?? [] : parent.children ?? [];
  return insertCommandAt(
    commands,
    { parentId, branch, index: list.length },
    child,
  );
};

/** 将拖拽指令移动到目标位置；从面板拖入时自动生成新 ID */
export const moveOrInsertCommand = (
  commands: Command[],
  target: CommandLocation,
  dragged: DraggedCommand,
): Command[] => {
  if (dragged.isFromPanel) {
    return insertCommandAt(
      commands,
      target,
      cloneCommandWithNewIds(dragged.command),
    );
  }

  const source = findCommandLocation(commands, dragged.command.id);
  if (!source) return commands;

  // 不允许把父指令拖进自己的子树，否则会形成环
  if (
    target.parentId !== null &&
    containsCommand(dragged.command, target.parentId)
  ) {
    return commands;
  }

  let insertIndex = target.index;
  if (
    source.parentId === target.parentId &&
    source.branch === target.branch &&
    source.index < target.index
  ) {
    insertIndex -= 1;
  }

  const withoutSource = removeCommandFromTree(commands, dragged.command.id);
  return insertCommandAt(
    withoutSource,
    { ...target, index: insertIndex },
    dragged.command,
  );
};

export const moveCommandByOffset = (
  commands: Command[],
  id: string,
  offset: number,
): Command[] => {
  const source = findCommandLocation(commands, id);
  if (!source) return commands;
  const siblings = getSiblingList(commands, source);
  if (!siblings) return commands;

  const targetIndex = source.index + offset;
  if (targetIndex < 0 || targetIndex >= siblings.length) return commands;

  const command = siblings[source.index];
  const withoutSource = removeCommandFromTree(commands, id);
  return insertCommandAt(
    withoutSource,
    { parentId: source.parentId, branch: source.branch, index: targetIndex },
    command,
  );
};

/** 复制一条指令（以及整棵子树）并插入到原指令之后 */
export const duplicateCommandInTree = (
  commands: Command[],
  id: string,
): Command[] => {
  const location = findCommandLocation(commands, id);
  if (!location) return commands;
  const siblings = getSiblingList(commands, location);
  const source = siblings?.[location.index];
  if (!source) return commands;

  return insertCommandAt(commands, { ...location, index: location.index + 1 }, cloneCommandWithNewIds(source));
};