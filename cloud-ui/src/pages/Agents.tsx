import { useEffect, useState, useMemo } from 'react';
import { Table, Tag, Card, Button, message, Modal, Space, Tooltip, Input } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, SafetyOutlined, EditOutlined, PlusOutlined, TagsOutlined, ClusterOutlined } from '@ant-design/icons';
import { agentAPI, Agent } from '../services/api';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  
  // 批量操作相关
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchTagModalVisible, setBatchTagModalVisible] = useState(false);
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchTagInputVisible, setBatchTagInputVisible] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await agentAPI.list();
      // 确保 tags 字段是数组
      const agentsWithTags = res.data.map(agent => ({
        ...agent,
        tags: Array.isArray(agent.tags) ? agent.tags : (agent.tags ? [agent.tags] : [])
      }));
      setAgents(agentsWithTags);
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

  // 批量添加标签相关
  const handleBatchAddTags = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要添加标签的 Agent');
      return;
    }
    setBatchTags([]);
    setBatchTagModalVisible(true);
  };

  const handleBatchTagAdd = () => {
    if (batchTagInput && batchTags.indexOf(batchTagInput) === -1) {
      setBatchTags([...batchTags, batchTagInput]);
    }
    setBatchTagInputVisible(false);
    setBatchTagInput('');
  };

  const handleBatchTagRemove = (removedTag: string) => {
    setBatchTags(batchTags.filter(tag => tag !== removedTag));
  };

  const handleBatchSaveTags = async () => {
    if (batchTags.length === 0) {
      message.warning('请至少添加一个标签');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要添加标签的 Agent');
      return;
    }

    setBatchLoading(true);
    try {
      // 只选择 Agent 节点（排除集群节点）
      const selectedAgents = agents.filter(a => 
        selectedRowKeys.includes(a.id) && !a.id.startsWith('cluster-')
      );
      let successCount = 0;
      let failCount = 0;

      // 批量更新每个 Agent 的标签
      for (const agent of selectedAgents) {
        try {
          const currentTags = agent.tags || [];
          // 合并标签（去重）
          const mergedTags = Array.from(new Set([...currentTags, ...batchTags]));
          await agentAPI.update(agent.id, { tags: mergedTags });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      if (failCount > 0) {
        message.warning(`批量添加标签完成: ${successCount} 个成功, ${failCount} 个失败`);
      } else {
        message.success(`成功为 ${successCount} 个 Agent 添加标签`);
      }

      setBatchTagModalVisible(false);
      setBatchTags([]);
      setSelectedRowKeys([]);
      loadAgents();
    } catch (error: any) {
      message.error('批量添加标签失败: ' + error.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchTagModalClose = () => {
    setBatchTagModalVisible(false);
    setBatchTags([]);
    setBatchTagInput('');
    setBatchTagInputVisible(false);
  };

  // 构建树形表格数据
  const treeData = useMemo(() => {
    const grouped: Record<string, Agent[]> = {};
    const noCluster: Agent[] = [];
    
    agents.forEach(agent => {
      const cluster = agent.env || '未分组';
      if (cluster === '未分组') {
        noCluster.push(agent);
      } else {
        if (!grouped[cluster]) {
          grouped[cluster] = [];
        }
        grouped[cluster].push(agent);
      }
    });
    
    if (noCluster.length > 0) {
      grouped['未分组'] = noCluster;
    }
    
    // 构建树形数据
    const clusters = Object.keys(grouped).sort();
    return clusters.map(cluster => {
      const clusterAgents = grouped[cluster];
      const onlineCount = clusterAgents.filter(a => a.status === 'online').length;
      const totalCount = clusterAgents.length;
      
      return {
        key: `cluster-${cluster}`,
        id: `cluster-${cluster}`,
        isCluster: true,
        cluster: cluster,
        hostname: cluster,
        ip: '',
        version: '',
        tags: [],
        status: '',
        last_seen: '',
        onlineCount,
        totalCount,
        children: clusterAgents.map(agent => ({
          ...agent,
          key: agent.id,
          isCluster: false,
        })),
      };
    });
  }, [agents]);

  // Table 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      // 过滤掉集群节点，只保留 Agent 节点
      const agentKeys = selectedKeys.filter(key => 
        typeof key === 'string' && !key.startsWith('cluster-')
      );
      setSelectedRowKeys(agentKeys);
    },
    getCheckboxProps: (record: any) => ({
      disabled: record.isCluster || record.status === 'offline', // 禁用集群行和离线 Agent
    }),
    checkStrictly: true, // 父子节点选择状态独立
  };

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: '集群',
      dataIndex: 'cluster',
      key: 'cluster',
      width: 200,
      render: (text: string, record: any) => {
        if (record.isCluster) {
          return (
            <Space>
              <ClusterOutlined />
              <span style={{ fontWeight: 'bold' }}>{text}</span>
              <Tag color="blue" style={{ fontSize: '11px' }}>
                {record.totalCount} 个节点
              </Tag>
              {record.onlineCount > 0 && (
                <Tag color="green" style={{ fontSize: '11px' }}>
                  {record.onlineCount} 在线
                </Tag>
              )}
            </Space>
          );
        }
        return null;
      },
    },
    {
      title: '主机名',
      dataIndex: 'hostname',
      key: 'hostname',
      render: (text: string, record: any) => {
        if (record.isCluster) {
          return null;
        }
        return (
          <Space>
            {text}
            {record.protocol === 'wss' && (
              <Tooltip title="使用 WSS 安全连接">
                <SafetyOutlined style={{ color: '#52c41a' }} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      render: (text: string, record: any) => {
        if (record.isCluster) {
          return null;
        }
        return text;
      },
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (text: string, record: any) => {
        if (record.isCluster) {
          return null;
        }
        return text;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[] | null | undefined, record: any) => {
        if (record.isCluster) {
          return null;
        }
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <>
            {tags.map(tag => (
              <Tag color="blue" key={tag}>
                {tag}
              </Tag>
            ))}
          </>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        if (record.isCluster) {
          return null;
        }
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
      render: (text: string, record: any) => {
        if (record.isCluster) {
          return null;
        }
        return text ? new Date(text).toLocaleString() : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => {
        if (record.isCluster) {
          return null;
        }
        return (
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
        );
      },
    },
  ];

  return (
    <Card
      title="Agent 管理"
      extra={
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button
              type="primary"
              icon={<TagsOutlined />}
              onClick={handleBatchAddTags}
            >
              批量添加标签 ({selectedRowKeys.length})
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={treeData}
        rowKey="key"
        loading={loading}
        pagination={false}
        rowSelection={rowSelection}
        defaultExpandAllRows
        indentSize={20}
      />

      {/* 单个 Agent 标签编辑 Modal */}
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

      {/* 批量添加标签 Modal */}
      <Modal
        title={`批量添加标签 (已选择 ${selectedRowKeys.length} 个 Agent)`}
        open={batchTagModalVisible}
        onOk={handleBatchSaveTags}
        onCancel={handleBatchTagModalClose}
        confirmLoading={batchLoading}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12, color: '#666' }}>
            将为以下 Agent 添加标签：
          </div>
          <div style={{ marginBottom: 16, maxHeight: '150px', overflowY: 'auto', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            {agents
              .filter(a => selectedRowKeys.includes(a.id))
              .map(agent => (
                <Tag key={agent.id} style={{ marginBottom: '4px' }}>
                  {agent.hostname} {agent.env && `(${agent.env})`}
                </Tag>
              ))}
          </div>
          <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
            要添加的标签：
          </div>
          <div style={{ marginBottom: 16 }}>
            {batchTags.map((tag) => {
              const isLongTag = tag.length > 20;
              const tagElem = (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleBatchTagRemove(tag)}
                  color="blue"
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
            {batchTagInputVisible && (
              <Input
                type="text"
                size="small"
                style={{ width: 120 }}
                value={batchTagInput}
                onChange={e => setBatchTagInput(e.target.value)}
                onBlur={handleBatchTagAdd}
                onPressEnter={handleBatchTagAdd}
                autoFocus
                placeholder="输入标签名称"
              />
            )}
            {!batchTagInputVisible && (
              <Tag onClick={() => setBatchTagInputVisible(true)} className="site-tag-plus" style={{ cursor: 'pointer' }}>
                <PlusOutlined /> 添加标签
              </Tag>
            )}
          </div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            提示：标签会合并到每个 Agent 的现有标签中（不会覆盖，自动去重）
          </div>
        </div>
      </Modal>
    </Card>
  );
}

