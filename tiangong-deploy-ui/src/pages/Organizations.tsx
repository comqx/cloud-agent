import { useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Modal, Form, Input, Select, Tree, Space, Tabs } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { organizationAPI, type Organization, type OrganizationMember } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('list');

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const res = await organizationAPI.list();
      setOrganizations(res.data.data);
    } catch (error: any) {
      message.error('加载组织列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const res = await organizationAPI.getMembers(orgId);
      setMembers(res.data.data);
    } catch (error: any) {
      message.error('加载成员列表失败: ' + error.message);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleCreate = () => {
    setEditingOrg(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    form.setFieldsValue(org);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个组织部门吗？',
      onOk: async () => {
        try {
          await organizationAPI.delete(id);
          message.success('删除成功');
          loadOrganizations();
        } catch (error: any) {
          message.error('删除失败: ' + error.message);
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingOrg) {
        await organizationAPI.update(editingOrg.id, values);
        message.success('更新成功');
      } else {
        await organizationAPI.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadOrganizations();
    } catch (error: any) {
      message.error((editingOrg ? '更新' : '创建') + '失败: ' + error.message);
    }
  };

  const handleAddMember = (orgId: string) => {
    setSelectedOrgId(orgId);
    memberForm.resetFields();
    setMemberModalVisible(true);
  };

  const handleMemberSubmit = async (values: any) => {
    try {
      await organizationAPI.addMember(selectedOrgId, {
        user_id: values.user_id,
        role: values.role,
      });
      message.success('添加成员成功');
      setMemberModalVisible(false);
      loadMembers(selectedOrgId);
    } catch (error: any) {
      message.error('添加成员失败: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定要移除这个成员吗？',
      onOk: async () => {
        try {
          await organizationAPI.removeMember(selectedOrgId, memberId);
          message.success('移除成功');
          loadMembers(selectedOrgId);
        } catch (error: any) {
          message.error('移除失败: ' + error.message);
        }
      },
    });
  };

  const orgColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '负责人',
      dataIndex: 'leader_name',
      key: 'leader_name',
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'success',
          inactive: 'default',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags?.map((tag) => <Tag key={tag}>{tag}</Tag>) || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Organization) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={() => {
              setSelectedOrgId(record.id);
              setActiveTab('members');
            }}
          >
            成员
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: '用户名',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: Record<string, { text: string; color: string }> = {
          admin: { text: '管理员', color: 'red' },
          developer: { text: '研发', color: 'blue' },
          tester: { text: '测试', color: 'green' },
          operator: { text: '运维', color: 'orange' },
        };
        const roleInfo = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    {
      title: '加入时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: OrganizationMember) => (
        <Button
          size="small"
          danger
          onClick={() => handleRemoveMember(record.id)}
        >
          移除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="组织管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadOrganizations} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建组织
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '组织列表',
              children: (
                <Table
                  columns={orgColumns}
                  dataSource={organizations}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'members',
              label: '成员管理',
              children: selectedOrgId ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddMember(selectedOrgId)}
                    >
                      添加成员
                    </Button>
                  </div>
                  <Table
                    columns={memberColumns}
                    dataSource={members}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  请先选择一个组织部门
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingOrg ? '编辑组织' : '创建组织'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="请输入组织名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入组织描述" />
          </Form.Item>
          <Form.Item name="parent_id" label="父组织">
            <Select placeholder="选择父组织（可选）" allowClear>
              {organizations.map((org) => (
                <Option key={org.id} value={org.id}>
                  {org.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="leader_id" label="负责人ID">
            <Input placeholder="请输入负责人ID" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">活跃</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加成员"
        open={memberModalVisible}
        onCancel={() => setMemberModalVisible(false)}
        onOk={() => memberForm.submit()}
        width={500}
      >
        <Form form={memberForm} layout="vertical" onFinish={handleMemberSubmit}>
          <Form.Item name="user_id" label="用户ID" rules={[{ required: true }]}>
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select placeholder="选择角色">
              <Option value="admin">管理员</Option>
              <Option value="developer">研发</Option>
              <Option value="tester">测试</Option>
              <Option value="operator">运维</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

