export interface Message {
  type: string;
  id?: string;
  request_id?: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface TaskLogData {
  task_id: string;
  level: string;
  message: string;
  timestamp: number;
}

// 环境相关类型
export interface Environment {
  id: string;
  name: string;
  description?: string;
  type: 'development' | 'testing' | 'staging' | 'production' | 'air-gapped';
  status: 'online' | 'offline' | 'disconnected';
  k8s_cluster?: string;
  config?: Record<string, any>;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// 产品相关类型
export interface Product {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status: 'active' | 'archived';
  versions?: ProductVersion[];
  dependencies?: ProductDependency[];
  constraints?: ProductConstraint[];
  release_channels?: ReleaseChannel[];
  created_at: string;
  updated_at: string;
}

export interface ProductVersion {
  id: string;
  product_id: string;
  version: string;
  build_info?: string;
  changelog?: string;
  tag: 'RELEASE' | 'CANARY' | 'STABLE';
  created_at: string;
}

export interface ProductDependency {
  product_id: string;
  dependency_product_id: string;
  version_requirement?: string;
}

export interface ProductConstraint {
  type: 'version' | 'resource' | 'environment';
  value: any;
}

export interface ReleaseChannel {
  id: string;
  name: 'RELEASE' | 'CANARY' | 'STABLE';
  promotion_rules?: any;
  subscribed_environments?: string[];
}

// 发布相关类型
export interface Release {
  id: string;
  product_id: string;
  version: string;
  changelog?: string;
  impact_scope?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  channels?: string[];
  created_at: string;
  updated_at: string;
}

// 部署相关类型
export interface Deployment {
  id: string;
  release_id?: string;
  product_id: string;
  environment_id: string;
  version: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'rolled_back';
  strategy?: 'blue-green' | 'canary' | 'rolling';
  plan?: DeploymentPlan;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeploymentPlan {
  id: string;
  name: string;
  environments: string[];
  deployments: string[];
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled';
  created_at: string;
}

// 变更相关类型
export interface Change {
  id: string;
  title: string;
  description?: string;
  type: 'deployment' | 'configuration' | 'maintenance' | 'other';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'completed' | 'rolled_back';
  approval_flow?: ApprovalFlow;
  execution_plan?: ChangeExecutionPlan;
  maintenance_window?: MaintenanceWindow;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalFlow {
  steps: ApprovalStep[];
  current_step?: number;
}

export interface ApprovalStep {
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  approved_at?: string;
}

export interface ChangeExecutionPlan {
  steps: ChangeExecutionStep[];
  current_step?: number;
}

export interface ChangeExecutionStep {
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at?: string;
  finished_at?: string;
}

export interface MaintenanceWindow {
  id: string;
  environment_id: string;
  start_time: string;
  end_time: string;
  timezone?: string;
}

// 审计相关类型
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  framework: 'isobao' | 'iso27001' | 'custom';
  rules: ComplianceRule[];
  status: 'active' | 'inactive';
}

export interface ComplianceRule {
  id: string;
  name: string;
  description?: string;
  check_type: string;
  status: 'pass' | 'fail' | 'warning';
  last_check_at?: string;
}

// 配置相关类型
export interface Configuration {
  id: string;
  environment_id?: string;
  product_id?: string;
  key: string;
  value: any;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description?: string;
  template: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

// 监控告警相关类型
export interface Alert {
  id: string;
  name: string;
  level: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved' | 'ignored';
  resource_type: string;
  resource_id?: string;
  message: string;
  created_at: string;
  resolved_at?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  resource_type: string;
  condition: any;
  level: 'critical' | 'warning' | 'info';
  enabled: boolean;
  notification_channels?: string[];
}

// 系统管理相关类型
export interface User {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  status: 'active' | 'inactive';
  roles?: string[];
  groups?: string[];
  created_at: string;
  updated_at: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  permissions?: Permission[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  resource_type: string;
  resource_id?: string;
  actions: string[];
}

// Agent 相关类型
export interface Agent {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  version: string;
  env?: string;
  status: 'online' | 'offline' | 'error';
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

// 任务相关类型
export interface Task {
  id: string;
  agent_id: string;
  type: 'shell' | 'mysql' | 'postgres' | 'redis' | 'mongo' | 'elasticsearch' | 'clickhouse' | 'doris' | 'k8s' | 'api' | 'file';
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled';
  command: string;
  params?: string;
  file_id?: string;
  result?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Log {
  id: number;
  task_id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface File {
  id: string;
  name: string;
  path: string;
  size: number;
  content_type: string;
  md5: string;
  created_at: string;
  updated_at: string;
}

// 仪表盘统计类型
export interface DashboardStats {
  environments: {
    total: number;
    online: number;
    offline: number;
  };
  deployments: {
    today: number;
    this_week: number;
    success_rate: number;
    success: number;
    failed: number;
    running: number;
  };
  tasks: {
    today: number;
    success_rate: number;
    by_type: Record<string, number>;
  };
  agents: {
    total: number;
    online: number;
    health: number;
  };
  changes: {
    pending_approval: number;
    this_week: number;
    success_rate: number;
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
  };
}

