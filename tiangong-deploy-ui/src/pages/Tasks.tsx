import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Descriptions, Badge } from 'antd';
import { ReloadOutlined, EyeOutlined, CodeOutlined, FileTextOutlined, ConsoleSqlOutlined, ApiOutlined } from '@ant-design/icons';
import { Task } from '../types';
import { mockTasks, mockAgents } from '../mock/data';

export default function Tasks() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockTasks);
      setLoading(false);
    }, 500);
  }, []);

  const getAgentName = (id: string) => {
    return mockAgents.find(a => a.id === id)?.name || id;
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'shell': return <CodeOutlined />;
      case 'sql': return <ConsoleSqlOutlined />;
      case 'api': return <ApiOutlined />;
      case 'file': return <FileTextOutlined />;
      default: return <CodeOutlined />;
    }
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Space>
          {getTaskIcon(type)}
          <span>{type.toUpperCase()}</span>
        </Space>
      ),
    },
    {
      title: 'Agent',
      dataIndex: 'agent_id',
      key: 'agent_id',
      render: (id: string) => <Tag color="blue">{getAgentName(id)}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'success' ? 'success' : status === 'running' ? 'processing' : 'error';
        return <Badge status={color as any} text={status.toUpperCase()} />;
      },
    },
    {
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Task) => (
        <Space size="middle">
          <a onClick={() => { setSelectedTask(record); setIsModalVisible(true); }}>
            <EyeOutlined /> 查看日志
          </a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>任务管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="任务详情"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTask && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="ID">{selectedTask.id}</Descriptions.Item>
              <Descriptions.Item label="类型">{selectedTask.type}</Descriptions.Item>
              <Descriptions.Item label="Agent">{getAgentName(selectedTask.agent_id)}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedTask.status === 'success' ? 'green' : 'red'}>{selectedTask.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Command" span={2}>
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
                  {selectedTask.command}
                </pre>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: '24px' }}>
              <h4>执行日志</h4>
              <div style={{ background: '#1e1e1e', color: '#fff', padding: '16px', borderRadius: '4px', fontFamily: 'monospace', height: '300px', overflow: 'auto' }}>
                <div>[INFO] Starting task execution...</div>
                <div>[INFO] Agent: {getAgentName(selectedTask.agent_id)}</div>
                <div>[INFO] Command: {selectedTask.command}</div>
                <div>[INFO] Executing...</div>
                {selectedTask.status === 'success' ? (
                  <>
                    <div style={{ color: '#52c41a' }}>[SUCCESS] Task completed successfully.</div>
                    <div>Output: Hello World</div>
                  </>
                ) : (
                  <div style={{ color: '#ff4d4f' }}>[ERROR] Task failed with exit code 1.</div>
                )}
                <div>[INFO] Finished at {new Date(selectedTask.updated_at).toISOString()}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
