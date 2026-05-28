# 模型配置和自动切换使用指南

## 📁 文件结构

```
src/
├── config/
│   └── models.ts              # 模型配置和定义
├── store/
│   ├── modelStore.ts          # Zustand 模型状态管理
│   └── aiStore.ts            # AI 相关状态管理
├── utils/
│   └── modelManager.ts        # 模型管理工具类
├── hooks/
│   └── useModel.ts           # React Hooks
└── api/
    └── qianwen/
        └── index.ts          # 已集成自动切换
```

## 🚀 快速开始

### 1. 在组件中使用

```tsx
import { useModelSelector, useModelStatistics, useModelQuota } from '@/hooks/useModel';

const MyComponent = () => {
  const { currentModel, selectModel, availableFallbacks } = useModelSelector();
  const { statistics, modelHealth } = useModelStatistics();
  const { usagePercentage, isNearLimit } = useModelQuota();

  return (
    <div>
      <h3>当前模型: {currentModel.name}</h3>
      <p>使用量: {usagePercentage.toFixed(2)}%</p>
      {isNearLimit && <Alert message="配额即将用完" type="warning" />}
      
      <Select onChange={selectModel}>
        {availableFallbacks.map(model => (
          <Option key={model.id} value={model.id}>
            {model.name}
          </Option>
        ))}
      </Select>
    </div>
  );
};
```

### 2. 自动切换功能

API 请求已自动集成模型切换功能，无需额外配置：

```tsx
import { generateLevel, solveLevel } from '@/api/qianwen';

// 这些函数会自动处理模型切换
const handleGenerate = async () => {
  try {
    const result = await generateLevel(request);
    // 成功时会自动记录使用量
  } catch (error) {
    // 失败时会自动尝试切换模型
    console.error('请求失败:', error);
  }
};
```

### 3. 自定义 Hook 使用

#### 获取当前模型
```tsx
import { useCurrentModel } from '@/store/modelStore';

const { model, modelId } = useCurrentModel();
console.log(`使用模型: ${model.name} (${modelId})`);
```

#### 模型切换
```tsx
import { useModelSwitch } from '@/store/modelStore';

const { recordUsage, recordError, switchToNextModel } = useModelSwitch();

// 记录成功使用
recordUsage(1000);

// 记录错误
recordError();

// 手动切换模型
await switchToNextModel();
```

#### 模型统计
```tsx
import { useModelStatistics } from '@/store/modelStore';

const { statistics, modelHealth } = useModelStatistics();

console.log(`总请求数: ${statistics.totalRequests}`);
console.log(`总Token数: ${statistics.totalTokens}`);
console.log(`平均错误率: ${(statistics.averageErrorRate * 100).toFixed(2)}%`);
```

### 4. 模型管理器（高级用法）

```tsx
import { ModelManager, getModelManager } from '@/utils/modelManager';

// 获取单例
const manager = getModelManager();

// 获取当前模型
const currentModel = manager.getCurrentModel();

// 手动切换
manager.setCurrentModel('qwen-plus');

// 获取可用备用模型
const fallbackModels = manager.getAvailableFallback();

// 获取健康状态
const health = manager.getModelHealth();

// 获取统计信息
const stats = manager.getStatistics();
```

## 📊 配置选项

### 修改备用模型列表

在 `src/config/models.ts` 中修改：

```typescript
export const DEFAULT_MODEL_CONFIGS: ModelConfig = {
  apiBaseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  defaultModel: 'qwen-turbo',
  fallbackModels: [
    'qwen-plus',           // 首先尝试
    'qwen-max',
    'qwen-flash',
    'deepseek-r1',
    // 添加更多备用模型...
  ],
  models: MODEL_LIST,
};
```

### 修改切换策略

```tsx
import { useModelConfig } from '@/hooks/useModel';

const { switchConfig, updateConfig } = useModelConfig();

// 修改重试次数
updateConfig({ maxRetries: 5 });

// 修改重试延迟
updateConfig({ retryDelayMs: 2000 });

// 禁用错误时自动切换
updateConfig({ fallbackOnError: false });

// 禁用配额超限时自动切换
updateConfig({ fallbackOnQuotaExceeded: false });
```

### 禁用/启用自动切换

```tsx
import { useModelConfig } from '@/hooks/useModel';

const { isAutoSwitchEnabled, toggleAutoSwitch } = useModelConfig();

// 切换状态
toggleAutoSwitch();

// 禁用
toggleAutoSwitch(false);

// 启用
toggleAutoSwitch(true);
```

## 🔧 高级功能

### 自定义模型切换逻辑

```tsx
import { ModelManager } from '@/utils/modelManager';

const manager = new ModelManager(
  { defaultModel: 'qwen-turbo' },
  {
    enabled: true,
    maxRetries: 5,
    retryDelayMs: 2000,
    fallbackOnError: true,
    fallbackOnQuotaExceeded: true,
  }
);

// 监听模型变化
const unsubscribe = manager.onModelChange((model) => {
  console.log(`模型已切换到: ${model.name}`);
});

// 取消监听
unsubscribe();
```

### 使用 withModelSwitch 包装函数

```tsx
import { withModelSwitch, getModelManager } from '@/utils/modelManager';

const result = await withModelSwitch(
  async (modelId) => {
    // 你的API调用
    return await callAPI(modelId);
  },
  {
    maxRetries: 3,
    onSwitch: (from, to) => {
      console.log(`从 ${from} 切换到 ${to}`);
    },
    onError: (error, model) => {
      console.error(`模型 ${model.id} 出错:`, error);
    },
  }
);
```

## 📈 监控和调试

### 查看模型健康状态

```tsx
import { useModelHealthMonitor } from '@/hooks/useModel';

const { isHealthy, healthyModels, unhealthyModels } = useModelHealthMonitor();

if (!isHealthy) {
  console.log('有问题的模型:', unhealthyModels);
}
```

### 重置使用统计

```tsx
import { useModelStore } from '@/store/modelStore';

const resetUsage = useModelStore(state => state.resetUsage);

// 重置所有模型的使用统计
resetUsage();

// 重置特定模型
resetUsage('qwen-turbo');
```

### 查看详细统计

```tsx
import { useModelStatistics } from '@/hooks/useModel';

const { statistics, modelHealth } = useModelStatistics();

console.table({
  '总请求数': statistics.totalRequests,
  '总Token数': statistics.totalTokens,
  '总错误数': statistics.totalErrors,
  '使用模型数': statistics.modelCount,
  '错误率': `${(statistics.averageErrorRate * 100).toFixed(2)}%`,
});

console.table(modelHealth);
```

## ⚙️ 环境变量配置

在 `.env` 文件中配置 API Key：

```bash
VITE_QIANWEN_API_KEY=your-api-key-here
```

## 🐛 故障排除

### 模型切换不生效

1. 检查 `isAutoSwitchEnabled` 是否为 `true`
2. 检查 `fallbackModels` 列表是否包含可用模型
3. 检查模型使用量是否正常记录

### 所有模型都失败

1. 检查 API Key 是否有效
2. 检查网络连接
3. 查看控制台错误信息
4. 尝试手动禁用自动切换

### 配额计算不准确

- 配额数据从 API 响应中的 `usage` 字段获取
- 如果 API 不返回使用量，配额数据可能不准确
- 可以手动调整 `quota` 配置

## 📝 API 响应格式

模型切换时会记录以下信息：

```typescript
interface ModelUsage {
  modelId: string;
  requestCount: number;      // 请求次数
  totalTokens: number;       // 总Token数
  lastUsed: number;           // 最后使用时间戳
  errorCount: number;         // 错误次数
}
```

## 🔄 自动切换流程

1. **请求失败** → 记录错误
2. **错误次数 ≥ 3** → 触发切换条件
3. **检查切换配置** → 确认是否允许切换
4. **获取备用模型** → 从列表中选择下一个
5. **切换模型** → 更新当前模型
6. **重试请求** → 使用新模型重试
7. **成功/失败** → 记录结果

## 💡 最佳实践

1. **保留足够备用模型**：建议至少保留 3-5 个备用模型
2. **监控使用量**：定期检查模型配额，避免意外耗尽
3. **合理设置重试**：根据实际需求调整重试次数和延迟
4. **处理错误**：即使有自动切换，也要做好错误处理
5. **记录日志**：便于排查问题和优化策略

## 📚 相关文档

- [阿里云百炼 API 文档](https://help.aliyun.com/zh/dashscope/)
- [Zustand 文档](https://docs.pmnd.rs/zustand)
- [Axios 文档](https://axios-http.com/)
