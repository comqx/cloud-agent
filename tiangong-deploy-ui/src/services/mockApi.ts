// Mock API Service - 使用本地 mock 数据代替真实 API 调用
import {
    mockEnvironments,
    mockOrganizations,
    mockOrganizationMembers,
    mockProducts,
    mockProductVersions,
    mockReleases,
    mockDeployments,
    mockTasks,
    mockAgents,
    mockChanges,
    mockAuditLogs,
    mockDashboardStats,
    mockDeploymentPlans,
    mockUsers,
    mockUserGroups,
    mockRoles,
    mockAlerts,
    mockAlertRules,
    mockConfigurations,
} from '../mock/data';

import type {
    Agent,
    Task,
    Log,
    File,
    Environment,
    Organization,
    OrganizationMember,
    Product,
    ProductVersion,
    Release,
    Deployment,
    Change,
    AuditLog,
    Configuration,
    Alert,
    AlertRule,
    User,
    UserGroup,
    Role,
    DashboardStats,
    CompliancePolicy,
    ComplianceRule,
} from '../types';

// 模拟延迟
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟响应格式
const mockResponse = <T>(data: T) => ({
    data: { data },
});

// Agent API
export const agentAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockAgents);
    },
    get: async (id: string) => {
        await delay();
        const agent = mockAgents.find(a => a.id === id);
        if (!agent) throw new Error('Agent not found');
        return mockResponse(agent);
    },
    getStatus: async (id: string) => {
        await delay();
        const agent = mockAgents.find(a => a.id === id);
        return mockResponse({ status: agent?.status || 'unknown' });
    },
};

// Task API
export const taskAPI = {
    create: async (data: any) => {
        await delay();
        const newTask: Task = {
            id: `task - ${Date.now()} `,
            agent_id: data.agent_id,
            type: data.type,
            status: 'pending',
            command: data.command,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        return mockResponse(newTask);
    },
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockTasks);
    },
    get: async (id: string) => {
        await delay();
        const task = mockTasks.find(t => t.id === id);
        if (!task) throw new Error('Task not found');
        return mockResponse(task);
    },
    getLogs: async (id: string, limit?: number) => {
        await delay();
        return mockResponse([]);
    },
    cancel: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// File API
export const fileAPI = {
    upload: async (file: globalThis.File) => {
        await delay(500);
        const mockFile: File = {
            id: `file - ${Date.now()} `,
            name: file.name,
            size: file.size,
            type: file.type,
            created_at: new Date().toISOString(),
        };
        return mockResponse(mockFile);
    },
    list: async (params?: any) => {
        await delay();
        return mockResponse([]);
    },
    get: async (id: string) => {
        await delay();
        throw new Error('File not found');
    },
    download: async (id: string) => {
        await delay();
        return new Blob();
    },
    distribute: async (id: string, data: any) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// Environment API
export const environmentAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockEnvironments);
    },
    get: async (id: string) => {
        await delay();
        const env = mockEnvironments.find(e => e.id === id);
        if (!env) throw new Error('Environment not found');
        return mockResponse(env);
    },
    create: async (data: Partial<Environment>) => {
        await delay();
        const newEnv: Environment = {
            id: `env - ${Date.now()} `,
            name: data.name || '',
            description: data.description || '',
            type: data.type || 'development',
            status: 'online',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newEnv);
    },
    update: async (id: string, data: Partial<Environment>) => {
        await delay();
        const env = mockEnvironments.find(e => e.id === id);
        if (!env) throw new Error('Environment not found');
        return mockResponse({ ...env, ...data });
    },
    delete: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    checkHealth: async (id: string) => {
        await delay();
        return mockResponse({ status: 'healthy' });
    },
};

// Product API
export const productAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockProducts);
    },
    get: async (id: string) => {
        await delay();
        const product = mockProducts.find(p => p.id === id);
        if (!product) throw new Error('Product not found');
        return mockResponse(product);
    },
    create: async (data: Partial<Product>) => {
        await delay();
        const newProduct: Product = {
            id: `prod - ${Date.now()} `,
            name: data.name || '',
            description: data.description || '',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newProduct);
    },
    update: async (id: string, data: Partial<Product>) => {
        await delay();
        const product = mockProducts.find(p => p.id === id);
        if (!product) throw new Error('Product not found');
        return mockResponse({ ...product, ...data });
    },
    delete: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    getVersions: async (id: string) => {
        await delay();
        const versions = mockProductVersions.filter(v => v.product_id === id);
        return mockResponse(versions);
    },
    createVersion: async (id: string, data: Partial<ProductVersion>) => {
        await delay();
        const newVersion: ProductVersion = {
            id: `ver - ${Date.now()} `,
            product_id: id,
            version: data.version || '',
            created_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newVersion);
    },
};

// Release API
export const releaseAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockReleases);
    },
    get: async (id: string) => {
        await delay();
        const release = mockReleases.find(r => r.id === id);
        if (!release) throw new Error('Release not found');
        return mockResponse(release);
    },
    create: async (data: Partial<Release>) => {
        await delay();
        const newRelease: Release = {
            id: `rel - ${Date.now()} `,
            product_id: data.product_id || '',
            version: data.version || '',
            approval_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newRelease);
    },
    update: async (id: string, data: Partial<Release>) => {
        await delay();
        const release = mockReleases.find(r => r.id === id);
        if (!release) throw new Error('Release not found');
        return mockResponse({ ...release, ...data });
    },
    approve: async (id: string, approved: boolean, comment?: string) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// Deployment API
export const deploymentAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockDeployments);
    },
    get: async (id: string) => {
        await delay();
        const deployment = mockDeployments.find(d => d.id === id);
        if (!deployment) throw new Error('Deployment not found');
        return mockResponse(deployment);
    },
    create: async (data: Partial<Deployment>) => {
        await delay();
        const newDeployment: Deployment = {
            id: `dep - ${Date.now()} `,
            product_id: data.product_id || '',
            environment_id: data.environment_id || '',
            version: data.version || '',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newDeployment);
    },
    execute: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    pause: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    resume: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    cancel: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    rollback: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    getLogs: async (id: string) => {
        await delay();
        return mockResponse([]);
    },
};

// Change API
export const changeAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockChanges);
    },
    get: async (id: string) => {
        await delay();
        const change = mockChanges.find(c => c.id === id);
        if (!change) throw new Error('Change not found');
        return mockResponse(change);
    },
    create: async (data: Partial<Change>) => {
        await delay();
        const newChange: Change = {
            id: `chg - ${Date.now()} `,
            title: data.title || '',
            type: data.type || 'deployment',
            status: 'draft',
            created_by: 'current_user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        return mockResponse(newChange);
    },
    update: async (id: string, data: Partial<Change>) => {
        await delay();
        const change = mockChanges.find(c => c.id === id);
        if (!change) throw new Error('Change not found');
        return mockResponse({ ...change, ...data });
    },
    submit: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    approve: async (id: string, approved: boolean, comment?: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    execute: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    rollback: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// Audit API
export const auditAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockAuditLogs);
    },
    get: async (id: string) => {
        await delay();
        const log = mockAuditLogs.find(l => l.id === id);
        if (!log) throw new Error('Audit log not found');
        return mockResponse(log);
    },
    export: async (params?: any) => {
        await delay();
        return new Blob();
    },
};

// Compliance API
export const complianceAPI = {
    listPolicies: async () => {
        await delay();
        return mockResponse([]);
    },
    getPolicy: async (id: string) => {
        await delay();
        throw new Error('Policy not found');
    },
    createPolicy: async (data: any) => {
        await delay();
        return mockResponse(data);
    },
    updatePolicy: async (id: string, data: any) => {
        await delay();
        return mockResponse(data);
    },
    deletePolicy: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    check: async (policyId?: string) => {
        await delay();
        return mockResponse({ results: [] });
    },
    getReport: async (params?: any) => {
        await delay();
        return new Blob();
    },
};

// Configuration API
export const configurationAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockConfigurations);
    },
    get: async (id: string) => {
        await delay();
        const config = mockConfigurations.find(c => c.id === id);
        if (!config) throw new Error('Configuration not found');
        return mockResponse(config);
    },
    create: async (data: any) => {
        await delay();
        return mockResponse(data);
    },
    update: async (id: string, data: any) => {
        await delay();
        return mockResponse(data);
    },
    delete: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    sync: async (data: any) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// Alert API
export const alertAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockAlerts);
    },
    get: async (id: string) => {
        await delay();
        const alert = mockAlerts.find(a => a.id === id);
        if (!alert) throw new Error('Alert not found');
        return mockResponse(alert);
    },
    acknowledge: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    resolve: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    ignore: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// Alert Rule API
export const alertRuleAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockAlertRules);
    },
    get: async (id: string) => {
        await delay();
        const rule = mockAlertRules.find(r => r.id === id);
        if (!rule) throw new Error('Alert rule not found');
        return mockResponse(rule);
    },
    create: async (data: any) => {
        await delay();
        return mockResponse(data);
    },
    update: async (id: string, data: any) => {
        await delay();
        return mockResponse(data);
    },
    delete: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    toggle: async (id: string, enabled: boolean) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// User API
export const userAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockUsers);
    },
    get: async (id: string) => {
        await delay();
        const user = mockUsers.find(u => u.id === id);
        if (!user) throw new Error('User not found');
        return mockResponse(user);
    },
    create: async (data: any) => {
        await delay();
        const newUser = {
            id: `user - ${Date.now()} `,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mockUsers.push(newUser);
        return mockResponse(newUser);
    },
    update: async (id: string, data: any) => {
        await delay();
        const index = mockUsers.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');
        mockUsers[index] = { ...mockUsers[index], ...data };
        return mockResponse(mockUsers[index]);
    },
    delete: async (id: string) => {
        await delay();
        const index = mockUsers.findIndex(u => u.id === id);
        if (index !== -1) {
            mockUsers.splice(index, 1);
        }
        return mockResponse({ success: true });
    },
    resetPassword: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
};

// User Group API
export const userGroupAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockUserGroups);
    },
    get: async (id: string) => {
        await delay();
        const group = mockUserGroups.find(g => g.id === id);
        if (!group) throw new Error('User group not found');
        return mockResponse(group);
    },
    create: async (data: any) => {
        await delay();
        const newGroup = {
            id: `group - ${Date.now()} `,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mockUserGroups.push(newGroup);
        return mockResponse(newGroup);
    },
    update: async (id: string, data: any) => {
        await delay();
        const index = mockUserGroups.findIndex(g => g.id === id);
        if (index === -1) throw new Error('User group not found');
        mockUserGroups[index] = { ...mockUserGroups[index], ...data };
        return mockResponse(mockUserGroups[index]);
    },
    delete: async (id: string) => {
        await delay();
        const index = mockUserGroups.findIndex(g => g.id === id);
        if (index !== -1) {
            mockUserGroups.splice(index, 1);
        }
        return mockResponse({ success: true });
    },
};

// Role API
export const roleAPI = {
    list: async () => {
        await delay();
        return mockResponse(mockRoles);
    },
    get: async (id: string) => {
        await delay();
        const role = mockRoles.find(r => r.id === id);
        if (!role) throw new Error('Role not found');
        return mockResponse(role);
    },
    create: async (data: any) => {
        await delay();
        const newRole = {
            id: `role - ${Date.now()} `,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        mockRoles.push(newRole);
        return mockResponse(newRole);
    },
    update: async (id: string, data: any) => {
        await delay();
        const index = mockRoles.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Role not found');
        mockRoles[index] = { ...mockRoles[index], ...data };
        return mockResponse(mockRoles[index]);
    },
    delete: async (id: string) => {
        await delay();
        const index = mockRoles.findIndex(r => r.id === id);
        if (index !== -1) {
            mockRoles.splice(index, 1);
        }
        return mockResponse({ success: true });
    },
};

// Organization API
export const organizationAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockOrganizations);
    },
    get: async (id: string) => {
        await delay();
        const org = mockOrganizations.find(o => o.id === id);
        if (!org) throw new Error('Organization not found');
        return mockResponse(org);
    },
    create: async (data: Partial<Organization>) => {
        await delay();
        const newOrg: Organization = {
            id: `org - ${Date.now()} `,
            name: data.name || '',
            description: data.description || '',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data,
        };
        mockOrganizations.push(newOrg);
        return mockResponse(newOrg);
    },
    update: async (id: string, data: Partial<Organization>) => {
        await delay();
        const index = mockOrganizations.findIndex(o => o.id === id);
        if (index === -1) throw new Error('Organization not found');
        mockOrganizations[index] = { ...mockOrganizations[index], ...data };
        return mockResponse(mockOrganizations[index]);
    },
    delete: async (id: string) => {
        await delay();
        const index = mockOrganizations.findIndex(o => o.id === id);
        if (index !== -1) {
            mockOrganizations.splice(index, 1);
        }
        return mockResponse({ success: true });
    },
    getMembers: async (id: string) => {
        await delay();
        const members = mockOrganizationMembers.filter(m => m.organization_id === id);
        return mockResponse(members);
    },
    addMember: async (id: string, data: any) => {
        await delay();
        const newMember: OrganizationMember = {
            id: `member - ${Date.now()} `,
            organization_id: id,
            user_id: data.user_id,
            user_name: `User ${data.user_id} `,
            role: data.role,
            created_at: new Date().toISOString(),
        };
        mockOrganizationMembers.push(newMember);
        return mockResponse(newMember);
    },
    removeMember: async (id: string, member_id: string) => {
        await delay();
        const index = mockOrganizationMembers.findIndex(m => m.id === member_id);
        if (index !== -1) {
            mockOrganizationMembers.splice(index, 1);
        }
        return mockResponse({ success: true });
    },
    updateMemberRole: async (id: string, member_id: string, role: any) => {
        await delay();
        const member = mockOrganizationMembers.find(m => m.id === member_id);
        if (member) {
            member.role = role;
        }
        return mockResponse(member);
    },
    getProducts: async (id: string) => {
        await delay();
        const org = mockOrganizations.find(o => o.id === id);
        if (!org) return mockResponse([]);
        const products = mockProducts.filter(p =>
            p.organization_ids?.includes(id)
        );
        return mockResponse(products);
    },
};

// Dashboard API
export const dashboardAPI = {
    getStats: async () => {
        await delay();
        return mockResponse(mockDashboardStats);
    },
};

// Deployment Plan API
export const deploymentPlanAPI = {
    list: async (params?: any) => {
        await delay();
        return mockResponse(mockDeploymentPlans);
    },
    get: async (id: string) => {
        await delay();
        const plan = mockDeploymentPlans.find(p => p.id === id);
        if (!plan) throw new Error('Deployment plan not found');
        return mockResponse(plan);
    },
    create: async (data: any) => {
        await delay();
        return mockResponse(data);
    },
    update: async (id: string, data: any) => {
        await delay();
        return mockResponse(data);
    },
    delete: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    execute: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    pause: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    resume: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    cancel: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    retry: async (id: string) => {
        await delay();
        return mockResponse({ success: true });
    },
    getProgress: async (id: string) => {
        await delay();
        return mockResponse({ progress: 50, details: {} });
    },
};

// 重新导出类型
export type {
    Agent,
    Task,
    Log,
    File,
    Environment,
    Organization,
    OrganizationMember,
    Product,
    ProductVersion,
    Release,
    Deployment,
    DeploymentPlan,
    Change,
    AuditLog,
    Configuration,
    Alert,
    AlertRule,
    User,
    UserGroup,
    Role,
    DashboardStats,
    CompliancePolicy,
    ComplianceRule,
} from '../types';
