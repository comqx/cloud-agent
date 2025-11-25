import { Layout as AntLayout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  CloudOutlined,
  AppstoreOutlined,
  TeamOutlined,
  RocketOutlined,
  UnorderedListOutlined,
  RobotOutlined,
  SwapOutlined,
  SafetyOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LockOutlined,
  ToolOutlined,
  ApiOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Content, Sider } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">概览仪表盘</Link>,
    },
    {
      type: 'divider',
    },
    // 基础管理模块
    {
      key: 'basic-management',
      label: '基础管理',
      type: 'group',
    },
    {
      key: '/environments',
      icon: <CloudOutlined />,
      label: <Link to="/environments">环境管理</Link>,
    },
    {
      key: '/organizations',
      icon: <TeamOutlined />,
      label: <Link to="/organizations">组织管理</Link>,
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: <Link to="/products">产品管理</Link>,
    },
    {
      type: 'divider',
    },
    // 部署与发布模块
    {
      key: 'deployment-release',
      label: '部署与发布',
      type: 'group',
    },
    {
      key: '/deployment-plans',
      icon: <RocketOutlined />,
      label: <Link to="/deployment-plans">部署计划</Link>,
    },
    {
      key: '/tasks',
      icon: <UnorderedListOutlined />,
      label: <Link to="/tasks">任务管理</Link>,
    },
    {
      key: '/workflows',
      icon: <DeploymentUnitOutlined />,
      label: <Link to="/workflows">工作流管理</Link>,
    },
    {
      key: '/agents',
      icon: <RobotOutlined />,
      label: <Link to="/agents">Agent 管理</Link>,
    },
    {
      type: 'divider',
    },
    // 变更与合规模块
    {
      key: 'change-compliance',
      label: '变更与合规',
      type: 'group',
    },
    {
      key: '/changes',
      icon: <SwapOutlined />,
      label: <Link to="/changes">变更管理</Link>,
    },
    {
      key: '/audit',
      icon: <SafetyOutlined />,
      label: <Link to="/audit">审计与合规</Link>,
    },
    {
      type: 'divider',
    },
    // 配置与资源模块
    {
      key: 'config-resource',
      label: '配置与资源',
      type: 'group',
    },
    {
      key: '/configuration',
      icon: <SettingOutlined />,
      label: <Link to="/configuration">配置管理</Link>,
    },
    {
      key: '/constraints',
      icon: <LockOutlined />,
      label: <Link to="/constraints">约束引擎</Link>,
    },
    {
      type: 'divider',
    },
    // 监控与可观测性模块
    {
      key: 'monitoring-observability',
      label: '监控告警',
      type: 'group',
    },
    {
      key: '/monitoring',
      icon: <BellOutlined />,
      label: <Link to="/monitoring">监控告警</Link>,
    },
    {
      type: 'divider',
    },

    // 集成与扩展模块
    {
      key: 'integration-extension',
      label: '集成与扩展',
      type: 'group',
    },
    {
      key: '/integration',
      icon: <ApiOutlined />,
      label: <Link to="/integration">集成管理</Link>,
    },
    {
      type: 'divider',
    },
    // 系统管理模块
    {
      key: 'system-management',
      label: '系统管理',
      type: 'group',
    },
    {
      key: '/system',
      icon: <UserOutlined />,
      label: <Link to="/system">系统管理</Link>,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          color: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ToolOutlined style={{ fontSize: '24px', marginRight: '12px' }} />
          <h1 style={{ color: '#fff', margin: 0, lineHeight: '64px', fontSize: '20px', fontWeight: 600 }}>
            Tiangong Deploy
          </h1>
        </div>
        <div style={{ color: '#fff', fontSize: '14px' }}>部署管理平台</div>
      </Header>
      <AntLayout>
        <Sider width={240} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Content style={{ padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
