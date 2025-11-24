import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Tag, Button, Space } from 'antd';
import { ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

export default function Monitoring() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>监控中心</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)}>刷新</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic title="系统健康度" value={98.5} precision={1} suffix="%" prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
            <Progress percent={98.5} showInfo={false} strokeColor="#52c41a" size="small" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="API 请求量 (QPS)" value={1256} prefix={<ArrowUpOutlined style={{ color: '#cf1322' }} />} />
            <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>Compared to last hour</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均响应时间" value={45} suffix="ms" prefix={<ArrowDownOutlined style={{ color: '#3f8600' }} />} />
            <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>Optimal performance</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃告警" value={3} valueStyle={{ color: '#faad14' }} prefix={<WarningOutlined />} />
            <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>2 warnings, 1 critical</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="资源使用趋势">
            <div style={{ height: '300px', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              [Mock Chart: CPU & Memory Usage over last 24h]
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="最近告警">
            <List
              size="small"
              dataSource={[
                { title: 'High CPU Usage', time: '10 mins ago', level: 'warning' },
                { title: 'Disk Space Low', time: '1 hour ago', level: 'critical' },
                { title: 'Service Restarted', time: '2 hours ago', level: 'info' },
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: item.level === 'critical' ? 'red' : item.level === 'warning' ? 'orange' : 'blue' }} />}
                    title={item.title}
                    description={item.time}
                  />
                  <Tag color={item.level === 'critical' ? 'red' : item.level === 'warning' ? 'orange' : 'blue'}>{item.level.toUpperCase()}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
