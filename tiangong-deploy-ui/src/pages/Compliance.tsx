import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Progress, Row, Col, Statistic } from 'antd';
import { ReloadOutlined, SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ComplianceItem {
    id: string;
    rule: string;
    status: 'passed' | 'failed' | 'warning';
    last_check: string;
    details: string;
}

export default function Compliance() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ComplianceItem[]>([]);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setData([
                { id: '1', rule: 'Encryption at Rest', status: 'passed', last_check: '2023-10-26 10:00:00', details: 'All databases are encrypted' },
                { id: '2', rule: 'TLS 1.2+ Required', status: 'passed', last_check: '2023-10-26 10:05:00', details: 'Ingress controllers configured correctly' },
                { id: '3', rule: 'Image Vulnerability Scan', status: 'failed', last_check: '2023-10-26 09:30:00', details: 'Critical vulnerabilities found in redis:latest' },
                { id: '4', rule: 'Least Privilege Access', status: 'warning', last_check: '2023-10-26 11:00:00', details: 'Some roles have excessive permissions' },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const columns = [
        {
            title: '合规规则',
            dataIndex: 'rule',
            key: 'rule',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const color = status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'warning';
                const icon = status === 'passed' ? <CheckCircleOutlined /> : status === 'failed' ? <CloseCircleOutlined /> : <SafetyCertificateOutlined />;
                return <Tag icon={icon} color={color}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: '最后检查时间',
            dataIndex: 'last_check',
            key: 'last_check',
        },
        {
            title: '详情',
            dataIndex: 'details',
            key: 'details',
        },
        {
            title: '操作',
            key: 'action',
            render: () => <a>查看报告</a>,
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h1>合规审计 (Compliance)</h1>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
                    <Button type="primary">生成报告</Button>
                </Space>
            </div>

            <Row gutter={24} style={{ marginBottom: '24px' }}>
                <Col span={8}>
                    <Card>
                        <Statistic title="总体合规率" value={75} suffix="%" prefix={<SafetyCertificateOutlined style={{ color: '#1890ff' }} />} />
                        <Progress percent={75} strokeColor="#1890ff" showInfo={false} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="已通过检查" value={2} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="未通过项" value={1} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card title="合规检查列表" bodyStyle={{ padding: 0 }}>
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
