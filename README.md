# 指令大冒险 - 编程启蒙游戏

一个面向儿童和编程初学者的可视化编程教育游戏，通过拖拽指令块控制机器人完成各种任务。集成 AI 功能，支持自动解题和智能关卡生成。

**在线体验**: https://evenshry.github.io/childrenGame/

[English](README_EN.md) | 简体中文

## ✨ 功能特性

### 🎮 游戏模式
- **拖拽编程**：通过拖拽指令块编写程序
- **实时预览**：即时查看机器人执行效果
- **调试模式**：单步执行、设置断点、查看执行日志
- **关卡系统**：包含多个精心设计的教学关卡
- **关卡编辑器**：可视化自定义关卡创建和编辑

### 🤖 AI 智能辅助
- **AI 自动解题**：一键生成关卡解决方案，帮助学习编程思路
- **AI 关卡生成**：通过 AI 智能生成新的关卡，提供无限挑战
- **多模型支持**：支持 20+ 种大语言模型（千问、DeepSeek、GLM 等）
- **智能容错**：API 请求失败时自动重试或切换到备用模型

### 📚 编程概念学习
| 指令类型 | 描述 |
|---------|------|
| 基础指令 | 前进、左转、右转 |
| 循环指令 | 循环 N 次、重复直到条件满足 |
| 条件指令 | 如果前面被阻挡、如果有星星、如果接近终点等 |
| 特殊指令 | 收集物品、等待、随机转向 |

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- Yarn 4（通过 Corepack 启用）

### 安装依赖

```bash
corepack enable
yarn install
```

### 启动开发服务器

```bash
yarn dev
```

应用将在 http://localhost:5173 打开

### 构建生产版本

```bash
yarn build
```

构建产物将输出到 `dist` 目录

### 代码规范检查

```bash
yarn lint
```

## ⚙️ 环境变量配置

项目支持以下环境变量，创建 `.env` 或 `.env.deploy` 文件：

```env
# 千问 API 配置（用于 AI 功能）
VITE_QIANWEN_API_KEY=your_api_key_here
VITE_QIANWEN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
```

### 获取 API Key

1. 访问 [阿里云百炼](https://bailian.console.aliyun.com/)
2. 创建应用或获取 API Key
3. 将 API Key 填入环境变量或 AI 设置面板

## 🛠️ 技术栈

- **前端框架**：React 18 + TypeScript
- **UI 组件库**：Ant Design 5
- **样式方案**：Sass + CSS Modules
- **状态管理**：Zustand（支持持久化）
- **路由管理**：React Router v6（HashRouter）
- **拖拽功能**：React DnD
- **AI 集成**：阿里云千问 API（支持多模型切换）
- **HTTP 客户端**：Axios
- **构建工具**：Vite
- **代码规范**：ESLint + Prettier

## 📁 项目结构

```
src/
├── api/                    # API 请求层（阿里云千问）
├── assets/                 # 静态资源
├── components/             # 通用组件
│   ├── AISettingsPanel/    # AI 设置面板
│   ├── AchievementWall/    # 成就墙
│   ├── CommandBlock/       # 指令块
│   ├── CommandPanel/       # 指令面板
│   ├── GameCanvas/         # 游戏画布
│   ├── HintSystem/         # 提示系统
│   ├── LevelEditor/        # 关卡编辑器
│   └── ...
├── config/                 # 配置文件
├── hooks/                  # 自定义 Hooks
├── pages/                  # 页面组件
├── router/                 # 路由配置
├── store/                  # Zustand 状态管理
├── styles/                 # 全局样式
├── types/                  # TypeScript 类型定义
└── utils/                  # 工具函数
```

## 🎨 设计原则

1. **类型优先**：所有 API、Props、State 必须有 TypeScript 类型
2. **样式隔离**：使用 CSS Modules + 全局变量，避免全局污染
3. **组件复用**：Ant Design 为基础，业务组件按需封装
4. **状态可控**：Zustand 管理全局状态，组件状态管理局部状态
5. **性能意识**：懒加载、useCallback、useMemo 优化
6. **规范落地**：ESLint + Prettier 保证代码质量

## 📖 更多文档

详细开发规范和核心代码解释请查看 [项目说明文档](项目说明.md)

## 📄 许可证

© 2026 指令大冒险 - 编程启蒙游戏
