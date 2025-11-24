import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Steps, Modal } from 'antd';
import { ReloadOutlined, PlusOutlined, BranchesOutlined } from '@ant-design/icons';

const { Step } = Steps;

interface Workflow {
    id: string;
    name: string;
    trigger: string;
    status: 'active' | 'paused';
    last_run: string;
}

export default function Workflows() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Workflow[]>([]);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setData([
                { id: '1', name: 'CI/CD Pipeline', trigger: 'Git Push', status: 'active', last_run: 'success' },
                { id: '2', name: 'Nightly Backup', trigger: 'Schedule (0 0 * * *)', status: 'active', last_run: 'success' },
                { id: '3', name: 'Auto Scaling', trigger: 'Metric Alert', status: 'paused', last_run: 'failed' },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const columns = [
        {
            title: '工作流名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '触发条件',
            dataIndex: 'trigger',
            key: 'trigger',
            render: (text: string) => <Tag>{text}</Tag>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <Tag color={status === 'active' ? 'green' : 'default'}>{status.toUpperCase()}</Tag>,
        },
        {
            title: '上次运行',
            dataIndex: 'last_run',
            key: 'last_run',
            render: (status: string) => <Tag color={status === 'success' ? 'green' : 'red'}>{status.toUpperCase()}</Tag>,
        },
        {
            title: '操作',
            key: 'action',
            render: () => (
                <Space size="middle">
                    <a>编辑</a>
                    <a>运行</a>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h1>工作流编排 (Workflows)</h1>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
                    <Button type="primary" icon={<PlusOutlined />}>新建工作流</Button>
                </Space>
            </div>

            <Card title="可视化编排示例" style={{ marginBottom: '24px' }}>
                <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <Steps current={2} size="small">
                        <Step title="Source" description="Git Checkout" icon={<BranchesOutlined />} />
                        <Step title="Build" description="Docker Build" />
                        <Step title="Test" description="Unit & Integration Tests" />
                        <Step title="Deploy" description="K8s Apply" />
                        <Step title="Verify" description="Health Check" />
                    </Steps>
                </div>
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
