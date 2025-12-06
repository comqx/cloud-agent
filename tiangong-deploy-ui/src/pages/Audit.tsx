import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, DatePicker, Input, Tabs, Row, Col, Statistic, Progress, message, Modal } from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { auditAPI, complianceAPI, type AuditLog, type CompliancePolicy, type ComplianceRule } from '../services/mockApi';

const { RangePicker } = DatePicker;

export default function Audit() {
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [compliancePolicies, setCompliancePolicies] = useState<CompliancePolicy[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [activeTab, setActiveTab] = useState('audit');

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    } else if (activeTab === 'compliance') {
      loadComplianceData();
    }
  }, [activeTab]);

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

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const policiesRes = await complianceAPI.listPolicies();
      setCompliancePolicies(policiesRes.data.data);
      // 加载合规检查结果
      const checkRes = await complianceAPI.check();
      setComplianceRules(checkRes.data.data.results);
    } catch (error: any) {
      message.error('加载合规数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAudit = async () => {
    try {
      const res = await auditAPI.export();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.xlsx`;
      link.click();
      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败: ' + error.message);
    }
  };

  const handleExportCompliance = async () => {
    try {
      const res = await complianceAPI.getReport();
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString()}.pdf`;
      link.click();
      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败: ' + error.message);
    }
  };

  const handleRunComplianceCheck = async () => {
    try {
      const res = await complianceAPI.check();
      setComplianceRules(res.data.data.results);
      message.success('合规检查完成');
    } catch (error: any) {
      message.error('合规检查失败: ' + error.message);
    }
  };

  const auditColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text: string) => (
        <Space>
          <UserOutlined /> {text}
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
    },
    {
      title: '资源ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      render: (text: string) => (text ? <code>{text}</code> : '-'),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (text: string) => text || '-',
    },
    {
      title: '详情',
      key: 'details',
      render: (_: any, record: AuditLog) => (
        <a onClick={() => Modal.info({ title: '操作详情', content: JSON.stringify(record.details || {}, null, 2) })}>
          查看详情
        </a>
      ),
    },
  ];

  const complianceColumns = [
    {
      title: '合规规则',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; icon: any; text: string }> = {
          pass: { color: 'success', icon: <CheckCircleOutlined />, text: '通过' },
          fail: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
          warning: { color: 'warning', icon: <SafetyCertificateOutlined />, text: '警告' },
        };
        const statusInfo = statusMap[status] || { color: 'default', icon: null, text: status };
        return (
          <Tag icon={statusInfo.icon} color={statusInfo.color}>
            {statusInfo.text}
          </Tag>
        );
      },
    },
    {
      title: '最后检查时间',
      dataIndex: 'last_check_at',
      key: 'last_check_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: () => <a>查看详情</a>,
    },
  ];

  // 计算合规统计
  const complianceStats = {
    total: complianceRules.length,
    passed: complianceRules.filter((r) => r.status === 'pass').length,
    failed: complianceRules.filter((r) => r.status === 'fail').length,
    warning: complianceRules.filter((r) => r.status === 'warning').length,
    rate: complianceRules.length > 0 ? (complianceRules.filter((r) => r.status === 'pass').length / complianceRules.length) * 100 : 0,
  };

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>审计与合规</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => (activeTab === 'audit' ? loadAuditLogs() : loadComplianceData())} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'audit',
            label: '操作审计',
            children: (
              <div>
                <Card style={{ marginBottom: '24px' }}>
                  <Space>
                    <RangePicker showTime />
                    <Input placeholder="搜索用户/操作" prefix={<SearchOutlined />} style={{ width: 200 }} />
                    <Button type="primary">查询</Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExportAudit}>
                      导出
                    </Button>
                  </Space>
                </Card>

                <Card bodyStyle={{ padding: 0 }}>
                  <Table columns={auditColumns} dataSource={auditLogs} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
                </Card>
              </div>
            ),
          },
          {
            key: 'compliance',
            label: '合规管理',
            children: (
              <div>
                <Row gutter={24} style={{ marginBottom: '24px' }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="总体合规率"
                        value={complianceStats.rate}
                        precision={1}
                        suffix="%"
                        prefix={<SafetyCertificateOutlined style={{ color: '#1890ff' }} />}
                      />
                      <Progress percent={complianceStats.rate} strokeColor="#1890ff" showInfo={false} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="已通过检查"
                        value={complianceStats.passed}
                        valueStyle={{ color: '#3f8600' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="未通过项"
                        value={complianceStats.failed}
                        valueStyle={{ color: '#cf1322' }}
                        prefix={<CloseCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="警告项"
                        value={complianceStats.warning}
                        valueStyle={{ color: '#faad14' }}
                        prefix={<SafetyCertificateOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card
                  title="合规检查列表"
                  extra={
                    <Space>
                      <Button onClick={handleRunComplianceCheck}>执行检查</Button>
                      <Button icon={<DownloadOutlined />} onClick={handleExportCompliance}>
                        生成报告
                      </Button>
                    </Space>
                  }
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    columns={complianceColumns}
                    dataSource={complianceRules}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
