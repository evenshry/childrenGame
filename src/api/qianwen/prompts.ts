export const levelGenSystemPrompt = `
你是一个专业的儿童编程游戏关卡设计师，专门为6-12岁的孩子设计有趣且有教育意义的编程关卡。

设计原则：
1. 关卡必须适合对应年龄段的儿童
2. 难度要循序渐进，保持趣味性
3. 确保每个关卡都有明确的学习目标
4. 地图设计要合理，有清晰的路径

输出要求：
- 严格输出标准JSON格式
- 不要包含任何其他文字说明
- 所有字段必须完整
`;

export const levelGenUserPrompt = (request: {
  difficulty: string;
  width: number;
  height: number;
  elements: string[];
}) => `
请为儿童编程游戏生成一个难度为【${request.difficulty}】的关卡。

难度说明（请适当提高难度标准）：
- easy（简单）：需要多次转向，迷宫感更强，3-5个星星，障碍物适中
- medium（中等）：需要复杂路径规划，较多障碍，4-6个星星
- hard（困难）：极具挑战性，多个障碍形成迷宫，大部分星星都要收集，需要精妙规划

关卡要求：
- 地图大小：${request.width}x${request.height}
- 必须包含元素：机器人起始位置（robot）、终点（goal）
- 可选包含元素：${request.elements.join('、')}
- 注意：障碍物要形成有趣的路径，让玩家需要思考如何绕行

输出格式要求：
{
  "map": {
    "width": ${request.width},
    "height": ${request.height},
    "cells": [
      {"x": 0, "y": 0, "type": "robot", "dir": "right"},
      {"x": ${request.width-1}, "y": ${request.height-1}, "type": "goal"},
      {"x": 3, "y": 3, "type": "wall"}
    ],
    "stars": [{"x": 2, "y": 2, "type": "star"}]
  },
  "hint": "简短鼓励性的提示语，50字以内",
  "minCommands": 6
}

注意事项：
1. 机器人起始位置通常在左上角附近
2. 终点通常在右下角附近
3. 星星要分布在机器人前往终点的路径上，但要有一定挑战性
4. minCommands是完成关卡所需的最少指令数，请适当提高
5. dir字段可选值：up, down, left, right
`;

export const solverSystemPrompt = `
你是一个专业的编程路径规划专家，擅长为机器人规划最优路径。

你的核心任务：
1. 仔细分析地图，找出所有需要访问的点
2. 确保路径不会撞到墙壁
3. 收集所有星星
4. 以最少的指令到达终点 - 优先使用循环(loop)和条件判断(if)来减少指令数量

关键思考步骤：
1. 先列出所有目标点（星星 + 终点）的坐标
2. 规划访问顺序，确保路径最短
3. 寻找可以用循环简化的重复模式（如：多次前进、多次转向）
4. 寻找可以用条件判断的场景（如：遇到墙则右转）
5. 一步步规划路径，检查每一步是否撞墙
6. 在每颗星星位置必须执行collect指令
7. 最终位置必须精确到达终点

高级优化技巧：
- 使用loop循环处理重复的移动或转向（如：loop 5 { forward }）
- 使用条件判断if处理分支路径（如：if frontBlocked { right }）
- 循环和条件可以嵌套使用

输出格式：
- 严格JSON格式
- commands数组要优化，尽量使用loop和if减少指令数
- explanation要清晰说明路径规划思路和优化方法
`;

export const solverUserPrompt = (request: {
  map: {
    width: number;
    height: number;
    cells: Array<{ x: number; y: number; type: string }>;
    stars: Array<{ x: number; y: number }>;
  };
  startX: number;
  startY: number;
  startDir: string;
  goalX: number;
  goalY: number;
}) => {
  // 构建网格可视化
  const grid: string[][] = [];
  for (let y = 0; y < request.map.height; y++) {
    grid[y] = [];
    for (let x = 0; x < request.map.width; x++) {
      grid[y][x] = '·'; // 空地
    }
  }
  
  // 放置墙壁
  const wallSet = new Set<string>();
  request.map.cells
    .filter(cell => cell.type === 'wall')
    .forEach(wall => {
      grid[wall.y][wall.x] = '█';
      wallSet.add(`${wall.x},${wall.y}`);
    });
  
  // 放置星星
  request.map.stars.forEach(star => {
    grid[star.y][star.x] = '★';
  });
  
  // 放置起点和终点
  grid[request.startY][request.startX] = '起';
  grid[request.goalY][request.goalX] = '终';
  
  // 构建方向映射
  const dirLabels: Record<string, string> = {
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→'
  };
  
  const gridVisual = grid.map(row => row.join(' ')).join('\n');
   
  // 提取墙壁列表
  const walls = request.map.cells
    .filter(cell => cell.type === 'wall')
    .map(wall => `(${wall.x},${wall.y})`);
   
  // 星星坐标列表
  const starsList = request.map.stars.map(s => `(${s.x},${s.y})`).join(', ') || '无';
   
  return `
请分析以下编程关卡并生成最优解决方案。

【地图可视化】
坐标系说明：左上角是(0,0)，x向右增加，y向下增加
${gridVisual}

【关键位置信息】
- 起点：(${request.startX}, ${request.startY})，初始朝向：${dirLabels[request.startDir] || request.startDir}
- 终点：(${request.goalX}, ${request.goalY})
- 星星坐标：${starsList}
- 墙壁坐标：${walls.join(', ') || '无'}
- 地图大小：${request.map.width}x${request.map.height}

【指令系统】
- forward：向当前朝向移动1格（必须确保前方不是墙壁）
- left：原地左转90°（不移动位置，只改变朝向）
- right：原地右转90°（不移动位置，只改变朝向）
- collect：收集当前位置的星星（仅在有星星的位置执行）

【非常重要的规则（必须严格遵守）】
1. 墙壁(█)不能通过，forward指令前必须检查前方是否是墙壁
2. 所有星星(★)都必须收集，经过星星位置时必须执行collect
3. 最终必须精确到达终点(终)
4. 方向转换(left/right)不改变位置，只改变朝向
5. 坐标系：x轴向右，y轴向下
6. 不要用loop循环，直接列出每一条指令

【路径规划步骤（请严格按照这个步骤思考）】
第一步：列出所有目标点坐标
- 起点：(${request.startX}, ${request.startY})
- 星星：${starsList}
- 终点：(${request.goalX}, ${request.goalY})

第二步：规划访问顺序，确保路径最短

第三步：逐格模拟移动，检查每一步：
- 当前位置 (x,y)
- 当前朝向
- 下一步移动是否撞墙
- 是否需要转向
- 是否需要收集星星

第四步：生成指令序列

【正确示例】
假设3x3地图，起点(0,0)朝右，终点(2,2)，星星(1,1)，无墙壁
基础指令序列（7条）：
1. forward → (1,0)
2. right → 朝下
3. forward → (1,1)
4. collect → 收集星星
5. forward → (1,2)
6. right → 朝右
7. forward → (2,2) 到达终点

优化后使用循环（5条）：
1. forward → (1,0)
2. right → 朝下
3. loop 2: [ forward ] → 先到(1,1)，再到(1,2)，在(1,1)收集星星
4. right → 朝右
5. forward → (2,2) 到达终点

【输出格式】
只输出纯JSON，不要任何其他文字说明：
{
  "commands": [
    {"type": "forward"},
    {"type": "right"},
    {"type": "loop", "params": {"times": 2}, "children": [{"type": "forward"}]},
    {"type": "collect"},
    {"type": "right"},
    {"type": "forward"}
  ],
  "explanation": "使用循环优化：先向右走1格，然后向下走2格（循环2次），收集星星(1,1)，再右转并走到终点，指令从7条优化到6条"
}

注意：
- 在循环中，机器人到达星星位置时会自动收集（但显式collect指令更清晰）
- 优先使用loop和if来减少指令总数！
`;
};
