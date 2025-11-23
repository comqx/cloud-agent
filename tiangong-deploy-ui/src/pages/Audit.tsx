import { useEffect, useState } from 'react';
import { Tabs, Table, Card, Button, message, Space, Input } from 'antd';
import { ReloadOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { auditAPI, AuditLog } from '../services/api';

const { Search } = Input;

export default function Audit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('operations');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.list();
      setAuditLogs(res.data.data);
    } catch (error: any) {
      message.error('加载审计日志失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleExport = async () => {
    try {
      const res = await auditAPI.export();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败: ' + error.message);
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 150,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 150,
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 150,
    },
    {
      title: '资源ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      width: 200,
      render: (text: string) => (text ? <code>{text.substring(0, 8)}...</code> : '-'),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 150,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details: Record<string, any>) =>
        details ? JSON.stringify(details).substring(0, 100) : '-',
    },
  ];

  return (
    <div>
      <Card
        title="审计与合规"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAuditLogs} loading={loading}>
              刷新
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'operations',
              label: '操作审计',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Search
                      placeholder="搜索操作"
                      allowClear
                      style={{ width: 300 }}
                      onSearch={(value) => {
                        // TODO: 实现搜索功能
                        message.info('搜索功能开发中');
                      }}
                    />
                  </Space>
                  <Table
                    columns={columns}
                    dataSource={auditLogs}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                  />
                </>
              ),
            },
            {
              key: 'changes',
              label: '变更审计',
              children: <p>变更审计功能开发中...</p>,
            },
            {
              key: 'login',
              label: '登录审计',
              children: <p>登录审计功能开发中...</p>,
            },
            {
              key: 'permissions',
              label: '权限审计',
              children: <p>权限审计功能开发中...</p>,
            },
            {
              key: 'compliance',
              label: '合规管理',
              children: <p>合规管理功能开发中...</p>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

