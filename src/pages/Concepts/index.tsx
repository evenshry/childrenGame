import React from "react";
import ProgrammingCard from "@/components/ProgrammingCard";
import "./index.scss";

// 编程概念卡片数据
const programmingCards = [
  {
    title: "顺序执行",
    concept: "Sequential Execution",
    description: "计算机按照指令的顺序依次执行，从第一个指令开始，到最后一个指令结束。",
    example: "前进\n前进\n右转\n前进",
    icon: "🔢",
  },
  {
    title: "循环",
    concept: "Loop",
    description: "循环可以重复执行一组指令，减少重复代码，让程序更简洁。",
    example: "重复 3 次:\n  前进\n  前进\n结束重复",
    icon: "🔄",
  },
  {
    title: "条件判断",
    concept: "Condition",
    description: "根据条件决定是否执行某些指令，让程序更智能。",
    example: "如果前方有障碍:\n  右转\n否则:\n  前进\n结束如果",
    icon: "❓",
  },
  {
    title: "变量",
    concept: "Variable",
    description: "变量可以存储数据，比如位置、数量等，让程序更加灵活。",
    example: "设置 步数 = 5\n重复 步数 次:\n  前进",
    icon: "📊",
  },
  {
    title: "函数",
    concept: "Function",
    description: "函数是一组可以重复使用的指令集合，给它们起一个名字，就可以随时调用。",
    example: '定义函数 "正方形":\n  前进\n  右转\n调用 "正方形"',
    icon: "📦",
  },
  {
    title: "模式识别",
    concept: "Pattern Recognition",
    description: "识别重复出现的模式，可以用循环来简化程序。",
    example: "发现模式:\n前进、右转 重复4次 = 走正方形",
    icon: "🎯",
  },
  {
    title: "规划",
    concept: "Planning",
    description: "在编写程序之前，先规划好机器人的路线和步骤，这是解决问题的重要一步。",
    example: "规划路线:\n1. 从起点出发\n2. 收集星星\n3. 到达终点",
    icon: "🗺️",
  },
  {
    title: "调试",
    concept: "Debugging",
    description: "调试是发现和修复程序错误的过程。通过一步步执行程序，可以观察每个步骤的结果。",
    example: "单步执行:\n  前进 (位置: 0,1)\n  前进 (位置: 0,2)\n  右转 (方向: 右)",
    icon: "🔧",
  },
];

const Concepts: React.FC = () => {
  return (
    <div className="concepts-page">
      <h2>编程概念学习</h2>
      <div className="concepts-grid">
        {programmingCards.map((card, index) => (
          <ProgrammingCard key={index} title={card.title} concept={card.concept} description={card.description} example={card.example} />
        ))}
      </div>
    </div>
  );
};

export default Concepts;
