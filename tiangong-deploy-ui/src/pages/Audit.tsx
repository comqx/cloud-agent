import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, DatePicker, Input } from 'antd';
import { ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { AuditLog } from '../types';
import { mockAuditLogs } from '../mock/data';

const { RangePicker } = DatePicker;

export default function Audit() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditLog[]>([]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockAuditLogs);
      setLoading(false);
    }, 500);
  }, []);

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text: string) => <Space><UserOutlined /> {text}</Space>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
    },
    {
      title: '资源ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      render: (text: string) => text ? <code>{text}</code> : '-',
    },
    {
      title: '详情',
      key: 'details',
      render: () => <a>查看详情</a>,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>审计日志</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <RangePicker showTime />
          <Input placeholder="搜索用户/操作" prefix={<SearchOutlined />} style={{ width: 200 }} />
          <Button type="primary">查询</Button>
        </Space>
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
