import { useState, useEffect } from 'react';
import { List, Card, Button, Space, Avatar, Switch, Tag } from 'antd';
import { ReloadOutlined, ApiOutlined, GithubOutlined, SlackOutlined, CloudOutlined } from '@ant-design/icons';

interface IntegrationItem {
    id: string;
    name: string;
    icon: any;
    status: 'connected' | 'disconnected';
    description: string;
}

export default function Integration() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<IntegrationItem[]>([]);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setData([
                { id: '1', name: 'GitHub', icon: <GithubOutlined />, status: 'connected', description: 'Source code repositories and triggers' },
                { id: '2', name: 'Slack', icon: <SlackOutlined />, status: 'connected', description: 'Notifications and ChatOps' },
                { id: '3', name: 'Kubernetes', icon: <CloudOutlined />, status: 'connected', description: 'Container orchestration clusters' },
                { id: '4', name: 'Jira', icon: <ApiOutlined />, status: 'disconnected', description: 'Issue tracking and project management' },
                { id: '5', name: 'Prometheus', icon: <ApiOutlined />, status: 'connected', description: 'Metrics and monitoring' },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h1>集成中心 (Integration)</h1>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
                </Space>
            </div>

            <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
                dataSource={data}
                loading={loading}
                renderItem={item => (
                    <List.Item>
                        <Card actions={[<a>配置</a>, <a>测试连接</a>]}>
                            <Card.Meta
                                avatar={<Avatar icon={item.icon} style={{ backgroundColor: item.status === 'connected' ? '#1890ff' : '#ccc' }} />}
                                title={item.name}
                                description={
                                    <div>
                                        <p style={{ height: '40px', overflow: 'hidden' }}>{item.description}</p>
                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Tag color={item.status === 'connected' ? 'success' : 'default'}>{item.status.toUpperCase()}</Tag>
                                            <Switch checked={item.status === 'connected'} size="small" />
                                        </div>
                                    </div>
                                }
                            />
                        </Card>
                    </List.Item>
                )}
            />
        </div>
    );
}
