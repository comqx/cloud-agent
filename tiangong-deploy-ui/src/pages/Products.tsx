import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Modal, Form, Input, Space } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { productAPI, Product } from '../services/api';

const { TextArea } = Input;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productAPI.list();
      setProducts(res.data.data);
    } catch (error: any) {
      message.error('加载产品列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个产品吗？',
      onOk: async () => {
        try {
          await productAPI.delete(id);
          message.success('删除成功');
          loadProducts();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct.id, values);
        message.success('更新成功');
      } else {
        await productAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadProducts();
    } catch (error: any) {
      message.error((editingProduct ? '更新' : '创建') + '失败: ' + error.message);
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
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'success',
          archived: 'default',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '版本数',
      dataIndex: 'versions',
      key: 'versions',
      render: (versions: any[]) => versions?.length || 0,
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
      render: (_: any, record: Product) => (
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
        title="产品管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadProducts} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建产品
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingProduct ? '编辑产品' : '创建产品'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入产品描述" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Input placeholder="请输入产品类型" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

