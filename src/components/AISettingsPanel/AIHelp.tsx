import React from 'react';
import { Button, Typography, Space, Card, List } from 'antd';
import { QuestionCircleOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface AIHelpProps {
  onClose: () => void;
}

const AIHelp: React.FC<AIHelpProps> = ({ onClose }) => {
  const features = [
    {
      title: '🤖 AI生成关卡',
      description: '一键生成适合不同难度的编程关卡，包含地图、星星和障碍物'
    },
    {
      title: '💬 故事对话',
      description: '游戏过程中机器人会与你互动，给予鼓励和小提示'
    },
    {
      title: '💡 AI解题',
      description: '遇到困难时，可以让AI帮你分析关卡并给出最优解法'
    }
  ];

  const tips = [
    '合理使用每日Token限制，避免过度依赖AI',
    '先自己尝试解题，实在困难再使用AI解题功能',
    '可以在设置中调整故事对话的频率',
    '历史记录可以查看AI功能的使用情况'
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={4} style={{ margin: 0 }}>
          <QuestionCircleOutlined style={{ marginRight: '8px' }} />
          AI功能使用说明
        </Title>
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={onClose}
        />
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {features.map((feature, index) => (
          <Card key={index} size="small" title={feature.title}>
            <Paragraph>{feature.description}</Paragraph>
          </Card>
        ))}

        <Card size="small" title="💡 使用建议">
          <List
              dataSource={tips}
              renderItem={(item: string) => (
                <List.Item>
                  <List.Item.Meta title={item} />
                </List.Item>
              )}
            />
        </Card>
      </Space>
    </div>
  );
};

export default AIHelp;