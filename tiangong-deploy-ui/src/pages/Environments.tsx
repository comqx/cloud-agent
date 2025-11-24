import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, Badge } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Environment } from '../types';
import { mockEnvironments } from '../mock/data';

const { Option } = Select;
const { TextArea } = Input;

export default function Environments() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Environment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(mockEnvironments);
      setLoading(false);
    }, 500);
  }, []);

  const columns = [
    {
      title: '环境名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Environment) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.tags?.map(tag => <Tag key={tag} style={{ fontSize: '10px' }}>{tag}</Tag>)}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          production: 'red',
          staging: 'orange',
          testing: 'blue',
          development: 'green',
          'air-gapped': 'purple',
        };
        return <Tag color={colors[type]}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          online: { color: 'success', text: '在线' },
          offline: { color: 'error', text: '离线' },
          disconnected: { color: 'warning', text: '断开连接' },
        };
        const s = statusMap[status] || { color: 'default', text: status };
        return <Badge status={s.color as any} text={s.text} />;
      },
    },
    {
      title: 'K8s 集群',
      dataIndex: 'k8s_cluster',
      key: 'k8s_cluster',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>环境管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            创建环境
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="创建环境"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => setIsModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入环境名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入环境描述" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="请选择环境类型">
              <Option value="development">开发环境</Option>
              <Option value="testing">测试环境</Option>
              <Option value="staging">预发布环境</Option>
              <Option value="production">生产环境</Option>
              <Option value="air-gapped">Air-gapped 环境</Option>
            </Select>
          </Form.Item>
          <Form.Item name="k8s_cluster" label="K8s 集群">
            <Input placeholder="请输入 K8s 集群名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
