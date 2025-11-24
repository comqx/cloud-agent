import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Steps, Timeline, Avatar } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Change } from '../types';
import { mockChanges } from '../mock/data';

const { Step } = Steps;

export default function Changes() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Change[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockChanges);
      setLoading(false);
    }, 500);
  }, []);

  const columns = [
    {
      title: '变更标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by',
      render: (text: string) => <Space><UserOutlined /> {text}</Space>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'pending_approval' ? 'orange' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Change) => (
        <Space size="middle">
          <a>详情</a>
          {record.status === 'pending_approval' && <a>审批</a>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>变更管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
        </Space>
      </div>

      <Card title="变更审批流" style={{ marginBottom: '24px' }}>
        <Steps current={1}>
          <Step title="提交变更" description="User submits change request" icon={<UserOutlined />} />
          <Step title="自动检查" description="System runs policy checks" icon={<ClockCircleOutlined />} />
          <Step title="人工审批" description="Manager approval required" icon={<ClockCircleOutlined />} />
          <Step title="执行变更" description="Change applied to environment" icon={<CheckCircleOutlined />} />
        </Steps>
      </Card>

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
