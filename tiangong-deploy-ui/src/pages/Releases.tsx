import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Steps, Row, Col } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Release } from '../types';
import { mockReleases, mockProducts } from '../mock/data';

const { Step } = Steps;

export default function Releases() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Release[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockReleases);
      setLoading(false);
    }, 500);
  }, []);

  const getProductName = (id: string) => {
    return mockProducts.find(p => p.id === id)?.name || id;
  };

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '产品',
      dataIndex: 'product_id',
      key: 'product_id',
      render: (id: string) => <Tag color="blue">{getProductName(id)}</Tag>,
    },
    {
      title: '渠道',
      dataIndex: 'channels',
      key: 'channels',
      render: (channels: string[]) => (
        <Space>
          {channels?.map(c => (
            <Tag key={c} color={c === 'STABLE' ? 'green' : 'orange'}>{c}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      key: 'approval_status',
      render: (status: string) => {
        const color = status === 'approved' ? 'success' : status === 'pending' ? 'warning' : 'error';
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
      render: (_: any, record: Release) => (
        <Space size="middle">
          <a>详情</a>
          {record.approval_status === 'pending' && <a>审批</a>}
          <a>推广</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>发布管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />}>新建发布</Button>
        </Space>
      </div>

      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card title="发布流水线 (Release Pipeline)">
            <Steps current={1} progressDot>
              <Step title="Release Created" description="v1.3.0-rc1" />
              <Step title="Canary Channel" description="Deployed to Canary" />
              <Step title="Approval" description="Pending Approval" />
              <Step title="Stable Channel" description="Waiting for Promotion" />
            </Steps>
          </Card>
        </Col>
      </Row>

      <Card title="发布列表" bodyStyle={{ padding: 0 }}>
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
