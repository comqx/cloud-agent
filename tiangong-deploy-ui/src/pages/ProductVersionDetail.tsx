import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Tabs,
    Descriptions,
    Table,
    Button,
    Space,
    Tag,
    Progress,
    Row,
    Col,
    Statistic,
    Modal,
    Form,
    Input,
    Select,
    message,
    Badge,
} from 'antd';
import {
    ArrowLeftOutlined,
    PlusOutlined,
    PlayCircleOutlined,
    EyeOutlined,
    DeleteOutlined,
    EditOutlined,
    RocketOutlined,
    CodeOutlined,
    ToolOutlined,
    DeploymentUnitOutlined,
} from '@ant-design/icons';
import {
    mockProductVersions,
    mockServices,
    mockSQLScripts,
    mockDeploymentSchemes,
    mockBuilds,
    mockReleases,
    mockProducts,
} from '../mock/data';
import type {
    ProductVersion,
    Service,
    SQLScript,
    DeploymentScheme,
    Build,
    Release,
} from '../types';

const { TextArea } = Input;
const { Option } = Select;

export default function ProductVersionDetail() {
    const { id, versionId } = useParams<{ id: string; versionId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [version, setVersion] = useState<ProductVersion | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [sqlScripts, setSqlScripts] = useState<SQLScript[]>([]);
    const [deploymentSchemes, setDeploymentSchemes] = useState<DeploymentScheme[]>([]);
    const [builds, setBuilds] = useState<Build[]>([]);
    const [releases, setReleases] = useState<Release[]>([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [schemeModalVisible, setSchemeModalVisible] = useState(false);
    const [releaseModalVisible, setReleaseModalVisible] = useState(false);
    const [buildModalVisible, setBuildModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        loadVersionData();
    }, [id, versionId]);

    const loadVersionData = () => {
        setLoading(true);
        // 使用 mock 数据
        const versionData = mockProductVersions.find((v) => v.id === versionId);
        setVersion(versionData || null);

        const servicesData = mockServices.filter((s) => s.version_id === versionId);
        setServices(servicesData);

        const sqlData = mockSQLScripts.filter((s) => s.version_id === versionId);
        setSqlScripts(sqlData);

        const schemesData = mockDeploymentSchemes.filter((s) => s.version_id === versionId);
        setDeploymentSchemes(schemesData);

        const buildsData = mockBuilds.filter((b) => b.version_id === versionId);
        setBuilds(buildsData);

        const releasesData = mockReleases.filter((r) => r.product_id === id);
        setReleases(releasesData);

        setLoading(false);
    };

    const handleBack = () => {
        navigate(`/products/${id}`);
    };

    const product = mockProducts.find((p) => p.id === id);

    // 服务列表列
    const serviceColumns = [
        {
            title: '服务名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => {
                const typeMap: Record<string, { color: string; text: string }> = {
                    backend: { color: 'blue', text: '后端服务' },
                    frontend: { color: 'green', text: '前端服务' },
                    database: { color: 'purple', text: '数据库' },
                    cache: { color: 'orange', text: '缓存' },
                    mq: { color: 'red', text: '消息队列' },
                    other: { color: 'default', text: '其他' },
                };
                const typeInfo = typeMap[type] || typeMap.other;
                return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const statusMap: Record<string, { color: string; text: string }> = {
                    running: { color: 'success', text: '运行中' },
                    stopped: { color: 'default', text: '已停止' },
                    error: { color: 'error', text: '错误' },
                    unknown: { color: 'warning', text: '未知' },
                };
                const statusInfo = statusMap[status] || statusMap.unknown;
                return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
            },
        },
        {
            title: '副本数',
            dataIndex: 'replicas',
            key: 'replicas',
        },
        {
            title: '镜像',
            dataIndex: 'image',
            key: 'image',
            ellipsis: true,
        },
        {
            title: '资源',
            key: 'resources',
            render: (_: any, record: Service) => (
                <span>
                    CPU: {record.resources?.cpu || '-'} / 内存: {record.resources?.memory || '-'}
                </span>
            ),
        },
    ];

    // SQL脚本列
    const sqlScriptColumns = [
        {
            title: '脚本名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '数据库类型',
            dataIndex: 'database_type',
            key: 'database_type',
            render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
        },
        {
            title: '执行顺序',
            dataIndex: 'execution_order',
            key: 'execution_order',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colorMap: Record<string, string> = {
                    pending: 'default',
                    executed: 'success',
                    failed: 'error',
                };
                return <Tag color={colorMap[status]}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: '执行时间',
            dataIndex: 'executed_at',
            key: 'executed_at',
            render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: SQLScript) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />}>
                        查看
                    </Button>
                    {record.status === 'pending' && (
                        <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
                            执行
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    // 部署方案列
    const schemeColumns = [
        {
            title: '方案名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
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
                return <Tag color="blue">{strategyMap[strategy] || strategy}</Tag>;
            },
        },
        {
            title: '配置',
            key: 'config',
            render: (_: any, record: DeploymentScheme) => {
                const config = record.config || {};
                return (
                    <span>
                        {config.canary_percentage && `金丝雀比例: ${config.canary_percentage}% `}
                        {config.rolling_batch_size && `批次大小: ${config.rolling_batch_size} `}
                        {config.health_check_interval && `健康检查: ${config.health_check_interval}s`}
                    </span>
                );
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
            render: () => (
                <Space>
                    <Button size="small" icon={<EditOutlined />}>
                        编辑
                    </Button>
                    <Button size="small" danger icon={<DeleteOutlined />}>
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    // 构建列
    const buildColumns = [
        {
            title: '构建号',
            dataIndex: 'build_number',
            key: 'build_number',
            render: (num: number) => <span style={{ fontWeight: 500 }}>#{num}</span>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const statusMap: Record<string, { color: string; text: string }> = {
                    pending: { color: 'default', text: '待执行' },
                    running: { color: 'processing', text: '构建中' },
                    success: { color: 'success', text: '成功' },
                    failed: { color: 'error', text: '失败' },
                    canceled: { color: 'default', text: '已取消' },
                };
                const statusInfo = statusMap[status] || statusMap.pending;
                return <Badge status={statusInfo.color as any} text={statusInfo.text} />;
            },
        },
        {
            title: '触发方式',
            dataIndex: 'trigger',
            key: 'trigger',
            render: (trigger: string) => {
                const triggerMap: Record<string, string> = {
                    manual: '手动',
                    auto: '自动',
                    schedule: '定时',
                };
                return <Tag>{triggerMap[trigger] || trigger}</Tag>;
            },
        },
        {
            title: '分支',
            dataIndex: 'branch',
            key: 'branch',
        },
        {
            title: 'Commit',
            dataIndex: 'commit',
            key: 'commit',
            render: (commit: string) => <code>{commit}</code>,
        },
        {
            title: '耗时',
            dataIndex: 'duration',
            key: 'duration',
            render: (duration: number) => (duration ? `${Math.floor(duration / 60)}分${duration % 60}秒` : '-'),
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
            render: () => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />}>
                        日志
                    </Button>
                </Space>
            ),
        },
    ];

    // 发布列
    const releaseColumns = [
        {
            title: '版本号',
            dataIndex: 'version',
            key: 'version',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '渠道',
            dataIndex: 'channels',
            key: 'channels',
            render: (channels: string[]) => (
                <Space>
                    {channels?.map((c) => (
                        <Tag key={c} color={c === 'STABLE' ? 'green' : c === 'CANARY' ? 'orange' : 'blue'}>
                            {c}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '审批状态',
            dataIndex: 'approval_status',
            key: 'approval_status',
            render: (status: string) => {
                const colorMap: Record<string, string> = {
                    approved: 'success',
                    pending: 'warning',
                    rejected: 'error',
                };
                return <Tag color={colorMap[status]}>{status.toUpperCase()}</Tag>;
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
                <Space>
                    <Button size="small" icon={<EyeOutlined />}>
                        详情
                    </Button>
                    {record.approval_status === 'pending' && (
                        <Button size="small" type="primary">
                            审批
                        </Button>
                    )}
                    {record.channels?.includes('CANARY') && (
                        <Button size="small" type="primary" icon={<RocketOutlined />}>
                            推广到 STABLE
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    if (!version) {
        return <div>版本不存在</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginBottom: '16px' }}>
                    返回产品详情
                </Button>
                <h1>
                    {product?.name} - 版本 {version.version}
                </h1>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'dashboard',
                        label: (
                            <span>
                                <DeploymentUnitOutlined />
                                版本仪表盘
                            </span>
                        ),
                        children: (
                            <div>
                                <Row gutter={16} style={{ marginBottom: '24px' }}>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic title="服务数量" value={services.length} suffix="个" />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="运行中服务"
                                                value={services.filter((s) => s.status === 'running').length}
                                                suffix={`/ ${services.length}`}
                                                valueStyle={{ color: '#3f8600' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic title="部署方案" value={deploymentSchemes.length} suffix="个" />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card>
                                            <Statistic
                                                title="构建成功率"
                                                value={
                                                    builds.length > 0
                                                        ? Math.round((builds.filter((b) => b.status === 'success').length / builds.length) * 100)
                                                        : 0
                                                }
                                                suffix="%"
                                                valueStyle={{ color: '#3f8600' }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <Card title="版本信息" style={{ marginBottom: '16px' }}>
                                    <Descriptions bordered column={2}>
                                        <Descriptions.Item label="版本号">{version.version}</Descriptions.Item>
                                        <Descriptions.Item label="标签">
                                            <Tag color={version.tag === 'STABLE' ? 'green' : version.tag === 'CANARY' ? 'orange' : 'blue'}>
                                                {version.tag}
                                            </Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="构建信息">{version.build_info || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="创建时间">{new Date(version.created_at).toLocaleString()}</Descriptions.Item>
                                        <Descriptions.Item label="变更日志" span={2}>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{version.changelog || '-'}</pre>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>

                                <Card title="资源使用情况">
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <div>CPU 使用</div>
                                                <Progress percent={45} status="active" />
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <div>内存使用</div>
                                                <Progress percent={62} status="active" />
                                            </div>
                                        </Col>
                                    </Row>
                                </Card>
                            </div>
                        ),
                    },
                    {
                        key: 'services',
                        label: (
                            <span>
                                <CodeOutlined />
                                服务管理
                            </span>
                        ),
                        children: (
                            <Tabs
                                type="card"
                                items={[
                                    {
                                        key: 'service-list',
                                        label: '服务列表',
                                        children: (
                                            <Card
                                                title={`服务列表 (${services.length})`}
                                                extra={
                                                    <Button type="primary" icon={<PlusOutlined />}>
                                                        添加服务
                                                    </Button>
                                                }
                                            >
                                                <Table
                                                    columns={serviceColumns}
                                                    dataSource={services}
                                                    rowKey="id"
                                                    loading={loading}
                                                    pagination={{ pageSize: 10 }}
                                                />
                                            </Card>
                                        ),
                                    },
                                    {
                                        key: 'sql-scripts',
                                        label: 'SQL脚本',
                                        children: (
                                            <Card
                                                title={`SQL脚本 (${sqlScripts.length})`}
                                                extra={
                                                    <Button type="primary" icon={<PlusOutlined />}>
                                                        上传脚本
                                                    </Button>
                                                }
                                            >
                                                <Table
                                                    columns={sqlScriptColumns}
                                                    dataSource={sqlScripts}
                                                    rowKey="id"
                                                    loading={loading}
                                                    pagination={{ pageSize: 10 }}
                                                />
                                            </Card>
                                        ),
                                    },
                                ]}
                            />
                        ),
                    },
                    {
                        key: 'deployment-schemes',
                        label: (
                            <span>
                                <ToolOutlined />
                                部署方案
                            </span>
                        ),
                        children: (
                            <Card
                                title={`部署方案 (${deploymentSchemes.length})`}
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setSchemeModalVisible(true)}
                                    >
                                        创建方案
                                    </Button>
                                }
                            >
                                <Table
                                    columns={schemeColumns}
                                    dataSource={deploymentSchemes}
                                    rowKey="id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                />
                            </Card>
                        ),
                    },
                    {
                        key: 'releases',
                        label: (
                            <span>
                                <RocketOutlined />
                                版本发布
                            </span>
                        ),
                        children: (
                            <Card
                                title={`发布列表 (${releases.length})`}
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setReleaseModalVisible(true)}
                                    >
                                        新建发布
                                    </Button>
                                }
                            >
                                <Table
                                    columns={releaseColumns}
                                    dataSource={releases}
                                    rowKey="id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                />
                            </Card>
                        ),
                    },
                    {
                        key: 'builds',
                        label: (
                            <span>
                                <PlayCircleOutlined />
                                构建管理
                            </span>
                        ),
                        children: (
                            <Card
                                title={`构建列表 (${builds.length})`}
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setBuildModalVisible(true)}
                                    >
                                        新建构建
                                    </Button>
                                }
                            >
                                <Table
                                    columns={buildColumns}
                                    dataSource={builds}
                                    rowKey="id"
                                    loading={loading}
                                    pagination={{ pageSize: 10 }}
                                />
                            </Card>
                        ),
                    },
                ]}
            />

            {/* 创建部署方案 Modal */}
            <Modal
                title="创建部署方案"
                open={schemeModalVisible}
                onCancel={() => setSchemeModalVisible(false)}
                onOk={() => {
                    message.success('创建成功');
                    setSchemeModalVisible(false);
                }}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="方案名称" rules={[{ required: true }]}>
                        <Input placeholder="请输入方案名称" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={3} placeholder="请输入方案描述" />
                    </Form.Item>
                    <Form.Item name="strategy" label="部署策略" rules={[{ required: true }]} initialValue="rolling">
                        <Select>
                            <Option value="blue-green">蓝绿部署</Option>
                            <Option value="canary">金丝雀部署</Option>
                            <Option value="rolling">滚动更新</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 新建发布 Modal */}
            <Modal
                title="新建发布"
                open={releaseModalVisible}
                onCancel={() => setReleaseModalVisible(false)}
                onOk={() => {
                    message.success('创建成功');
                    setReleaseModalVisible(false);
                }}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="version" label="版本" initialValue={version.version}>
                        <Input disabled />
                    </Form.Item>
                    <Form.Item name="environment" label="目标环境" rules={[{ required: true }]}>
                        <Select placeholder="选择环境">
                            <Option value="env-dev">Development</Option>
                            <Option value="env-test">Testing</Option>
                            <Option value="env-staging">Staging</Option>
                            <Option value="env-prod-us">Production (US)</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="scheme" label="部署方案" rules={[{ required: true }]}>
                        <Select placeholder="选择部署方案">
                            {deploymentSchemes.map((scheme) => (
                                <Option key={scheme.id} value={scheme.id}>
                                    {scheme.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="channel" label="发布渠道" initialValue="RELEASE">
                        <Select>
                            <Option value="RELEASE">RELEASE</Option>
                            <Option value="CANARY">CANARY</Option>
                            <Option value="STABLE">STABLE</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 新建构建 Modal */}
            <Modal
                title="新建构建"
                open={buildModalVisible}
                onCancel={() => setBuildModalVisible(false)}
                onOk={() => {
                    message.success('构建已启动');
                    setBuildModalVisible(false);
                }}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="branch" label="分支" rules={[{ required: true }]}>
                        <Input placeholder="请输入分支名称" />
                    </Form.Item>
                    <Form.Item name="trigger" label="触发方式" initialValue="manual">
                        <Select>
                            <Option value="manual">手动触发</Option>
                            <Option value="auto">自动触发</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
