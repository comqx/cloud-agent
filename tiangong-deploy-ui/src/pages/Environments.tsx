import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Modal, Form, Input, Select, Space } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { environmentAPI, Environment } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

export default function Environments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [form] = Form.useForm();

  const loadEnvironments = async () => {
    setLoading(true);
    try {
      const res = await environmentAPI.list();
      setEnvironments(res.data.data);
    } catch (error: any) {
      message.error('加载环境列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, []);

  const handleCreate = () => {
    setEditingEnv(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (env: Environment) => {
    setEditingEnv(env);
    form.setFieldsValue(env);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个环境吗？',
      onOk: async () => {
        try {
          await environmentAPI.delete(id);
          message.success('删除成功');
          loadEnvironments();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingEnv) {
        await environmentAPI.update(editingEnv.id, values);
        message.success('更新成功');
      } else {
        await environmentAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadEnvironments();
    } catch (error: any) {
      message.error((editingEnv ? '更新' : '创建') + '失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          development: 'blue',
          testing: 'cyan',
          staging: 'orange',
          production: 'red',
          'air-gapped': 'purple',
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
          online: 'success',
          offline: 'default',
          disconnected: 'warning',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: 'K8s 集群',
      dataIndex: 'k8s_cluster',
      key: 'k8s_cluster',
      render: (text: string) => text || '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags?.map((tag) => <Tag key={tag}>{tag}</Tag>) || '-',
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
      render: (_: any, record: Environment) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="环境管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadEnvironments} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建环境
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={environments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingEnv ? '编辑环境' : '创建环境'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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

