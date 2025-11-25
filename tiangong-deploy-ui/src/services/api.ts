import axios from 'axios';
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

// 重新导出类型，方便其他文件使用
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

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// Agent API
export const agentAPI = {
  list: () => api.get<{ data: Agent[] }>('/agents'),
  get: (id: string) => api.get<{ data: Agent }>(`/agents/${id}`),
  getStatus: (id: string) => api.get<{ data: { status: string } }>(`/agents/${id}/status`),
};

// Task API
export const taskAPI = {
  create: (data: {
    agent_id: string;
    type: Task['type'];
    command: string;
    params?: Record<string, any>;
    file_id?: string;
  }) => api.post<{ data: Task }>('/tasks', data),
  list: (params?: { agent_id?: string; limit?: number; offset?: number }) =>
    api.get<{ data: Task[] }>('/tasks', { params }),
  get: (id: string) => api.get<{ data: Task }>(`/tasks/${id}`),
  getLogs: (id: string, limit?: number) =>
    api.get<{ data: Log[] }>(`/tasks/${id}/logs`, { params: { limit } }),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
};

// File API
export const fileAPI = {
  upload: (file: globalThis.File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ data: File }>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ data: File[] }>('/files', { params }),
  get: (id: string) => api.get<{ data: File }>(`/files/${id}`),
  download: (id: string) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  distribute: (id: string, data: { agent_ids: string[]; path?: string }) =>
    api.post(`/files/${id}/distribute`, data),
};

// Environment API
export const environmentAPI = {
  list: () => api.get<{ data: Environment[] }>('/environments'),
  get: (id: string) => api.get<{ data: Environment }>(`/environments/${id}`),
  create: (data: Partial<Environment>) => api.post<{ data: Environment }>('/environments', data),
  update: (id: string, data: Partial<Environment>) =>
    api.put<{ data: Environment }>(`/environments/${id}`, data),
  delete: (id: string) => api.delete(`/environments/${id}`),
  checkHealth: (id: string) => api.post<{ data: { status: string } }>(`/environments/${id}/health-check`),
};

// Product API
export const productAPI = {
  list: () => api.get<{ data: Product[] }>('/products'),
  get: (id: string) => api.get<{ data: Product }>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<{ data: Product }>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.put<{ data: Product }>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getVersions: (id: string) => api.get<{ data: ProductVersion[] }>(`/products/${id}/versions`),
  createVersion: (id: string, data: Partial<ProductVersion>) =>
    api.post<{ data: ProductVersion }>(`/products/${id}/versions`, data),
};

// Release API
export const releaseAPI = {
  list: () => api.get<{ data: Release[] }>('/releases'),
  get: (id: string) => api.get<{ data: Release }>(`/releases/${id}`),
  create: (data: Partial<Release>) => api.post<{ data: Release }>('/releases', data),
  update: (id: string, data: Partial<Release>) =>
    api.put<{ data: Release }>(`/releases/${id}`, data),
  approve: (id: string, approved: boolean, comment?: string) =>
    api.post(`/releases/${id}/approve`, { approved, comment }),
};

// Deployment API
export const deploymentAPI = {
  list: (params?: { environment_id?: string; product_id?: string; limit?: number; offset?: number }) =>
    api.get<{ data: Deployment[] }>('/deployments', { params }),
  get: (id: string) => api.get<{ data: Deployment }>(`/deployments/${id}`),
  create: (data: Partial<Deployment>) => api.post<{ data: Deployment }>('/deployments', data),
  execute: (id: string) => api.post(`/deployments/${id}/execute`),
  pause: (id: string) => api.post(`/deployments/${id}/pause`),
  resume: (id: string) => api.post(`/deployments/${id}/resume`),
  cancel: (id: string) => api.post(`/deployments/${id}/cancel`),
  rollback: (id: string) => api.post(`/deployments/${id}/rollback`),
  getLogs: (id: string) => api.get<{ data: Log[] }>(`/deployments/${id}/logs`),
};

// Change API
export const changeAPI = {
  list: () => api.get<{ data: Change[] }>('/changes'),
  get: (id: string) => api.get<{ data: Change }>(`/changes/${id}`),
  create: (data: Partial<Change>) => api.post<{ data: Change }>('/changes', data),
  update: (id: string, data: Partial<Change>) =>
    api.put<{ data: Change }>(`/changes/${id}`, data),
  submit: (id: string) => api.post(`/changes/${id}/submit`),
  approve: (id: string, approved: boolean, comment?: string) =>
    api.post(`/changes/${id}/approve`, { approved, comment }),
  execute: (id: string) => api.post(`/changes/${id}/execute`),
  rollback: (id: string) => api.post(`/changes/${id}/rollback`),
};

// Audit API
export const auditAPI = {
  list: (params?: { user_id?: string; action?: string; limit?: number; offset?: number }) =>
    api.get<{ data: AuditLog[] }>('/audit-logs', { params }),
  get: (id: string) => api.get<{ data: AuditLog }>(`/audit-logs/${id}`),
  export: (params?: Record<string, any>) => api.get('/audit-logs/export', { params, responseType: 'blob' }),
};

// Compliance API
export const complianceAPI = {
  listPolicies: () => api.get<{ data: CompliancePolicy[] }>('/compliance/policies'),
  getPolicy: (id: string) => api.get<{ data: CompliancePolicy }>(`/compliance/policies/${id}`),
  createPolicy: (data: Partial<CompliancePolicy>) => api.post<{ data: CompliancePolicy }>('/compliance/policies', data),
  updatePolicy: (id: string, data: Partial<CompliancePolicy>) =>
    api.put<{ data: CompliancePolicy }>(`/compliance/policies/${id}`, data),
  deletePolicy: (id: string) => api.delete(`/compliance/policies/${id}`),
  check: (policyId?: string) => api.post<{ data: { results: ComplianceRule[] } }>('/compliance/check', { policy_id: policyId }),
  getReport: (params?: Record<string, any>) => api.get('/compliance/report', { params, responseType: 'blob' }),
};

// Configuration API
export const configurationAPI = {
  list: (params?: { environment_id?: string; product_id?: string }) =>
    api.get<{ data: Configuration[] }>('/configurations', { params }),
  get: (id: string) => api.get<{ data: Configuration }>(`/configurations/${id}`),
  create: (data: Partial<Configuration>) =>
    api.post<{ data: Configuration }>('/configurations', data),
  update: (id: string, data: Partial<Configuration>) =>
    api.put<{ data: Configuration }>(`/configurations/${id}`, data),
  delete: (id: string) => api.delete(`/configurations/${id}`),
  sync: (data: { source_id: string; target_ids: string[] }) =>
    api.post('/configurations/sync', data),
};

// Alert API
export const alertAPI = {
  list: (params?: { level?: string; status?: string; limit?: number; offset?: number }) =>
    api.get<{ data: Alert[] }>('/alerts', { params }),
  get: (id: string) => api.get<{ data: Alert }>(`/alerts/${id}`),
  acknowledge: (id: string) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id: string) => api.post(`/alerts/${id}/resolve`),
  ignore: (id: string) => api.post(`/alerts/${id}/ignore`),
};

// Alert Rule API
export const alertRuleAPI = {
  list: () => api.get<{ data: AlertRule[] }>('/alert-rules'),
  get: (id: string) => api.get<{ data: AlertRule }>(`/alert-rules/${id}`),
  create: (data: Partial<AlertRule>) => api.post<{ data: AlertRule }>('/alert-rules', data),
  update: (id: string, data: Partial<AlertRule>) =>
    api.put<{ data: AlertRule }>(`/alert-rules/${id}`, data),
  delete: (id: string) => api.delete(`/alert-rules/${id}`),
  toggle: (id: string, enabled: boolean) =>
    api.post(`/alert-rules/${id}/toggle`, { enabled }),
};

// User API
export const userAPI = {
  list: () => api.get<{ data: User[] }>('/users'),
  get: (id: string) => api.get<{ data: User }>(`/users/${id}`),
  create: (data: Partial<User>) => api.post<{ data: User }>('/users', data),
  update: (id: string, data: Partial<User>) =>
    api.put<{ data: User }>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string) => api.post(`/users/${id}/reset-password`),
};

// User Group API
export const userGroupAPI = {
  list: () => api.get<{ data: UserGroup[] }>('/user-groups'),
  get: (id: string) => api.get<{ data: UserGroup }>(`/user-groups/${id}`),
  create: (data: Partial<UserGroup>) => api.post<{ data: UserGroup }>('/user-groups', data),
  update: (id: string, data: Partial<UserGroup>) =>
    api.put<{ data: UserGroup }>(`/user-groups/${id}`, data),
  delete: (id: string) => api.delete(`/user-groups/${id}`),
};

// Role API
export const roleAPI = {
  list: () => api.get<{ data: Role[] }>('/roles'),
  get: (id: string) => api.get<{ data: Role }>(`/roles/${id}`),
  create: (data: Partial<Role>) => api.post<{ data: Role }>('/roles', data),
  update: (id: string, data: Partial<Role>) =>
    api.put<{ data: Role }>(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

// Organization API
export const organizationAPI = {
  list: (params?: { parent_id?: string; status?: string }) =>
    api.get<{ data: Organization[] }>('/organizations', { params }),
  get: (id: string) => api.get<{ data: Organization }>(`/organizations/${id}`),
  create: (data: Partial<Organization>) =>
    api.post<{ data: Organization }>('/organizations', data),
  update: (id: string, data: Partial<Organization>) =>
    api.put<{ data: Organization }>(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  getMembers: (id: string) =>
    api.get<{ data: OrganizationMember[] }>(`/organizations/${id}/members`),
  addMember: (id: string, data: { user_id: string; role: OrganizationMember['role'] }) =>
    api.post<{ data: OrganizationMember }>(`/organizations/${id}/members`, data),
  removeMember: (id: string, member_id: string) =>
    api.delete(`/organizations/${id}/members/${member_id}`),
  updateMemberRole: (id: string, member_id: string, role: OrganizationMember['role']) =>
    api.put(`/organizations/${id}/members/${member_id}`, { role }),
  getProducts: (id: string) =>
    api.get<{ data: Product[] }>(`/organizations/${id}/products`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get<{ data: DashboardStats }>('/dashboard/stats'),
};

// Deployment Plan API
export const deploymentPlanAPI = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<{ data: DeploymentPlan[] }>('/deployment-plans', { params }),
  get: (id: string) => api.get<{ data: DeploymentPlan }>(`/deployment-plans/${id}`),
  create: (data: Partial<DeploymentPlan>) => api.post<{ data: DeploymentPlan }>('/deployment-plans', data),
  update: (id: string, data: Partial<DeploymentPlan>) =>
    api.put<{ data: DeploymentPlan }>(`/deployment-plans/${id}`, data),
  delete: (id: string) => api.delete(`/deployment-plans/${id}`),
  execute: (id: string) => api.post(`/deployment-plans/${id}/execute`),
  pause: (id: string) => api.post(`/deployment-plans/${id}/pause`),
  resume: (id: string) => api.post(`/deployment-plans/${id}/resume`),
  cancel: (id: string) => api.post(`/deployment-plans/${id}/cancel`),
  retry: (id: string) => api.post(`/deployment-plans/${id}/retry`),
  getProgress: (id: string) => api.get<{ data: { progress: number; details: any } }>(`/deployment-plans/${id}/progress`),
};

