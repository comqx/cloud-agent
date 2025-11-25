import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, Tabs, message } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { mockProducts, mockOrganizations, mockProductVersions } from '../mock/data';
import type { Product, ProductVersion, Organization } from '../types';
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
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [form] = Form.useForm();

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
      // Use mock data
      setProducts(mockProducts);
    } catch (error: any) {
      message.error('加载产品列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      // Use mock data
      setOrganizations(mockOrganizations);
    } catch (error: any) {
      // 忽略错误，可能没有权限
    }
  };

  const loadProductDetail = async (productId: string) => {
    try {
      const product = mockProducts.find(p => p.id === productId);
      if (product) {
        setDetailProduct(product);
        setIsDetailModalVisible(true);
      } else {
        message.error('未找到对应的产品');
      }
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
        // Remove from mock data in state
        setProducts(prev => prev.filter(p => p.id !== id));
        message.success('删除成功');
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedProduct) {
        // Update mock product in state
        setProducts(prev => prev.map(p => (p.id === selectedProduct.id ? { ...p, ...values } : p)));
        message.success('更新成功');
      } else {
        // Create new mock product with a generated id
        const newProduct = { id: `prod-${Date.now()}`, ...values } as any;
        setProducts(prev => [...prev, newProduct]);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      setSelectedProduct(null);
    } catch (error: any) {
      message.error((selectedProduct ? '更新' : '创建') + '失败: ' + error.message);
    }
  };

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const handleViewDetail = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  // Full-screen detail modal
  const detailModal = (() => {
    if (!detailProduct) return null;

    // Get versions for this product
    const productVersions = mockProductVersions.filter(v => v.product_id === detailProduct.id);

    return (
      <Modal
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width="100%"
        style={{ top: 0, padding: 0, maxWidth: 'none' }}
        bodyStyle={{
          height: '100vh',
          overflow: 'auto',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px 20px'
        }}
        closeIcon={<span style={{ fontSize: 24, cursor: 'pointer', color: 'white' }}>✕</span>}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header Section */}
          <div style={{ textAlign: 'center', marginBottom: 60, paddingTop: 40 }}>
            <div style={{
              width: 120,
              height: 120,
              background: 'white',
              borderRadius: '50%',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              color: '#667eea',
              fontWeight: 'bold',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              {detailProduct.name.substring(0, 2).toUpperCase()}
            </div>
            <h1 style={{ color: 'white', fontSize: 42, marginBottom: 12, fontWeight: 600 }}>
              {detailProduct.name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
              {detailProduct.description || '专业的企业级部署平台产品'}
            </p>
          </div>

          {/* Feature Highlights */}
          <div style={{ marginBottom: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 30 }}>
              {[
                { num: '01', title: '开发迭代', desc: '支持快速开发迭代，CI/CD集成' },
                { num: '02', title: '灵活部署', desc: '多环境部署，蓝绿发布，灰度发布' },
                { num: '03', title: '可观测性', desc: '实时监控告警，日志聚合分析' },
                { num: '04', title: '安全合规', desc: '权限管控，审计日志，合规检查' },
                { num: '05', title: '自动化运维', desc: '智能调度，自动扩缩容，故障自愈' }
              ].map((feature, idx) => (
                <div key={idx} style={{ textAlign: 'center', flex: '0 0 180px' }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}>
                    {feature.num}
                  </div>
                  <h3 style={{ color: 'white', fontSize: 16, marginBottom: 8, fontWeight: 600 }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.6 }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Version Selection Section */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 12,
            padding: 40,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30 }}>
              {/* Version Selection */}
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 16, color: '#333', fontWeight: 600 }}>
                  版本选择
                </h3>
                <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
                  选择适合的产品版本进行部署
                </p>
                {productVersions.length > 0 ? (
                  <Select
                    style={{ width: '100%' }}
                    placeholder="请选择产品版本"
                    size="large"
                    onChange={(value) => {
                      const version = productVersions.find(v => v.id === value);
                      if (version) {
                        message.success(`已选择版本: ${version.version}`);
                      }
                    }}
                  >
                    {productVersions.map(v => (
                      <Option key={v.id} value={v.id}>
                        <Space>
                          <span style={{ fontWeight: 500 }}>{v.version}</span>
                          {v.tag && (
                            <Tag color={v.tag === 'STABLE' ? 'green' : v.tag === 'CANARY' ? 'orange' : 'blue'}>
                              {v.tag}
                            </Tag>
                          )}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <div style={{ color: '#999', padding: 20, background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }}>
                    暂无可用版本
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div>
                <h3 style={{ fontSize: 20, marginBottom: 16, color: '#333', fontWeight: 600 }}>
                  产品信息
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#666' }}>产品状态</span>
                    <Tag color={detailProduct.status === 'active' ? 'success' : 'default'}>
                      {detailProduct.status === 'active' ? '活跃' : '归档'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#666' }}>版本数量</span>
                    <span style={{ fontWeight: 500 }}>{productVersions.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#666' }}>创建时间</span>
                    <span style={{ fontWeight: 500 }}>
                      {detailProduct.created_at ? new Date(detailProduct.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: '#666' }}>更新时间</span>
                    <span style={{ fontWeight: 500 }}>
                      {detailProduct.updated_at ? new Date(detailProduct.updated_at).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  })();

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
        {detailModal}
      </Card>

      <Modal
        title={selectedProduct ? '编辑产品' : '创建产品'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedProduct(null);
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Tabs defaultActiveKey="basic" size="small">
          <Tabs.TabPane tab="基本信息" key="basic">
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

              <Form.Item name="status" label="状态" initialValue="active" rules={[{ required: true }]}>
                <Select placeholder="选择产品状态">
                  <Option value="active">活跃</Option>
                  <Option value="archived">归档</Option>
                </Select>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="组织部门" key="org">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="organization_ids" label="组织部门" rules={[{ required: true, message: '请选择组织部门' }]}>
                <Select mode="multiple" placeholder="选择关联的组织部门">
                  {organizations.map((org) => (
                    <Option key={org.id} value={org.id}>
                      {org.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab="依赖关系" key="deps">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="dependency_ids" label="依赖的产品" rules={[{ required: false }]}>
                <Select mode="multiple" placeholder="选择依赖的其他产品">
                  {mockProducts
                    .filter((p) => !selectedProduct || p.id !== selectedProduct.id)
                    .map((p) => (
                      <Option key={p.id} value={p.id}>
                        {p.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </div>
  );
}
