import { Layout as AntLayout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  CloudOutlined,
  FileOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

const { Header, Content, Sider } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <CloudOutlined />,
      label: <Link to="/">Agent 管理</Link>,
    },
    {
      key: '/tasks',
      icon: <PlayCircleOutlined />,
      label: <Link to="/tasks">任务执行</Link>,
    },
    {
      key: '/files',
      icon: <FileOutlined />,
      label: <Link to="/files">文件管理</Link>,
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: <Link to="/history">历史记录</Link>,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', color: '#fff', padding: '0 24px' }}>
        <h1 style={{ color: '#fff', margin: 0, lineHeight: '64px' }}>Cloud UI</h1>
      </Header>
      <AntLayout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Content style={{ padding: '24px', background: '#fff' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

