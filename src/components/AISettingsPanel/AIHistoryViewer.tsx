import React, { useState } from 'react';
import { Modal, Table, Button, Typography, Space, Tag, Descriptions, Empty, message } from 'antd';
import { HistoryOutlined, ReloadOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAIStore, type AIHistoryEntry } from '@/store/aiStore';
import { useAILevelGenerator } from '@/hooks/useAILevelGenerator';
import { useAIAutoSolver } from '@/hooks/useAIAutoSolver';

const { Title, Text, Paragraph } = Typography;

interface AIHistoryViewerProps {
  open: boolean;
  onClose: () => void;
  onUseLevelResult?: (levelData: any) => void;
  onUseSolverResult?: (solverData: any) => void;
}

const AIHistoryViewer: React.FC<AIHistoryViewerProps> = ({ open, onClose, onUseLevelResult, onUseSolverResult }) => {
  const { generationHistory, clearHistory, deleteHistoryEntry, getHistoryById } = useAIStore();
  const { generate: generateLevel } = useAILevelGenerator();
  const { solve: solveLevel } = useAIAutoSolver();
  const [selectedEntry, setSelectedEntry] = useState<AIHistoryEntry | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    message.success('历史记录已删除');
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      level: '🚀',
      solve: '💡',
    };
    return icons[type] || '❓';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      level: '生成关卡',
      solve: '自动解题',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      level: 'blue',
      solve: 'orange',
    };
    return colors[type] || 'default';
  };

  const renderHistoryDetail = (entry: AIHistoryEntry) => {
    switch (entry.type) {
      case 'level': {
        const data = entry.data as any;
        return (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions title="请求参数" column={1} bordered size="small">
              <Descriptions.Item label="难度">{data.request?.difficulty}</Descriptions.Item>
              <Descriptions.Item label="地图大小">{`${data.request?.width} x ${data.request?.height}`}</Descriptions.Item>
              <Descriptions.Item label="元素">{data.request?.elements?.join(', ')}</Descriptions.Item>
            </Descriptions>
            
            {data.result && (
              <Descriptions title="生成结果" column={1} bordered size="small">
                <Descriptions.Item label="提示语">{data.result.hint}</Descriptions.Item>
                <Descriptions.Item label="最少指令">{data.result.minCommands}</Descriptions.Item>
                <Descriptions.Item label="星星数量">{data.result.map?.stars?.length}</Descriptions.Item>
              </Descriptions>
            )}

            {entry.success && onUseLevelResult && (
              <Button 
                type="primary" 
                onClick={() => {
                  onUseLevelResult(data.result);
                  onClose();
                }}
              >
                使用此关卡
              </Button>
            )}
          </Space>
        );
      }

      case 'solve': {
        const data = entry.data as any;
        return (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions title="关卡信息" column={1} bordered size="small">
              <Descriptions.Item label="起点">{`(${data.request?.startX}, ${data.request?.startY}) - ${data.request?.startDir}`}</Descriptions.Item>
              <Descriptions.Item label="终点">{`(${data.request?.goalX}, ${data.request?.goalY})`}</Descriptions.Item>
            </Descriptions>
            
            {data.result && (
              <>
                <Descriptions title="解题说明" column={1} bordered size="small">
                  <Descriptions.Item label="说明">{data.result.explanation}</Descriptions.Item>
                </Descriptions>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8'
                }}>
                  <Text strong>指令序列（{data.result.commands?.length}条）：</Text>
                  <div style={{ 
                    marginTop: '8px', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {data.result.commands?.map((cmd: any, idx: number) => (
                      <Tag key={idx} color="blue">{cmd.type}</Tag>
                    ))}
                  </div>
                </div>

                {entry.success && onUseSolverResult && (
                  <Button 
                    type="primary" 
                    onClick={() => {
                      onUseSolverResult(data.result);
                      onClose();
                    }}
                  >
                    使用此解法
                  </Button>
                )}
              </>
            )}
          </Space>
        );
      }

      default:
        return <Text>暂无详细信息</Text>;
    }
  };

  const handleReplay = async (entry: AIHistoryEntry) => {
    if (isReplaying) return;
    
    setIsReplaying(true);
    
    try {
      if (entry.type === 'level') {
        const data = entry.data as any;
        const result = await generateLevel(data.request);
        if (result && onUseLevelResult) {
          onUseLevelResult(result);
          message.success('重新生成关卡成功！');
          onClose();
        }
      } else if (entry.type === 'solve') {
        const data = entry.data as any;
        const result = await solveLevel(data.request);
        if (result && onUseSolverResult) {
          onUseSolverResult(result);
          message.success('重新解题成功！');
          onClose();
        }
      }
    } catch (err) {
      message.error('重新执行失败');
    } finally {
      setIsReplaying(false);
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {getTypeIcon(type)} {getTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: 'Token',
      dataIndex: 'tokensUsed',
      key: 'tokensUsed',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 120,
      render: (success: boolean, record: AIHistoryEntry) => (
        <div>
          <Tag color={success ? 'success' : 'error'}>
            {success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            {success ? '成功' : '失败'}
          </Tag>
          {!success && record.error && (
            <div style={{ 
              fontSize: '11px', 
              color: '#ff4d4f', 
              marginTop: '4px',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {record.error}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: AIHistoryEntry) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => setSelectedEntry(record)}
          >
            查看
          </Button>
          {record.success && (
            <Button 
              type="text" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={() => handleReplay(record)}
              loading={isReplaying}
            >
              重放
            </Button>
          )}
          <Button 
            type="text" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>AI 历史记录</span>
          </Space>
        }
        open={open}
        onCancel={onClose}
        footer={
          <Space>
            {generationHistory.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={clearHistory}>
                清空历史
              </Button>
            )}
            <Button onClick={onClose}>关闭</Button>
          </Space>
        }
        width={800}
      >
        {generationHistory.length === 0 ? (
          <Empty 
            description="暂无 AI 操作记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={generationHistory}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true,
            }}
            size="small"
          />
        )}
      </Modal>

      <Modal
        title={
          selectedEntry ? (
            <Space>
              {getTypeIcon(selectedEntry.type)}
              <span>{getTypeLabel(selectedEntry.type)}详情</span>
            </Space>
          ) : '详情'
        }
        open={!!selectedEntry}
        onCancel={() => setSelectedEntry(null)}
        footer={
          <Button onClick={() => setSelectedEntry(null)}>关闭</Button>
        }
        width={700}
      >
        {selectedEntry && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="时间">{new Date(selectedEntry.timestamp).toLocaleString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="Token">{selectedEntry.tokensUsed}</Descriptions.Item>
              {selectedEntry.error && (
                <Descriptions.Item label="错误" span={2} style={{ color: '#ff4d4f' }}>
                  {selectedEntry.error}
                </Descriptions.Item>
              )}
            </Descriptions>
            {renderHistoryDetail(selectedEntry)}
            
            {/* 显示原始API响应数据 */}
            {(selectedEntry.data as any)?.rawResponse && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>原始API响应数据：</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '8px',
                  border: '1px solid #e8e8e8',
                  fontSize: '11px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  marginTop: '8px'
                }}>
                  {JSON.stringify((selectedEntry.data as any).rawResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default AIHistoryViewer;
