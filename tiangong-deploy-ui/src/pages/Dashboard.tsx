import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, message } from 'antd';
import {
  CloudOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { dashboardAPI, DashboardStats } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data.data);
    } catch (error: any) {
      message.error('加载统计数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>概览仪表盘</h1>

      {/* 系统概览 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="环境总数"
              value={stats?.environments.total || 0}
              prefix={<CloudOutlined />}
              suffix={
                <span style={{ fontSize: '14px' }}>
                  (在线: {stats?.environments.online || 0})
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日部署"
              value={stats?.deployments.today || 0}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="部署成功率"
              value={stats?.deployments.success_rate || 0}
              precision={2}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Agent 总数"
              value={stats?.agents.total || 0}
              prefix={<RobotOutlined />}
              suffix={`在线: ${stats?.agents.online || 0}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 部署统计 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Card title="部署统计" loading={loading}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="本周部署"
                  value={stats?.deployments.this_week || 0}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="成功"
                  value={stats?.deployments.success || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="失败"
                  value={stats?.deployments.failed || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="进行中"
                  value={stats?.deployments.running || 0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<SyncOutlined spin />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务统计" loading={loading}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="今日任务" value={stats?.tasks.today || 0} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="任务成功率"
                  value={stats?.tasks.success_rate || 0}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="任务类型分布"
                  value={Object.keys(stats?.tasks.by_type || {}).length}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 变更统计 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <Card title="变更统计" loading={loading}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="待审批变更"
                  value={stats?.changes.pending_approval || 0}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="本周变更"
                  value={stats?.changes.this_week || 0}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="变更成功率"
                  value={stats?.changes.success_rate || 0}
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="告警统计" loading={loading}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总告警数"
                  value={stats?.alerts.total || 0}
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
        </Col>
      </Row>

      <Card title="快速操作" style={{ marginBottom: '24px' }}>
        <p>快速操作功能正在开发中...</p>
      </Card>

      <Card title="最近活动">
        <p>最近活动功能正在开发中...</p>
      </Card>
    </div>
  );
}

