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
      key: '/agents',
      icon: <RobotOutlined />,
      label: <Link to="/agents">Agent 管理</Link>,
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
      key: '/configuration',
      icon: <SettingOutlined />,
      label: <Link to="/configuration">配置管理</Link>,
    },
    {
      key: '/monitoring',
      icon: <BellOutlined />,
      label: <Link to="/monitoring">监控告警</Link>,
    },
    {
      key: '/system',
      icon: <UserOutlined />,
      label: <Link to="/system">系统管理</Link>,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#fff', margin: 0, lineHeight: '64px', fontSize: '18px' }}>Tiangong Deploy</h1>
        <div style={{ color: '#fff', fontSize: '14px' }}>
          部署管理平台
        </div>
      </Header>
      <AntLayout>
        <Sider width={240} style={{ background: '#fff' }}>
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

