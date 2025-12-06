import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import ProductDetail from './pages/ProductDetail';
import Dashboard from './pages/Dashboard';
import Environments from './pages/Environments';
import Organizations from './pages/Organizations';
import Products from './pages/Products';
import ProductVersionDetail from './pages/ProductVersionDetail';
import Releases from './pages/Releases';
import DeploymentPlans from './pages/DeploymentPlans';
import Tasks from './pages/Tasks';
import Agents from './pages/Agents';
import Changes from './pages/Changes';
import Compliance from './pages/Compliance';
import Configuration from './pages/Configuration';
import Monitoring from './pages/Monitoring';
import Constraints from './pages/Constraints';
import Workflows from './pages/Workflows';
import Integration from './pages/Integration';
import System from './pages/System';
import Audit from './pages/Audit';
import Members from './pages/Members';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* Full-screen routes without Layout */}
          <Route path="/products/:id" element={<ProductDetail />} />

          {/* Routes with Layout */}
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/members" element={<Members />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id/versions/:versionId" element={<ProductVersionDetail />} />
                <Route path="/releases" element={<Releases />} />
                <Route path="/plans" element={<DeploymentPlans />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/changes" element={<Changes />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/configuration" element={<Configuration />} />
                <Route path="/monitoring" element={<Monitoring />} />
                <Route path="/constraints" element={<Constraints />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/integration" element={<Integration />} />
                <Route path="/system" element={<System />} />
                <Route path="/audit" element={<Audit />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
