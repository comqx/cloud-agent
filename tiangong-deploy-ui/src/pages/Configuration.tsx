import { useEffect, useState } from 'react';
import { Table, Card, Button, message, Space, Tabs } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { configurationAPI, type Configuration } from '../services/api';

export default function ConfigurationPage() {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('environments');

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab === 'environments') {
        // 加载环境配置
      } else if (activeTab === 'products') {
        // 加载产品配置
      }
      const res = await configurationAPI.list(params);
      setConfigurations(res.data.data);
    } catch (error: any) {
      message.error('加载配置列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, [activeTab]);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '配置键',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '配置值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: any) =>
        typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
    },
    {
      title: '环境',
      dataIndex: 'environment_id',
      key: 'environment_id',
      width: 150,
      render: (text: string) => (text ? <code>{text.substring(0, 8)}...</code> : '-'),
    },
    {
      title: '产品',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 150,
      render: (text: string) => (text ? <code>{text.substring(0, 8)}...</code> : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
  ];

  return (
    <div>
      <Card
        title="配置管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadConfigurations} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              创建配置
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'environments',
              label: '环境配置',
              children: (
                <Table
                  columns={columns}
                  dataSource={configurations.filter((c) => c.environment_id)}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'products',
              label: '产品配置',
              children: (
                <Table
                  columns={columns}
                  dataSource={configurations.filter((c) => c.product_id)}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'templates',
              label: '配置模板',
              children: <p>配置模板功能开发中...</p>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

