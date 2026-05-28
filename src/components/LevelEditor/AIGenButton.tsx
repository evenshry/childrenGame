import React, { useState } from 'react';
import { Button, Modal, Form, Select, InputNumber, Radio, message, Space, Spin } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useAILevelGenerator } from '@/hooks/useAILevelGenerator';
import { useAIStore } from '@/store/aiStore';
import { MapData } from '@/types/global';

interface AIGenButtonProps {
  onMapChange: (map: MapData) => void;
  onCreateNewLevel?: (map: MapData) => void;
  currentLevelId?: string | null;
}

const AIGenButton: React.FC<AIGenButtonProps> = ({ onMapChange, onCreateNewLevel, currentLevelId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<'current' | 'new'>('current');
  const [form] = Form.useForm();
  const { generate, error } = useAILevelGenerator();
  const { isGenerating, settings, isDailyLimitReached } = useAIStore();

  const handleGenerate = async () => {
    if (!settings.enableLevelGeneration) {
      message.warning('AI生成关卡功能已禁用，请在设置中开启');
      return;
    }
    
    if (isDailyLimitReached()) {
      message.warning('今日Token使用已达上限，请明天再试');
      return;
    }
    
    const values = form.getFieldsValue() as {
      difficulty: 'easy' | 'medium' | 'hard';
      width: number;
      height: number;
      elements: string[];
    };
    
    const result = await generate({
      difficulty: values.difficulty,
      width: values.width,
      height: values.height,
      elements: values.elements,
    });
    
    if (result) {
      const generatedMap: MapData = {
        width: result.map.width,
        height: result.map.height,
        cells: result.map.cells.map(cell => ({
          x: cell.x,
          y: cell.y,
          type: cell.type as any,
          dir: cell.dir as any,
        })),
        stars: result.map.stars.map(star => ({
          x: star.x,
          y: star.y,
          type: 'star' as const,
        })),
      };
      
      if (applyMode === 'current') {
        onMapChange(generatedMap);
        message.success('关卡已应用到当前关卡');
      } else {
        if (onCreateNewLevel) {
          onCreateNewLevel(generatedMap);
          message.success('已创建新的自定义关卡');
        }
      }
      
      setIsModalOpen(false);
    } else if (error) {
      message.error(error);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<RocketOutlined />}
        onClick={() => setIsModalOpen(true)}
        disabled={isGenerating || !settings.enableLevelGeneration}
        style={{ marginLeft: 8 }}
      >
        AI生成关卡
      </Button>
      
      <Modal
        title="AI生成关卡"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={400}
      >
        <Spin spinning={isGenerating} tip="正在生成关卡...">
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleGenerate}
            initialValues={{
              difficulty: 'easy',
              width: 6,
              height: 6,
              elements: ['star', 'wall'],
            }}
          >
            <Form.Item 
              label="难度" 
              name="difficulty" 
              rules={[{ required: true, message: '请选择难度' }]}
            >
              <Select options={[
                { value: 'easy', label: '简单' },
                { value: 'medium', label: '中等' },
                { value: 'hard', label: '困难' },
              ]} />
            </Form.Item>
            
            <Form.Item 
              label="地图宽度" 
              name="width" 
              rules={[{ required: true, message: '请输入宽度' }]}
            >
              <InputNumber min={5} max={15} />
            </Form.Item>
            
            <Form.Item 
              label="地图高度" 
              name="height" 
              rules={[{ required: true, message: '请输入高度' }]}
            >
              <InputNumber min={5} max={15} />
            </Form.Item>
            
            <Form.Item label="包含元素" name="elements">
              <Select 
                mode="multiple" 
                options={[
                  { value: 'star', label: '星星' },
                  { value: 'wall', label: '障碍物' },
                ]}
              />
            </Form.Item>
            
            <Form.Item label="生成后操作" name="applyMode">
              <Radio.Group 
                value={applyMode} 
                onChange={(e) => setApplyMode(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="current">
                  应用到当前关卡
                </Radio.Button>
                <Radio.Button value="new" disabled={!onCreateNewLevel}>
                  创建新关卡
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={isGenerating} 
                block
                disabled={isGenerating}
              >
                生成关卡
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </>
  );
};

export default AIGenButton;
