import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import App from './App';
import { antdTheme } from '@/config/theme';
import { registerApiRuntime } from '@/api/qianwen';
import { useAIStore, getApiKey, getApiBaseUrl, hasApiKey } from '@/store/aiStore';
import { useModelStore } from '@/store/modelStore';

// API 层依赖注入：让 API 模块不直接 import Store
registerApiRuntime({
  getApiKey,
  getApiBaseUrl,
  hasApiKey,
  onUsageUpdate: (input, output) => useAIStore.getState().updateUsage(input, output),
  getCurrentModelId: () => useModelStore.getState().currentModelId,
  recordUsage: () => useModelStore.getState().recordUsage(),
  recordError: () => useModelStore.getState().recordError(),
  getModelSwitchState: () => {
    const s = useModelStore.getState();
    return {
      enabled: s.switchConfig.enabled,
      fallbackOnError: s.switchConfig.fallbackOnError,
      fallbackOnQuotaExceeded: s.switchConfig.fallbackOnQuotaExceeded,
      retryDelayMs: s.switchConfig.retryDelayMs,
      availableFallback: s.getAvailableFallback(),
    };
  },
  switchToNextModel: () => {
    const s = useModelStore.getState();
    const prev = s.currentModelId;
    const available = s.getAvailableFallback();
    if (available.length === 0) {
      message.error('所有备用模型都不可用');
      return null;
    }
    const next = available[0];
    s.setCurrentModel(next.id);
    message.info(`已切换到备用模型: ${next.name}`);
    return { from: prev, to: next.id };
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <App />
      </ConfigProvider>
    </DndProvider>
  </React.StrictMode>
);
