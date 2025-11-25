import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, Switch, message, Descriptions } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { mockConstraints } from '../mock/data';
import type { Constraint } from '../types';

const { TextArea } = Input;
const { Option } = Select;

export default function Constraints() {
    const [loading, setLoading] = useState(false);
    const [constraints, setConstraints] = useState<Constraint[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedConstraint, setSelectedConstraint] = useState<Constraint | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadConstraints();
    }, []);

    const loadConstraints = () => {
        setLoading(true);
        setTimeout(() => {
            setConstraints(mockConstraints);
            setLoading(false);
        }, 300);
    };

    const handleCreate = () => {
        form.resetFields();
        setSelectedConstraint(null);
        setModalVisible(true);
    };

    const handleEdit = (constraint: Constraint) => {
        form.setFieldsValue(constraint);
        setSelectedConstraint(constraint);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个约束规则吗？',
            onOk: () => {
                message.success('删除成功');
                loadConstraints();
            },
        });
    };

    const handleViewDetail = (constraint: Constraint) => {
        setSelectedConstraint(constraint);
        setDetailModalVisible(true);
    };

    const handleValidate = (constraint: Constraint) => {
        message.info(`正在验证约束: ${constraint.name}`);
        setTimeout(() => {
            message.success('约束验证通过');
        }, 1000);
    };

    const handleSubmit = (values: any) => {
        message.success(selectedConstraint ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadConstraints();
    };

    const columns = [
        {
            title: '约束名称',
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
                    product_dependency: { color: 'blue', text: '产品依赖' },
                    version_requirement: { color: 'green', text: '版本要求' },
                    environment_restriction: { color: 'orange', text: '环境限制' },
                    resource_limit: { color: 'red', text: '资源限制' },
                    maintenance_window: { color: 'purple', text: '维护窗口' },
                };
                const typeInfo = typeMap[type] || { color: 'default', text: type };
                return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
            },
        },
        {
            title: '范围',
            dataIndex: 'scope',
            key: 'scope',
            render: (scope: string) => {
                const scopeMap: Record<string, string> = {
                    product: '产品',
                    environment: '环境',
                    global: '全局',
                };
                return <Tag>{scopeMap[scope] || scope}</Tag>;
            },
        },
        {
            title: '规则数量',
            dataIndex: 'rules',
            key: 'rules',
            render: (rules: any[]) => rules?.length || 0,
        },
        {
            title: '状态',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
            ),
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
            render: (_: any, record: Constraint) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
                        详情
                    </Button>
                    <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleValidate(record)}>
                        验证
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

    return (
        <div>
            <Card
                title="约束引擎"
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={loadConstraints} loading={loading}>
                            刷新
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            创建约束
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={constraints}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                />
            </Card>

            {/* 创建/编辑 Modal */}
            <Modal
                title={selectedConstraint ? '编辑约束' : '创建约束'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="约束名称" rules={[{ required: true }]}>
                        <Input placeholder="请输入约束名称" />
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={3} placeholder="请输入约束描述" />
                    </Form.Item>
                    <Form.Item name="type" label="约束类型" rules={[{ required: true }]}>
                        <Select placeholder="选择约束类型">
                            <Option value="product_dependency">产品依赖</Option>
                            <Option value="version_requirement">版本要求</Option>
                            <Option value="environment_restriction">环境限制</Option>
                            <Option value="resource_limit">资源限制</Option>
                            <Option value="maintenance_window">维护窗口</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="scope" label="约束范围" rules={[{ required: true }]}>
                        <Select placeholder="选择约束范围">
                            <Option value="product">产品</Option>
                            <Option value="environment">环境</Option>
                            <Option value="global">全局</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="target_id" label="目标ID">
                        <Input placeholder="产品ID或环境ID（可选）" />
                    </Form.Item>
                    <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 详情 Modal */}
            <Modal
                title="约束详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalVisible(false)}>
                        关闭
                    </Button>,
                ]}
                width={800}
            >
                {selectedConstraint && (
                    <div>
                        <Descriptions bordered column={2} style={{ marginBottom: '16px' }}>
                            <Descriptions.Item label="约束名称">{selectedConstraint.name}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={selectedConstraint.enabled ? 'success' : 'default'}>
                                    {selectedConstraint.enabled ? '启用' : '禁用'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="类型">
                                <Tag>{selectedConstraint.type}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="范围">
                                <Tag>{selectedConstraint.scope}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="目标ID">{selectedConstraint.target_id || '-'}</Descriptions.Item>
                            <Descriptions.Item label="创建时间">
                                {new Date(selectedConstraint.created_at).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="描述" span={2}>
                                {selectedConstraint.description || '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Card title="约束规则" size="small">
                            {selectedConstraint.rules?.map((rule) => (
                                <Card key={rule.id} size="small" style={{ marginBottom: '8px' }}>
                                    <Descriptions size="small" column={1}>
                                        <Descriptions.Item label="条件">{rule.condition}</Descriptions.Item>
                                        <Descriptions.Item label="值">{JSON.stringify(rule.value)}</Descriptions.Item>
                                        <Descriptions.Item label="错误消息">{rule.error_message || '-'}</Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            ))}
                        </Card>
                    </div>
                )}
            </Modal>
        </div>
    );
}
