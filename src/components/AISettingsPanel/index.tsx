import React, { useState } from 'react';
import { Drawer, Switch, Select, InputNumber, Button, Divider, Typography, Space, Modal, Input, Alert, message } from 'antd';
import { RocketOutlined, BulbOutlined, ReloadOutlined, QuestionCircleOutlined, HistoryOutlined, KeyOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAIStore, hasApiKey } from '@/store/aiStore';
import AIHelp from './AIHelp';
import AIHistoryViewer from './AIHistoryViewer';
import styles from './index.module.scss';

const { Title, Text } = Typography;
const { Option } = Select;

interface AISettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onUseLevelResult?: (result: any) => void;
  onUseSolverResult?: (result: any) => void;
}

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ 
  open, 
  onClose, 
  onUseLevelResult, 
  onUseSolverResult 
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const {
    settings,
    usage,
    updateSettings,
    resetDailyUsage,
  } = useAIStore();

  const usagePercentage = Math.min(100, (usage.todayTokens / settings.dailyTokenLimit) * 100);
  const apiKeyConfigured = hasApiKey();

  const handleSaveApiKey = () => {
    if (settings.apiKey && settings.apiKey.trim()) {
      message.success('API Key 已保存');
    }
  };

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>AI 功能设置</span>
            <Space>
              <Button 
                type="text" 
                icon={<HistoryOutlined />}
                onClick={() => setShowHistory(true)}
                size="small"
              />
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined />}
                onClick={() => setShowHelp(true)}
                size="small"
              />
            </Space>
          </div>
        }
        placement="right"
        width={480}
        onClose={onClose}
        open={open}
      >
      <div className={styles.settingsContainer}>
        {!apiKeyConfigured && (
          <Alert
            message="请配置 API Key"
            description="未检测到有效的 API Key，AI 功能将无法使用。请在下方输入您的通义千问 API Key。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <div className={styles.section}>
          <Title level={4}>API 配置</Title>
          
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>
                  <KeyOutlined /> API Key
                </div>
                <Text type="secondary">通义千问 API 密钥</Text>
              </div>
            </div>
            <Input.Password
              placeholder="请输入 API Key (sk-...)"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              visibilityToggle={{
                visible: showApiKey,
                onVisibleChange: setShowApiKey,
              }}
              style={{ width: '100%' }}
            />
            <Input
              placeholder="API Base URL (可选)"
              value={settings.apiBaseUrl}
              onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
              style={{ width: '100%' }}
            />
            <Button type="primary" onClick={handleSaveApiKey} style={{ width: '100%' }}>
              保存 API 配置
            </Button>
          </Space>
        </div>

        <Divider />

        <div className={styles.section}>
          <Title level={4}>功能开关</Title>
          
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>
                  <RocketOutlined /> AI 生成关卡
                </div>
                <Text type="secondary">使用大模型自动生成编程关卡</Text>
              </div>
              <Switch
                checked={settings.enableLevelGeneration}
                onChange={(checked) => updateSettings({ enableLevelGeneration: checked })}
              />
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <div className={styles.settingLabel}>
                  <BulbOutlined /> 自动解题
                </div>
                <Text type="secondary">一键生成最优编程路线</Text>
              </div>
              <Switch
                checked={settings.enableAutoSolve}
                onChange={(checked) => updateSettings({ enableAutoSolve: checked })}
              />
            </div>
          </Space>
        </div>

        <Divider />

        <div className={styles.section}>
          <Title level={4}>使用限制</Title>
          
          <div className={styles.usageInfo}>
            <div className={styles.usageRow}>
              <Text strong>今日使用</Text>
              <Text type={usagePercentage > 80 ? 'danger' : undefined}>
                {usage.todayTokens} / {settings.dailyTokenLimit} tokens
              </Text>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ 
                  width: `${usagePercentage}%`,
                  backgroundColor: usagePercentage > 80 ? '#ff4d4f' : usagePercentage > 50 ? '#faad14' : '#52c41a'
                }} 
              />
            </div>
            <div className={styles.usageRow}>
              <Text type="secondary">累计使用</Text>
              <Text>{usage.totalTokens} tokens</Text>
            </div>
          </div>

          <div className={styles.settingRow} style={{ marginTop: 16 }}>
            <div className={styles.settingInfo}>
              <div className={styles.settingLabel}>每日 Token 限制</div>
            </div>
            <InputNumber
              min={1000}
              max={100000}
              step={1000}
              value={settings.dailyTokenLimit}
              onChange={(value) => updateSettings({ dailyTokenLimit: value || 10000 })}
              style={{ width: 150 }}
            />
          </div>

          <Button 
            icon={<ReloadOutlined />} 
            onClick={resetDailyUsage}
            style={{ marginTop: 8 }}
          >
            重置今日计数
          </Button>
        </div>
      </div>
    </Drawer>

    <Modal
      open={showHelp}
      onCancel={() => setShowHelp(false)}
      footer={null}
      width={500}
    >
      <AIHelp onClose={() => setShowHelp(false)} />
    </Modal>

    <AIHistoryViewer
      open={showHistory}
      onClose={() => setShowHistory(false)}
      onUseLevelResult={onUseLevelResult}
      onUseSolverResult={onUseSolverResult}
    />
    </>
  );
};

export default AISettingsPanel;
