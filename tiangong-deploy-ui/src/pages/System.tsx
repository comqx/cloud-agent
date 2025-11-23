import { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Card, Button, message, Space } from 'antd';
import { ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userAPI, userGroupAPI, roleAPI, User, UserGroup, Role } from '../services/api';

export default function System() {
  const [users, setUsers] = useState<User[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.list();
      setUsers(res.data.data);
    } catch (error: any) {
      message.error('加载用户列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async () => {
    setLoading(true);
    try {
      const res = await userGroupAPI.list();
      setUserGroups(res.data.data);
    } catch (error: any) {
      message.error('加载用户组列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await roleAPI.list();
      setRoles(res.data.data);
    } catch (error: any) {
      message.error('加载角色列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'groups') {
      loadUserGroups();
    } else if (activeTab === 'roles') {
      loadRoles();
    }
  }, [activeTab]);

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '全名',
      dataIndex: 'full_name',
      key: 'full_name',
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
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => roles?.map((role) => <Tag key={role}>{role}</Tag>) || '-',
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
          <Button size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const groupColumns = [
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
      title: '成员数',
      dataIndex: 'members',
      key: 'members',
      render: (members: string[]) => members?.length || 0,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UserGroup) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const roleColumns = [
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
      title: '权限数',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: any[]) => permissions?.length || 0,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Role) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="系统管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={
                activeTab === 'users'
                  ? loadUsers
                  : activeTab === 'groups'
                  ? loadUserGroups
                  : loadRoles
              }
              loading={loading}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              {activeTab === 'users' ? '创建用户' : activeTab === 'groups' ? '创建用户组' : '创建角色'}
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: '人员管理',
              children: (
                <Table
                  columns={userColumns}
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'groups',
              label: '用户组管理',
              children: (
                <Table
                  columns={groupColumns}
                  dataSource={userGroups}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'roles',
              label: '角色管理',
              children: (
                <Table
                  columns={roleColumns}
                  dataSource={roles}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'permissions',
              label: '权限管理',
              children: <p>权限管理功能开发中...</p>,
            },
            {
              key: 'settings',
              label: '系统设置',
              children: <p>系统设置功能开发中...</p>,
            },
            {
              key: 'integrations',
              label: '集成管理',
              children: <p>集成管理功能开发中...</p>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

