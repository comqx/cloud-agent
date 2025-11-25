import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import Products from './pages/Products';
import Organizations from './pages/Organizations';
import DeploymentPlans from './pages/DeploymentPlans';
import Tasks from './pages/Tasks';
import Agents from './pages/Agents';
import Changes from './pages/Changes';
import Audit from './pages/Audit';
import ConfigurationPage from './pages/Configuration';
import Monitoring from './pages/Monitoring';
import System from './pages/System';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/environments" element={<Environments />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<Products />} />
            <Route path="/products/:id/versions/:versionId" element={<Products />} />
            <Route path="/deployment-plans" element={<DeploymentPlans />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/changes" element={<Changes />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/configuration" element={<ConfigurationPage />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/system" element={<System />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;

