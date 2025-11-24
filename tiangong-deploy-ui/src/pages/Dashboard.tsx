import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, message, Button, List, Avatar } from 'antd';
import {
  CloudOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  RobotOutlined,
  WarningOutlined,
  BellOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { DashboardStats } from '../types';
import { mockDashboardStats, mockDeployments, mockChanges } from '../mock/data';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setStats(mockDashboardStats);
      setLoading(false);
    }, 500);
  }, []);

  const recentDeployments = mockDeployments.slice(0, 5);
  const pendingChanges = mockChanges.filter(c => c.status === 'pending_approval');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>概览仪表盘</h1>
        <Button type="primary">快速部署</Button>
      </div>

      {/* 系统概览 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="环境总数"
              value={stats?.environments.total || 0}
              prefix={<CloudOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <span style={{ fontSize: '14px', color: '#8c8c8c', marginLeft: '8px' }}>
                  (在线: {stats?.environments.online || 0})
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="今日部署"
              value={stats?.deployments.today || 0}
              prefix={<RocketOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="部署成功率"
              value={stats?.deployments.success_rate || 0}
              precision={2}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable>
            <Statistic
              title="Agent 总数"
              value={stats?.agents.total || 0}
              prefix={<RobotOutlined style={{ color: '#fa8c16' }} />}
              suffix={
                <span style={{ fontSize: '14px', color: '#8c8c8c', marginLeft: '8px' }}>
                  (在线: {stats?.agents.online || 0})
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* 左侧主要内容 */}
        <Col span={16}>
          {/* 部署统计 */}
          <Card title="部署趋势" style={{ marginBottom: '24px' }} loading={loading}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="本周部署" value={stats?.deployments.this_week || 0} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="成功"
                  value={stats?.deployments.success || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="失败"
                  value={stats?.deployments.failed || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="进行中"
                  value={stats?.deployments.running || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<SyncOutlined spin />}
                />
              </Col>
            </Row>
          </Card>

          {/* 最近部署列表 */}
          <Card title="最近部署" extra={<a href="/deployments">查看全部 <RightOutlined /></a>}>
            <List
              itemLayout="horizontal"
              dataSource={recentDeployments}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={item.status === 'success' ? <CheckCircleOutlined /> : item.status === 'running' ? <SyncOutlined spin /> : <CloseCircleOutlined />}
                        style={{ backgroundColor: item.status === 'success' ? '#f6ffed' : item.status === 'running' ? '#e6f7ff' : '#fff1f0', color: item.status === 'success' ? '#52c41a' : item.status === 'running' ? '#1890ff' : '#cf1322' }}
                      />
                    }
                    title={<span>{item.product_id} - v{item.version}</span>}
                    description={`Environment: ${item.environment_id} | Strategy: ${item.strategy}`}
                  />
                  <div>{new Date(item.created_at).toLocaleString()}</div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧侧边栏 */}
        <Col span={8}>
          {/* 待办事项 */}
          <Card title="待办事项" style={{ marginBottom: '24px' }}>
            <List
              dataSource={pendingChanges}
              renderItem={(item) => (
                <List.Item actions={[<a key="approve">审批</a>]}>
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: '#faad14', fontSize: '24px' }} />}
                    title={item.title}
                    description={`Type: ${item.type}`}
                  />
                </List.Item>
              )}
            />
            {pendingChanges.length === 0 && <div style={{ textAlign: 'center', color: '#999' }}>暂无待办事项</div>}
          </Card>

          {/* 告警概览 */}
          <Card title="告警概览" style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总告警"
                  value={stats?.alerts.total || 0}
                  prefix={<BellOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="严重"
                  value={stats?.alerts.critical || 0}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="警告"
                  value={stats?.alerts.warning || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>

          {/* 任务统计 */}
          <Card title="任务执行">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="今日任务" value={stats?.tasks.today || 0} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="成功率"
                  value={stats?.tasks.success_rate || 0}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: '16px' }}>
              {Object.entries(stats?.tasks.by_type || {}).map(([type, count]) => (
                <Tag key={type} style={{ marginBottom: '8px' }}>{type}: {count}</Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

