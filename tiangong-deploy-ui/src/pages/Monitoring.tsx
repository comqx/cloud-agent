import { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Card, Button, message, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { alertAPI, alertRuleAPI, Alert, AlertRule } from '../services/api';

export default function Monitoring() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertAPI.list();
      setAlerts(res.data.data);
    } catch (error: any) {
      message.error('加载告警列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertRules = async () => {
    setLoading(true);
    try {
      const res = await alertRuleAPI.list();
      setAlertRules(res.data.data);
    } catch (error: any) {
      message.error('加载告警规则失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'alerts') {
      loadAlerts();
    } else if (activeTab === 'rules') {
      loadAlertRules();
    }
  }, [activeTab]);

  const alertColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          critical: 'red',
          warning: 'orange',
          info: 'blue',
        };
        return <Tag color={colorMap[level]}>{level}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'red',
          acknowledged: 'orange',
          resolved: 'success',
          ignored: 'default',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
  ];

  const ruleColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          critical: 'red',
          warning: 'orange',
          info: 'blue',
        };
        return <Tag color={colorMap[level]}>{level}</Tag>;
      },
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
      title: '操作',
      key: 'action',
      render: (_: any, record: AlertRule) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              try {
                await alertRuleAPI.toggle(record.id, !record.enabled);
                message.success('操作成功');
                loadAlertRules();
              } catch (error: any) {
                message.error('操作失败: ' + error.message);
              }
            }}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="监控告警"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={activeTab === 'alerts' ? loadAlerts : loadAlertRules}
              loading={loading}
            >
              刷新
            </Button>
            {activeTab === 'rules' && (
              <Button type="primary" icon={<PlusOutlined />}>
                创建告警规则
              </Button>
            )}
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'alerts',
              label: '告警管理',
              children: (
                <Table
                  columns={alertColumns}
                  dataSource={alerts}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'rules',
              label: '告警规则',
              children: (
                <Table
                  columns={ruleColumns}
                  dataSource={alertRules}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'system',
              label: '系统监控',
              children: <p>系统监控功能开发中...</p>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

