import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { organizationAPI, type Organization, type OrganizationMember } from '../services/mockApi';

const { Option } = Select;

export default function Organizations() {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [memberFormVisible, setMemberFormVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();

  useEffect(() => {
    loadOrganizations();
  }, []);

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

  const handleCreate = () => {
    form.resetFields();
    setEditingOrg(null);
    setModalVisible(true);
  };

  const handleEdit = (org: Organization) => {
    form.setFieldsValue(org);
    setEditingOrg(org);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个组织吗？',
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

  const handleViewMembers = async (orgId: string) => {
    setSelectedOrgId(orgId);
    await loadMembers(orgId);
    setMembersModalVisible(true);
  };

  const handleAddMember = () => {
    memberForm.resetFields();
    setMemberFormVisible(true);
  };

  const handleMemberSubmit = async (values: any) => {
    try {
      await organizationAPI.addMember(selectedOrgId, values);
      message.success('添加成功');
      setMemberFormVisible(false);
      loadMembers(selectedOrgId);
    } catch (error: any) {
      message.error('添加失败: ' + error.message);
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
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '激活' : '停用'}
        </Tag>
      ),
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
          <Button size="small" icon={<TeamOutlined />} onClick={() => handleViewMembers(record.id)}>
            成员
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
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
        const roleMap: Record<string, { color: string; text: string }> = {
          admin: { color: 'red', text: '管理员' },
          developer: { color: 'blue', text: '研发' },
          tester: { color: 'green', text: '测试' },
          operator: { color: 'orange', text: '运维' },
        };
        const roleInfo = roleMap[role] || { color: 'default', text: role };
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
        <Button size="small" danger onClick={() => handleRemoveMember(record.id)}>
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
        <Table
          columns={orgColumns}
          dataSource={organizations}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* 创建/编辑组织模态框 */}
      <Modal
        title={editingOrg ? '编辑组织' : '创建组织'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingOrg(null);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="组织名称" rules={[{ required: true, message: '请输入组织名称' }]}>
            <Input placeholder="请输入组织名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入组织描述" />
          </Form.Item>
          <Form.Item name="leader_name" label="负责人">
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">激活</Option>
              <Option value="inactive">停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看成员模态框 */}
      <Modal
        title="组织成员"
        open={membersModalVisible}
        onCancel={() => setMembersModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setMembersModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMember}>
            添加成员
          </Button>
        </div>
        <Table
          columns={memberColumns}
          dataSource={members}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>

      {/* 添加成员模态框 */}
      <Modal
        title="添加成员"
        open={memberFormVisible}
        onCancel={() => setMemberFormVisible(false)}
        onOk={() => memberForm.submit()}
        width={500}
      >
        <Form form={memberForm} layout="vertical" onFinish={handleMemberSubmit}>
          <Form.Item name="user_id" label="用户ID" rules={[{ required: true, message: '请输入用户ID' }]}>
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="developer" rules={[{ required: true, message: '请选择角色' }]}>
            <Select>
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
