import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, Tabs, Descriptions, Badge, message, TreeSelect } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreOutlined } from '@ant-design/icons';
import { productAPI, organizationAPI, type Product, type ProductVersion, type Organization } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

export default function Products() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    loadProducts();
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (id) {
      loadProductDetail(id);
    }
  }, [id]);

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

  const loadOrganizations = async () => {
    try {
      const res = await organizationAPI.list();
      setOrganizations(res.data.data);
    } catch (error: any) {
      // 忽略错误，可能没有权限
    }
  };

  const loadProductDetail = async (productId: string) => {
    try {
      const res = await productAPI.get(productId);
      setSelectedProduct(res.data.data);
      const versionsRes = await productAPI.getVersions(productId);
      setVersions(versionsRes.data.data);
      setIsDetailVisible(true);
      setActiveTab('detail');
    } catch (error: any) {
      message.error('加载产品详情失败: ' + error.message);
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    form.setFieldsValue({
      ...product,
      organization_ids: product.organization_ids || [],
    });
    setSelectedProduct(product);
    setIsModalVisible(true);
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
      if (selectedProduct) {
        await productAPI.update(selectedProduct.id, values);
        message.success('更新成功');
      } else {
        await productAPI.create(values);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (error: any) {
      message.error((selectedProduct ? '更新' : '创建') + '失败: ' + error.message);
    }
  };

  const handleViewDetail = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  const handleBackToList = () => {
    navigate('/products');
    setIsDetailVisible(false);
    setSelectedProduct(null);
  };

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.organization_ids && record.organization_ids.length > 0 && (
            <Tag color="blue">{record.organization_ids.length} 个组织</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '组织部门',
      dataIndex: 'organization_ids',
      key: 'organization_ids',
      render: (orgIds: string[]) => {
        if (!orgIds || orgIds.length === 0) return '-';
        const orgNames = orgIds
          .map((id) => organizations.find((o) => o.id === id)?.name)
          .filter(Boolean)
          .slice(0, 2);
        return (
          <Space>
            {orgNames.map((name, idx) => (
              <Tag key={idx}>{name}</Tag>
            ))}
            {orgIds.length > 2 && <Tag>+{orgIds.length - 2}</Tag>}
          </Space>
        );
      },
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
        return <Tag color={colorMap[status]}>{status === 'active' ? '活跃' : '归档'}</Tag>;
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
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 产品详情页
  if (isDetailVisible && selectedProduct) {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <Button onClick={handleBackToList} style={{ marginBottom: '16px' }}>
            返回列表
          </Button>
          <h1>产品详情 - {selectedProduct.name}</h1>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'detail',
              label: '基本信息',
              children: (
                <Card>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="产品名称">{selectedProduct.name}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={selectedProduct.status === 'active' ? 'success' : 'default'}>
                        {selectedProduct.status === 'active' ? '活跃' : '归档'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>
                      {selectedProduct.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="组织部门" span={2}>
                      {selectedProduct.organization_ids && selectedProduct.organization_ids.length > 0 ? (
                        <Space>
                          {selectedProduct.organization_ids.map((orgId) => {
                            const org = organizations.find((o) => o.id === orgId);
                            return org ? <Tag key={orgId}>{org.name}</Tag> : null;
                          })}
                        </Space>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {selectedProduct.created_at ? new Date(selectedProduct.created_at).toLocaleString() : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {selectedProduct.updated_at ? new Date(selectedProduct.updated_at).toLocaleString() : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              ),
            },
            {
              key: 'versions',
              label: '版本列表',
              children: (
                <Card
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        Modal.info({
                          title: '创建版本',
                          content: '版本创建功能待实现',
                        });
                      }}
                    >
                      创建版本
                    </Button>
                  }
                >
                  <Table
                    dataSource={versions}
                    rowKey="id"
                    columns={[
                      {
                        title: '版本号',
                        dataIndex: 'version',
                        key: 'version',
                        render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
                      },
                      {
                        title: '标签',
                        dataIndex: 'tag',
                        key: 'tag',
                        render: (tag: string) => {
                          const tagMap: Record<string, { color: string; text: string }> = {
                            RELEASE: { color: 'blue', text: 'RELEASE' },
                            CANARY: { color: 'orange', text: 'CANARY' },
                            STABLE: { color: 'green', text: 'STABLE' },
                          };
                          const tagInfo = tagMap[tag] || { color: 'default', text: tag };
                          return <Tag color={tagInfo.color}>{tagInfo.text}</Tag>;
                        },
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
                        render: (_: any, record: ProductVersion) => (
                          <Space>
                            <Button
                              size="small"
                              onClick={() => {
                                navigate(`/products/${selectedProduct.id}/versions/${record.id}`);
                              }}
                            >
                              版本详情
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                    pagination={{ pageSize: 20 }}
                  />
                </Card>
              ),
            },
            {
              key: 'dependencies',
              label: '依赖关系',
              children: (
                <Card>
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    依赖关系图功能待实现
                  </div>
                </Card>
              ),
            },
            {
              key: 'constraints',
              label: '约束定义',
              children: (
                <Card>
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    约束定义功能待实现
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>
    );
  }

  // 产品列表页
  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>产品管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadProducts} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建产品
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={selectedProduct ? '编辑产品' : '创建产品'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedProduct(null);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入产品名称' }]}>
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入产品描述" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Input placeholder="请输入产品类型" />
          </Form.Item>
          <Form.Item
            name="organization_ids"
            label="组织部门"
            rules={[{ required: true, message: '请至少选择一个组织部门' }]}
            tooltip="创建产品时必须选择至少一个组织部门，支持多对多关系"
          >
            <Select mode="multiple" placeholder="选择组织部门（支持多选）" showSearch>
              {organizations.map((org) => (
                <Option key={org.id} value={org.id}>
                  {org.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">活跃</Option>
              <Option value="archived">归档</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
