import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Badge } from 'antd';
import { ReloadOutlined, DesktopOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { Agent } from '../types';
import { mockAgents, mockEnvironments } from '../mock/data';

export default function Agents() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Agent[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockAgents);
      setLoading(false);
    }, 500);
  }, []);

  const getEnvName = (id: string) => {
    return mockEnvironments.find(e => e.id === id)?.name || id;
  };

  const columns = [
    {
      title: 'Agent 名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Hostname',
      dataIndex: 'hostname',
      key: 'hostname',
      render: (text: string) => <Space><DesktopOutlined /> {text}</Space>,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: '所属环境',
      dataIndex: 'env',
      key: 'env',
      render: (id: string) => <Tag color="blue">{getEnvName(id)}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const isOnline = status === 'online';
        return (
          <Space>
            {isOnline ? <WifiOutlined style={{ color: '#52c41a' }} /> : <DisconnectOutlined style={{ color: '#ff4d4f' }} />}
            <Badge status={isOnline ? 'success' : 'error'} text={status.toUpperCase()} />
          </Space>
        );
      },
    },
    {
      title: '最后在线',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Agent) => (
        <Space size="middle">
          <a>详情</a>
          <a>日志</a>
          <a style={{ color: 'red' }}>重启</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>Agent 管理</h1>
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
    </div>
  );
}
