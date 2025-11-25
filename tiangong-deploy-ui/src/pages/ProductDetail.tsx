import { useState, useEffect } from 'react';
import { Button, Select, Tag, Space, Card, message, Menu } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, SettingOutlined, AppstoreOutlined, ApiOutlined, DeploymentUnitOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockProducts, mockProductVersions } from '../mock/data';
import type { Product } from '../types';
import type { MenuProps } from 'antd';

const { Option } = Select;

export default function ProductDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [selectedMenu, setSelectedMenu] = useState('overview');

    useEffect(() => {
        if (id) {
            const foundProduct = mockProducts.find(p => p.id === id);
            if (foundProduct) {
                setProduct(foundProduct);
            } else {
                message.error('未找到该产品');
                navigate('/products');
            }
        }
    }, [id, navigate]);

    if (!product) {
        return <div>加载中...</div>;
    }

    const productVersions = mockProductVersions.filter(v => v.product_id === product.id);

    const menuItems: MenuProps['items'] = [
        {
            key: 'overview',
            icon: <HomeOutlined />,
            label: '概览',
        },
        {
            key: 'dev-config',
            icon: <SettingOutlined />,
            label: '开发配置',
            children: [
                { key: 'version-list', label: '版本列表' },
                { key: 'env-config', label: '环境配置' },
                { key: 'ci-cd', label: 'CI/CD配置' },
            ],
        },
        {
            key: 'system-mgmt',
            icon: <CloudServerOutlined />,
            label: '系统管理',
        },
        {
            key: 'relation-mgmt',
            icon: <AppstoreOutlined />,
            label: '关系管理',
            children: [
                { key: 'dependencies', label: '依赖关系' },
                { key: 'constraints', label: '约束定义' },
            ],
        },
        {
            key: 'feature-dev',
            icon: <ApiOutlined />,
            label: '功能开发',
            children: [
                { key: 'service-mgmt', label: '服务管理' },
                { key: 'sql-scripts', label: 'SQL脚本' },
                { key: 'api-docs', label: 'API文档' },
            ],
        },
        {
            key: 'deploy-mgmt',
            icon: <DeploymentUnitOutlined />,
            label: '部署管理',
            children: [
                { key: 'deploy-scheme', label: '部署方案' },
                { key: 'release-mgmt', label: '版本发布' },
                { key: 'build-history', label: '构建历史' },
            ],
        },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Left Sidebar */}
            <div style={{
                width: 280,
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Product Info Section */}
                <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/products')}
                        style={{ marginBottom: 16 }}
                        size="small"
                    >
                        返回
                    </Button>

                    {/* Product Icon & Name */}
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{
                            width: 60,
                            height: 60,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '12px',
                            margin: '0 auto 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            color: 'white',
                            fontWeight: 'bold',
                        }}>
                            {product.name.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600 }}>
                            {product.name}
                        </h3>
                        <div style={{ fontSize: 12, color: '#999' }}>
                            发布组件开发和快速部署
                        </div>
                    </div>

                    {/* Version Selector */}
                    <Select
                        style={{ width: '100%' }}
                        placeholder="选择版本"
                        size="middle"
                        value={selectedVersion}
                        onChange={(value) => {
                            setSelectedVersion(value);
                            const version = productVersions.find(v => v.id === value);
                            if (version) {
                                message.success(`已选择版本: ${version.version}`);
                            }
                        }}
                    >
                        {productVersions.map(v => (
                            <Option key={v.id} value={v.id}>
                                <Space>
                                    <span>{v.version}</span>
                                    {v.tag && (
                                        <Tag color={v.tag === 'STABLE' ? 'green' : v.tag === 'CANARY' ? 'orange' : 'blue'} style={{ fontSize: 10 }}>
                                            {v.tag}
                                        </Tag>
                                    )}
                                </Space>
                            </Option>
                        ))}
                    </Select>
                </div>

                {/* Menu Section */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <Menu
                        mode="inline"
                        selectedKeys={[selectedMenu]}
                        defaultOpenKeys={['dev-config']}
                        items={menuItems}
                        onClick={({ key }) => setSelectedMenu(key)}
                        style={{ border: 'none' }}
                    />
                </div>
            </div>

            {/* Right Content Area */}
            <div style={{ flex: 1, overflow: 'auto', background: '#f5f7fa' }}>
                <div style={{ padding: '24px' }}>
                    {/* Header Hint */}
                    <p style={{ textAlign: 'center', color: '#999', marginBottom: 24 }}>
                        使用现代化的开发基础，只需要点击个版本的
                    </p>

                    {/* Feature Highlights - 5 circle badges */}
                    <div style={{ marginBottom: 40 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 30 }}>
                            {[
                                { num: '01', title: '开发迭代', desc: '支持快速开发迭代与CI/CD流程的高度集成' },
                                { num: '02', title: '定义组件关系', desc: '精确定义组件、定制独特组件、完整资源包' },
                                { num: '03', title: '开发业务功能', desc: '提供算子包贴近业务代码及业务开发期的扩展打点' },
                                { num: '04', title: '开发组件能力', desc: '应用共建组业务化算法与组件开发优简单的调度管理' },
                                { num: '05', title: '发布组件', desc: '定义发布组件完成日常任务的调度管理、升级调度化与资源优化' }
                            ].map((feature, idx) => (
                                <div key={idx} style={{ textAlign: 'center', flex: '0 0 160px' }}>
                                    <div style={{
                                        width: 70,
                                        height: 70,
                                        background: '#1890ff',
                                        borderRadius: '50%',
                                        margin: '0 auto 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 22,
                                        fontWeight: 'bold',
                                        color: 'white'
                                    }}>
                                        {feature.num}
                                    </div>
                                    <h4 style={{ fontSize: 14, marginBottom: 6, fontWeight: 600 }}>
                                        {feature.title}
                                    </h4>
                                    <p style={{ color: '#666', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom hint */}
                    <p style={{ textAlign: 'center', color: '#999', marginBottom: 24 }}>
                        更多学习请控件相关功能，请前往<a href="#">帮助中心</a>
                    </p>

                    {/* Function Modules - 3 cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        <Card
                            title="组件开发"
                            bordered={false}
                            style={{ background: '#e6f7ff' }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <ul style={{ paddingLeft: 20, margin: 0, color: '#666', fontSize: 13 }}>
                                <li>安装脚手架</li>
                                <li>如何增强组件任何的学习能力 - 个性能模板</li>
                                <li>如何增强算法业务打包的分析</li>
                                <li>如何定制插件编译脚手架</li>
                            </ul>
                        </Card>

                        <Card
                            title="资源设计"
                            bordered={false}
                            style={{ background: '#fff7e6' }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <ul style={{ paddingLeft: 20, margin: 0, color: '#666', fontSize: 13 }}>
                                <li>设计资源包</li>
                                <li>自定义文件</li>
                                <li>自定义文档</li>
                                <li>JS-API</li>
                            </ul>
                        </Card>

                        <Card
                            title="资质问题"
                            bordered={false}
                            style={{ background: '#f0f5ff' }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <ul style={{ paddingLeft: 20, margin: 0, color: '#666', fontSize: 13 }}>
                                <li>组织资源包定义必要的系统开关</li>
                                <li>技术引擎能用的组件开发业务先发</li>
                                <li>一个平台的提升为开发业务现有的功能</li>
                                <li>如何在你的组件作用于所有资源业务功能</li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
