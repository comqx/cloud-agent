import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { changeAPI, Change } from '../services/api';

export default function Changes() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChanges = async () => {
    setLoading(true);
    try {
      const res = await changeAPI.list();
      setChanges(res.data.data);
    } catch (error: any) {
      message.error('加载变更列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          deployment: 'blue',
          configuration: 'cyan',
          maintenance: 'orange',
          other: 'default',
        };
        return <Tag color={colorMap[type]}>{type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          draft: 'default',
          pending_approval: 'orange',
          approved: 'success',
          rejected: 'error',
          executing: 'processing',
          completed: 'success',
          rolled_back: 'warning',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
  ];

  return (
    <div>
      <Card
        title="变更管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadChanges} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              创建变更请求
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={changes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}

