import { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Card, Button, message, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { releaseAPI, deploymentAPI, Release, Deployment } from '../services/api';

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('releases');

  const loadReleases = async () => {
    setLoading(true);
    try {
      const res = await releaseAPI.list();
      setReleases(res.data.data);
    } catch (error: any) {
      message.error('加载发布列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeployments = async () => {
    setLoading(true);
    try {
      const res = await deploymentAPI.list();
      setDeployments(res.data.data);
    } catch (error: any) {
      message.error('加载部署列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'releases') {
      loadReleases();
    } else {
      loadDeployments();
    }
  }, [activeTab]);

  const releaseColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '产品',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 150,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          approved: 'success',
          rejected: 'error',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
  ];

  const deploymentColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '产品',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 150,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '环境',
      dataIndex: 'environment_id',
      key: 'environment_id',
      width: 150,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
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
          pending: 'default',
          running: 'processing',
          success: 'success',
          failed: 'error',
          canceled: 'warning',
          rolled_back: 'default',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
      render: (strategy: string) => strategy || '-',
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
        title="发布与部署"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={activeTab === 'releases' ? loadReleases : loadDeployments}
              loading={loading}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              创建发布
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'releases',
              label: '发布管理',
              children: (
                <Table
                  columns={releaseColumns}
                  dataSource={releases}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'deployments',
              label: '部署管理',
              children: (
                <Table
                  columns={deploymentColumns}
                  dataSource={deployments}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

