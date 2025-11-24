import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Tabs, Input, Form, Switch, Modal } from 'antd';
import { ReloadOutlined, SaveOutlined, HistoryOutlined, DiffOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface ConfigItem {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export default function Configuration() {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);

  useEffect(() => {
    setLoading(true);
    // Mock data
    setTimeout(() => {
      setConfigs([
        { key: 'system.retention.days', value: '30', description: 'Data retention period in days', updated_at: '2023-10-01T10:00:00Z' },
        { key: 'deploy.timeout.seconds', value: '600', description: 'Default deployment timeout', updated_at: '2023-10-02T11:30:00Z' },
        { key: 'feature.dark_mode', value: 'true', description: 'Enable dark mode by default', updated_at: '2023-10-05T09:15:00Z' },
        { key: 'alert.email.enabled', value: 'true', description: 'Enable email alerts', updated_at: '2023-10-05T09:15:00Z' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const columns = [
    {
      title: '配置项 Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '最后更新',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a>编辑</a>
          <a>历史</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>配置管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />}>保存更改</Button>
        </Space>
      </div>

      <Card>
        <Tabs defaultActiveKey="global">
          <TabPane tab="全局配置" key="global">
            <Table
              columns={columns}
              dataSource={configs}
              rowKey="key"
              loading={loading}
              pagination={false}
            />
          </TabPane>
          <TabPane tab="环境配置" key="env">
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              Select an environment to view specific configurations
            </div>
          </TabPane>
          <TabPane tab="应用配置" key="app">
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              Select an application to view specific configurations
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
