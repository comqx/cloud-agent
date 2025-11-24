import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Switch, Modal, Form, Input, Select } from 'antd';
import { ReloadOutlined, PlusOutlined, LockOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface Constraint {
    id: string;
    name: string;
    type: string;
    scope: string;
    status: 'active' | 'inactive';
    description: string;
}

export default function Constraints() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Constraint[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setData([
                { id: '1', name: 'Freeze Window', type: 'Time Window', scope: 'Production', status: 'active', description: 'No deployments during weekends' },
                { id: '2', name: 'QA Approval', type: 'Approval', scope: 'All Environments', status: 'active', description: 'Requires QA sign-off before promotion' },
                { id: '3', name: 'Resource Limit', type: 'Resource', scope: 'Dev', status: 'inactive', description: 'Limit CPU/Memory usage in Dev' },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const columns = [
        {
            title: '策略名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            render: (text: string) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: '作用范围',
            dataIndex: 'scope',
            key: 'scope',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Switch checked={status === 'active'} checkedChildren="开启" unCheckedChildren="关闭" />
            ),
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: '操作',
            key: 'action',
            render: () => (
                <Space size="middle">
                    <a>编辑</a>
                    <a style={{ color: 'red' }}>删除</a>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h1>约束策略 (Constraints)</h1>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>新建策略</Button>
                </Space>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title="新建约束策略"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="策略名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                        <Select>
                            <Option value="time_window">时间窗口</Option>
                            <Option value="approval">审批流</Option>
                            <Option value="resource">资源限制</Option>
                            <Option value="dependency">依赖检查</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="scope" label="作用范围" rules={[{ required: true }]}>
                        <Select>
                            <Option value="global">全局</Option>
                            <Option value="prod">生产环境</Option>
                            <Option value="dev">开发环境</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="描述">
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
