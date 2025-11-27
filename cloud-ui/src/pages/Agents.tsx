import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Modal, Space, Tooltip, Input } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, SafetyOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { agentAPI, Agent } from '../services/api';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);

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

  const handleEditTags = (agent: Agent) => {
    setCurrentAgent(agent);
    setTags(agent.tags || []);
    setIsModalVisible(true);
  };

  const handleSaveTags = async () => {
    if (!currentAgent) return;
    try {
      await agentAPI.update(currentAgent.id, { tags });
      message.success('标签更新成功');
      setIsModalVisible(false);
      loadAgents();
    } catch (error: any) {
      message.error('更新失败: ' + error.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setCurrentAgent(null);
    setTags([]);
  };

  const handleRemoveTag = (removedTag: string) => {
    const newTags = tags.filter(tag => tag !== removedTag);
    setTags(newTags);
  };

  const handleAddTag = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      setTags([...tags, inputValue]);
    }
    setInputVisible(false);
    setInputValue('');
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
      render: (text: string, record: Agent) => (
        <Space>
          {text}
          {record.protocol === 'wss' && (
            <Tooltip title="使用 WSS 安全连接">
              <SafetyOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
        </Space>
      ),
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
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags && tags.map(tag => (
            <Tag color="blue" key={tag}>
              {tag}
            </Tag>
          ))}
        </>
      ),
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
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditTags(record)}
          >
            标签
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
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

      <Modal
        title={`编辑标签 - ${currentAgent?.hostname}`}
        open={isModalVisible}
        onOk={handleSaveTags}
        onCancel={handleCloseModal}
      >
        <div style={{ marginBottom: 16 }}>
          {tags.map((tag) => {
            const isLongTag = tag.length > 20;
            const tagElem = (
              <Tag
                key={tag}
                closable
                onClose={() => handleRemoveTag(tag)}
              >
                {isLongTag ? `${tag.slice(0, 20)}...` : tag}
              </Tag>
            );
            return isLongTag ? (
              <Tooltip title={tag} key={tag}>
                {tagElem}
              </Tooltip>
            ) : (
              tagElem
            );
          })}
          {inputVisible && (
            <Input
              type="text"
              size="small"
              style={{ width: 78 }}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleAddTag}
              onPressEnter={handleAddTag}
              autoFocus
            />
          )}
          {!inputVisible && (
            <Tag onClick={() => setInputVisible(true)} className="site-tag-plus">
              <PlusOutlined /> New Tag
            </Tag>
          )}
        </div>
      </Modal>
    </Card>
  );
}

