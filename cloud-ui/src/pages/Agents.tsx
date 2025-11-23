import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { agentAPI, Agent } from '../services/api';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await agentAPI.list();
      setAgents(res.data);
    } catch (error: any) {
      message.error('加载 Agent 列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: '集群',
      dataIndex: 'env',
      key: 'env',
      render: (text: string) => (text ? <Tag color="blue">{text}</Tag> : '-'),
    },
    {
      title: '主机名',
      dataIndex: 'hostname',
      key: 'hostname',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          online: 'green',
          offline: 'default',
          error: 'red',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '最后活跃',
      dataIndex: 'last_seen',
      key: 'last_seen',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
  ];

  return (
    <Card
      title="Agent 管理"
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading}>
          刷新
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={agents}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
}

