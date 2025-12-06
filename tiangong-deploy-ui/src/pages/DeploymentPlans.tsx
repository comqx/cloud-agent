import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  message,
  Progress,
  Tabs,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  RollbackOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { deploymentPlanAPI, deploymentAPI, productAPI, environmentAPI, type Deployment, type Product, type Environment } from '../services/mockApi';

const { TextArea } = Input;
const { Option } = Select;

export default function DeploymentPlans() {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<DeploymentPlan[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DeploymentPlan | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('plans');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载部署计划
      const plansRes = await deploymentPlanAPI.list();
      setPlans(plansRes.data.data);

      // 加载部署列表
      const deploymentsRes = await deploymentAPI.list();
      setDeployments(deploymentsRes.data.data);

      // 加载产品列表
      const productsRes = await productAPI.list();
      setProducts(productsRes.data.data);

      // 加载环境列表
      const environmentsRes = await environmentAPI.list();
      setEnvironments(environmentsRes.data.data);
    } catch (error: any) {
      message.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (plan: DeploymentPlan) => {
    form.setFieldsValue(plan);
    setSelectedPlan(plan);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个部署计划吗？',
      onOk: async () => {
        try {
          await deploymentPlanAPI.delete(id);
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (selectedPlan) {
        await deploymentPlanAPI.update(selectedPlan.id, values);
      } else {
        await deploymentPlanAPI.create(values);
      }
      message.success(selectedPlan ? '更新成功' : '创建成功');
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error((selectedPlan ? '更新' : '创建') + '失败: ' + error.message);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await deploymentPlanAPI.execute(id);
      message.success('执行成功');
      loadData();
    } catch (error: any) {
      message.error('执行失败: ' + error.message);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await deploymentPlanAPI.pause(id);
      message.success('已暂停');
      loadData();
    } catch (error: any) {
      message.error('暂停失败: ' + error.message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await deploymentPlanAPI.resume(id);
      message.success('已恢复');
      loadData();
    } catch (error: any) {
      message.error('恢复失败: ' + error.message);
    }
  };

  const handleCancel = async (id: string) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消这个部署计划吗？',
      onOk: async () => {
        try {
          await deploymentPlanAPI.cancel(id);
          message.success('已取消');
          loadData();
        } catch (error: any) {
          message.error('取消失败: ' + error.message);
        }
      },
    });
  };

  const handleViewDetail = (plan: DeploymentPlan) => {
    setSelectedPlan(plan);
    setDetailModalVisible(true);
  };

  const planColumns = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '环境数量',
      dataIndex: 'environments',
      key: 'environments',
      render: (envs: string[]) => envs?.length || 0,
    },
    {
      title: '部署数量',
      dataIndex: 'deployments',
      key: 'deployments',
      render: (deps: string[]) => deps?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待执行' },
          running: { color: 'processing', text: '执行中' },
          success: { color: 'success', text: '成功' },
          failed: { color: 'error', text: '失败' },
          canceled: { color: 'default', text: '已取消' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
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
      render: (_: any, record: DeploymentPlan) => (
        <Space>
          <Tooltip title="查看详情">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
              详情
            </Button>
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip title="执行">
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleExecute(record.id)}>
                执行
              </Button>
            </Tooltip>
          )}
          {record.status === 'running' && (
            <>
              <Tooltip title="暂停">
                <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handlePause(record.id)}>
                  暂停
                </Button>
              </Tooltip>
              <Tooltip title="取消">
                <Button size="small" danger icon={<StopOutlined />} onClick={() => handleCancel(record.id)}>
                  取消
                </Button>
              </Tooltip>
            </>
          )}
          {record.status === 'paused' && (
            <Tooltip title="恢复">
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleResume(record.id)}>
                恢复
              </Button>
            </Tooltip>
          )}
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="删除">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const deploymentColumns = [
    {
      title: '产品',
      dataIndex: 'product_id',
      key: 'product_id',
    },
    {
      title: '环境',
      dataIndex: 'environment_id',
      key: 'environment_id',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
      render: (strategy: string) => {
        const strategyMap: Record<string, string> = {
          'blue-green': '蓝绿部署',
          canary: '金丝雀',
          rolling: '滚动更新',
        };
        return <Tag>{strategyMap[strategy] || strategy}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '待执行' },
          running: { color: 'processing', text: '执行中' },
          success: { color: 'success', text: '成功' },
          failed: { color: 'error', text: '失败' },
          canceled: { color: 'default', text: '已取消' },
          rolled_back: { color: 'warning', text: '已回滚' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
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
      render: (_: any, record: Deployment) => (
        <Space>
          {record.status === 'failed' && (
            <Button size="small" icon={<RollbackOutlined />} onClick={() => message.info('回滚功能待实现')}>
              回滚
            </Button>
          )}
          <Button size="small" icon={<EyeOutlined />} onClick={() => message.info('查看日志功能待实现')}>
            日志
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="部署计划"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建部署计划
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'plans',
              label: '部署计划',
              children: (
                <Table
                  columns={planColumns}
                  dataSource={plans}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'deployments',
              label: '全局部署视图',
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

      <Modal
        title={selectedPlan ? '编辑部署计划' : '创建部署计划'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedPlan(null);
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="请输入部署计划名称" />
          </Form.Item>
          <Form.Item name="environments" label="选择环境" rules={[{ required: true, message: '请至少选择一个环境' }]}>
            <Select mode="multiple" placeholder="选择环境">
              {environments.map((env) => (
                <Option key={env.id} value={env.id}>
                  {env.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="products" label="选择产品和版本" rules={[{ required: true, message: '请至少选择一个产品' }]}>
            <Select mode="multiple" placeholder="选择产品和版本">
              {products.map((product) => (
                <Option key={product.id} value={product.id}>
                  {product.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="strategy" label="部署策略" initialValue="rolling">
            <Select>
              <Option value="blue-green">蓝绿部署</Option>
              <Option value="canary">金丝雀部署</Option>
              <Option value="rolling">滚动更新</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入部署计划描述" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="部署计划详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedPlan(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {selectedPlan && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <strong>计划名称：</strong>
                  {selectedPlan.name}
                </div>
                <div>
                  <strong>状态：</strong>
                  <Badge
                    status={
                      selectedPlan.status === 'success'
                        ? 'success'
                        : selectedPlan.status === 'failed'
                          ? 'error'
                          : selectedPlan.status === 'running'
                            ? 'processing'
                            : 'default'
                    }
                    text={selectedPlan.status}
                  />
                </div>
                <div>
                  <strong>环境数量：</strong>
                  {selectedPlan.environments?.length || 0}
                </div>
                <div>
                  <strong>部署数量：</strong>
                  {selectedPlan.deployments?.length || 0}
                </div>
                <div>
                  <strong>创建时间：</strong>
                  {new Date(selectedPlan.created_at).toLocaleString()}
                </div>
              </Space>
            </Card>
            <Card size="small" title="部署进度">
              <Progress percent={selectedPlan.status === 'success' ? 100 : selectedPlan.status === 'running' ? 50 : 0} />
            </Card>
            <Card size="small" title="部署列表" style={{ marginTop: 16 }}>
              <Table
                columns={deploymentColumns}
                dataSource={deployments.filter((d) => selectedPlan.deployments?.includes(d.id))}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

