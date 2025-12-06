import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userAPI, organizationAPI, type User, type Organization } from '../services/mockApi';

const { Option } = Select;

export default function Members() {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMember, setEditingMember] = useState<User | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [membersRes, orgsRes] = await Promise.all([
                userAPI.list(),
                organizationAPI.list(),
            ]);
            setMembers(membersRes.data.data);
            setOrganizations(orgsRes.data.data);
        } catch (error: any) {
            message.error('加载数据失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        form.resetFields();
        setEditingMember(null);
        setModalVisible(true);
    };

    const handleEdit = (member: User) => {
        form.setFieldsValue(member);
        setEditingMember(member);
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个成员吗？',
            onOk: async () => {
                try {
                    await userAPI.delete(id);
                    message.success('删除成功');
                    loadData();
                } catch (error: any) {
                    message.error('删除失败: ' + error.message);
                }
            },
        });
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingMember) {
                await userAPI.update(editingMember.id, values);
                message.success('更新成功');
            } else {
                await userAPI.create(values);
                message.success('创建成功');
            }
            setModalVisible(false);
            loadData();
        } catch (error: any) {
            message.error((editingMember ? '更新' : '创建') + '失败: ' + error.message);
        }
    };

    const columns = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '全名',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text: string) => text || '-',
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
            render: (text: string) => text || '-',
        },
        {
            title: '所属组织',
            dataIndex: 'groups',
            key: 'groups',
            render: (groups: string[]) => (
                <Space>
                    {groups && groups.length > 0 ? (
                        groups.map((groupId) => {
                            const org = organizations.find((o) => o.id === groupId);
                            return org ? <Tag key={groupId}>{org.name}</Tag> : null;
                        })
                    ) : (
                        <span style={{ color: '#999' }}>-</span>
                    )}
                </Space>
            ),
        },
        {
            title: '角色',
            dataIndex: 'roles',
            key: 'roles',
            render: (roles: string[]) => (
                <Space>
                    {roles && roles.length > 0 ? (
                        roles.map((role) => <Tag color="blue" key={role}>{role}</Tag>)
                    ) : (
                        <span style={{ color: '#999' }}>-</span>
                    )}
                </Space>
            ),
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
            render: (_: any, record: User) => (
                <Space>
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

    return (
        <div>
            <Card
                title="成员管理"
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                            刷新
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                            创建成员
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={members}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                />
            </Card>

            <Modal
                title={editingMember ? '编辑成员' : '创建成员'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingMember(null);
                }}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="username"
                        label="用户名"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>
                    <Form.Item name="full_name" label="全名">
                        <Input placeholder="请输入全名" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="邮箱"
                        rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
                    >
                        <Input placeholder="请输入邮箱" />
                    </Form.Item>
                    <Form.Item name="groups" label="所属组织">
                        <Select mode="multiple" placeholder="选择组织">
                            {organizations.map((org) => (
                                <Option key={org.id} value={org.id}>
                                    {org.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="roles" label="角色">
                        <Select mode="multiple" placeholder="选择角色">
                            <Option value="admin">管理员</Option>
                            <Option value="developer">开发者</Option>
                            <Option value="operator">运维</Option>
                            <Option value="viewer">查看者</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="status" label="状态" initialValue="active">
                        <Select>
                            <Option value="active">激活</Option>
                            <Option value="inactive">停用</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
