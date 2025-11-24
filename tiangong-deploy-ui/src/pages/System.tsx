import { useState, useEffect } from 'react';
import { Card, Row, Col, Descriptions, Badge, List, Button, Space, Tabs } from 'antd';
import { ReloadOutlined, SettingOutlined, CloudServerOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

export default function System() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>系统管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
          <Button icon={<SettingOutlined />}>系统设置</Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="系统状态" style={{ marginBottom: '24px' }}>
            <Descriptions bordered>
              <Descriptions.Item label="系统版本">v1.2.0</Descriptions.Item>
              <Descriptions.Item label="构建时间">2023-10-20 10:00:00</Descriptions.Item>
              <Descriptions.Item label="运行时间">15 days 4 hours</Descriptions.Item>
              <Descriptions.Item label="状态" span={3}>
                <Badge status="processing" text="Running" />
              </Descriptions.Item>
              <Descriptions.Item label="数据库连接">
                <Badge status="success" text="Connected" />
              </Descriptions.Item>
              <Descriptions.Item label="Redis 连接">
                <Badge status="success" text="Connected" />
              </Descriptions.Item>
              <Descriptions.Item label="消息队列">
                <Badge status="success" text="Connected" />
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="服务组件">
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={[
                { title: 'API Gateway', status: 'active', icon: <CloudServerOutlined /> },
                { title: 'Auth Service', status: 'active', icon: <SafetyCertificateOutlined /> },
                { title: 'Deployment Engine', status: 'active', icon: <SettingOutlined /> },
                { title: 'Task Scheduler', status: 'active', icon: <ClockCircleOutlined /> },
                { title: 'Log Collector', status: 'active', icon: <DatabaseOutlined /> },
                { title: 'Notification Service', status: 'active', icon: <CloudServerOutlined /> },
              ]}
              renderItem={item => (
                <List.Item>
                  <Card>
                    <Card.Meta
                      avatar={item.icon}
                      title={item.title}
                      description={<Badge status="success" text="Active" />}
                    />
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="系统公告" style={{ marginBottom: '24px' }}>
            <List
              dataSource={[
                { title: 'Scheduled Maintenance', date: '2023-10-25' },
                { title: 'New Feature Release v1.2.0', date: '2023-10-20' },
                { title: 'Security Patch Update', date: '2023-10-15' },
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={<a>{item.title}</a>}
                    description={item.date}
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card title="许可证信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="授权给">Tiangong Inc.</Descriptions.Item>
              <Descriptions.Item label="类型">Enterprise</Descriptions.Item>
              <Descriptions.Item label="过期时间">2024-12-31</Descriptions.Item>
              <Descriptions.Item label="最大节点数">1000</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Helper icon
function ClockCircleOutlined(props: any) {
  return <span {...props}>🕒</span>;
}
