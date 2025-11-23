import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Agents from './pages/Agents';
import Tasks from './pages/Tasks';
import Files from './pages/Files';
import History from './pages/History';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Agents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/files" element={<Files />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;

