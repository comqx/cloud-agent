import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Modal } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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

  const handleDelete = (agent: Agent) => {
    Modal.confirm({
      title: '确认删除 Agent?',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 Agent "${agent.hostname}" (${agent.ip}) 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await agentAPI.delete(agent.id);
          message.success('Agent 删除成功');
          loadAgents();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  // 获取所有唯一的集群名称
  const uniqueEnvs = Array.from(new Set(agents.map(a => a.env).filter(Boolean)));
  const envFilters = uniqueEnvs.map(env => ({ text: env!, value: env! }));

  const columns = [
    {
      title: '集群',
      dataIndex: 'env',
      key: 'env',
      filters: envFilters,
      onFilter: (value: boolean | React.Key, record: Agent) => record.env === value,
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
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Agent) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
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

