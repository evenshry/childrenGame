export interface ModelQuota {
  total: number;
  used: number;
  remaining: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'vision' | 'coder' | 'math' | 'ocr';
  capabilities: string[];
  maxTokens: number;
  recommendedFor: string[];
  quota?: ModelQuota;
}

export interface ModelConfig {
  apiBaseUrl: string;
  defaultModel: string;
  fallbackModels: string[];
  models: ModelInfo[];
}

export const MODEL_LIST: ModelInfo[] = [
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    description: '快速响应模型，适合日常任务',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 8192,
    recommendedFor: ['快速响应', '简单任务'],
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    description: '高性能模型，适合复杂任务',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['复杂分析', '长文本'],
  },
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    description: '最强模型，适合高精度任务',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析', '推理'],
    maxTokens: 32768,
    recommendedFor: ['高精度任务', '复杂推理'],
  },
  {
    id: 'qwen-flash',
    name: 'Qwen Flash',
    description: '极速模型，适合快速批量任务',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 8192,
    recommendedFor: ['批量任务', '快速响应'],
  },
  {
    id: 'qwen-vl-plus',
    name: 'Qwen VL Plus',
    description: '视觉增强模型，支持图像理解',
    type: 'vision',
    capabilities: ['图像理解', '图文对话', '文本生成'],
    maxTokens: 8192,
    recommendedFor: ['图像分析', '图文理解'],
  },
  {
    id: 'qwen-vl-max',
    name: 'Qwen VL Max',
    description: '最强视觉模型',
    type: 'vision',
    capabilities: ['图像理解', '图文对话', '文本生成'],
    maxTokens: 8192,
    recommendedFor: ['高精度图像分析'],
  },
  {
    id: 'qwen-coder-plus',
    name: 'Qwen Coder Plus',
    description: '编程增强模型',
    type: 'coder',
    capabilities: ['代码生成', '代码分析', '调试'],
    maxTokens: 32768,
    recommendedFor: ['代码生成', '编程辅助'],
  },
  {
    id: 'qwen-math-plus',
    name: 'Qwen Math Plus',
    description: '数学推理增强模型',
    type: 'math',
    capabilities: ['数学推理', '问题求解', '分析'],
    maxTokens: 8192,
    recommendedFor: ['数学问题', '逻辑推理'],
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: '深度推理模型',
    type: 'text',
    capabilities: ['深度推理', '问题分析', '复杂任务'],
    maxTokens: 32768,
    recommendedFor: ['复杂推理', '深度分析'],
  },
  {
    id: 'deepseek-r1-distill-qwen-7b',
    name: 'DeepSeek R1 Distill Qwen 7B',
    description: '蒸馏小模型，快速响应',
    type: 'text',
    capabilities: ['推理', '快速响应'],
    maxTokens: 8192,
    recommendedFor: ['快速推理', '轻量任务'],
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek R1 Distill Qwen 32B',
    description: '蒸馏中模型，平衡性能',
    type: 'text',
    capabilities: ['推理', '分析'],
    maxTokens: 16384,
    recommendedFor: ['中等复杂度任务'],
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    description: '智谱glm-5模型',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['通用任务'],
  },
  {
    id: 'glm-4.5-air',
    name: 'GLM-4.5 Air',
    description: '智谱轻量模型',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 8192,
    recommendedFor: ['快速响应'],
  },
  {
    id: 'qwen3-8b',
    name: 'Qwen3 8B',
    description: 'Qwen3 小参数模型',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 32768,
    recommendedFor: ['轻量任务'],
  },
  {
    id: 'qwen3-14b',
    name: 'Qwen3 14B',
    description: 'Qwen3 中参数模型',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['中等复杂度任务'],
  },
  {
    id: 'qwen3-32b',
    name: 'Qwen3 32B',
    description: 'Qwen3 中大参数模型',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析', '推理'],
    maxTokens: 32768,
    recommendedFor: ['复杂任务'],
  },
  {
    id: 'qwen3.5-plus',
    name: 'Qwen3.5 Plus',
    description: 'Qwen3.5 增强版',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['高性能任务'],
  },
  {
    id: 'qwen3.5-flash',
    name: 'Qwen3.5 Flash',
    description: 'Qwen3.5 快速版',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 32768,
    recommendedFor: ['快速响应'],
  },
  {
    id: 'qwen3.6-flash',
    name: 'Qwen3.6 Flash',
    description: 'Qwen3.6 快速版',
    type: 'text',
    capabilities: ['文本生成', '对话'],
    maxTokens: 32768,
    recommendedFor: ['快速响应'],
  },
  {
    id: 'qwen3.6-plus',
    name: 'Qwen3.6 Plus',
    description: 'Qwen3.6 增强版',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['高性能任务'],
  },
  {
    id: 'qwen3-max',
    name: 'Qwen3 Max',
    description: 'Qwen3 最强模型',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析', '推理'],
    maxTokens: 32768,
    recommendedFor: ['高精度任务'],
  },
  {
    id: 'qwen3-coder-plus',
    name: 'Qwen3 Coder Plus',
    description: 'Qwen3 编程增强模型',
    type: 'coder',
    capabilities: ['代码生成', '代码分析'],
    maxTokens: 32768,
    recommendedFor: ['编程任务'],
  },
  {
    id: 'qwen3-coder-flash',
    name: 'Qwen3 Coder Flash',
    description: 'Qwen3 编程快速版',
    type: 'coder',
    capabilities: ['代码生成'],
    maxTokens: 16384,
    recommendedFor: ['快速编程任务'],
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    description: 'Kimi K2 模型',
    type: 'text',
    capabilities: ['文本生成', '对话', '分析'],
    maxTokens: 32768,
    recommendedFor: ['通用任务'],
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    description: 'Kimi K2 思考模型',
    type: 'text',
    capabilities: ['深度推理', '问题分析'],
    maxTokens: 32768,
    recommendedFor: ['复杂推理任务'],
  },
  {
    id: 'qwen-vl-ocr',
    name: 'Qwen VL OCR',
    description: 'OCR 识别模型',
    type: 'ocr',
    capabilities: ['文字识别', '文档理解'],
    maxTokens: 8192,
    recommendedFor: ['OCR识别', '文档分析'],
  },
];

export const DEFAULT_MODEL_CONFIGS: ModelConfig = {
  apiBaseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  defaultModel: 'qwen-turbo',
  fallbackModels: [
    'qwen-plus',
    'qwen-max',
    'qwen-flash',
    'qwen3.5-flash',
    'qwen3-32b',
    'deepseek-r1',
    'deepseek-r1-distill-qwen-7b',
    'glm-5',
  ],
  models: MODEL_LIST,
};

export const MODEL_TYPE_PRIORITY: Record<string, number> = {
  text: 1,
  coder: 2,
  math: 2,
  vision: 3,
  ocr: 4,
};

export const getModelById = (modelId: string): ModelInfo | undefined => {
  return MODEL_LIST.find(model => model.id === modelId);
};

export const getModelsByType = (type: ModelInfo['type']): ModelInfo[] => {
  return MODEL_LIST.filter(model => model.type === type);
};

export const getRecommendedModels = (capability: string): ModelInfo[] => {
  return MODEL_LIST.filter(model => 
    model.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
  );
};
