import {
    Environment,
    Product,
    ProductVersion,
    Release,
    Deployment,
    Task,
    Agent,
    Change,
    AuditLog,
    Configuration,
    Alert,
    User,
    Role,
    DashboardStats,
    Organization,
    OrganizationMember,
    Service,
    SQLScript,
    DeploymentScheme,
    Build,
    Constraint,
    ConstraintRule,
    Workflow,
    WorkflowStep,
    WorkflowExecution,
    Integration,
    DeploymentPlanTemplate,
    DeploymentPlan,
} from '../types';

// Mock Environments
export const mockEnvironments: Environment[] = [
    {
        id: 'env-dev',
        name: 'Development',
        description: '开发环境，用于日常开发和联调',
        type: 'development',
        status: 'online',
        k8s_cluster: 'k8s-dev-01',
        tags: ['dev', 'aws', 'us-east-1'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'env-test',
        name: 'Testing',
        description: '测试环境，用于QA验证',
        type: 'testing',
        status: 'online',
        k8s_cluster: 'k8s-test-01',
        tags: ['test', 'aws', 'us-east-1'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'env-staging',
        name: 'Staging',
        description: '预发布环境，模拟生产环境',
        type: 'staging',
        status: 'online',
        k8s_cluster: 'k8s-staging-01',
        tags: ['staging', 'aws', 'us-east-1'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'env-prod-us',
        name: 'Production (US)',
        description: '美国生产环境',
        type: 'production',
        status: 'online',
        k8s_cluster: 'k8s-prod-us-01',
        tags: ['prod', 'aws', 'us-east-1', 'critical'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'env-prod-eu',
        name: 'Production (EU)',
        description: '欧洲生产环境',
        type: 'production',
        status: 'offline',
        k8s_cluster: 'k8s-prod-eu-01',
        tags: ['prod', 'aws', 'eu-central-1', 'critical'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'env-airgapped-01',
        name: 'Air-gapped Site A',
        description: '物理隔离环境 A',
        type: 'air-gapped',
        status: 'disconnected',
        tags: ['air-gapped', 'on-prem', 'site-a'],
        created_at: '2023-06-01T00:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
];


// Mock Organizations
export const mockOrganizations: Organization[] = [
    {
        id: 'org-001',
        name: '核心平台部',
        description: '负责核心平台产品的研发和运维',
        status: 'active',
        leader_id: 'user-001',
        leader_name: '张三',
        tags: ['platform', 'core'],
        permission_scope: {
            environments: ['env-dev', 'env-test', 'env-staging', 'env-prod-us'],
            products: ['prod-backend', 'prod-frontend'],
        },
        resource_quota: {
            cpu: 100,
            memory: 256,
            storage: 1000,
        },
        resource_usage: {
            cpu: 45,
            memory: 128,
            storage: 450,
        },
        approval_workflow: {
            enabled: true,
            approvers: ['user-001', 'user-002'],
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'org-002',
        name: 'Agent 研发组',
        description: '负责边缘 Agent 的研发',
        parent_id: 'org-001',
        status: 'active',
        leader_id: 'user-003',
        leader_name: '李四',
        tags: ['agent', 'edge'],
        permission_scope: {
            environments: ['env-dev', 'env-test'],
            products: ['prod-agent'],
        },
        resource_quota: {
            cpu: 50,
            memory: 128,
            storage: 500,
        },
        resource_usage: {
            cpu: 20,
            memory: 64,
            storage: 200,
        },
        approval_workflow: {
            enabled: true,
            approvers: ['user-003'],
        },
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'org-003',
        name: '数据平台部',
        description: '负责数据平台和大数据产品',
        status: 'active',
        leader_id: 'user-004',
        leader_name: '王五',
        tags: ['data', 'bigdata'],
        permission_scope: {
            environments: ['env-dev', 'env-test', 'env-prod-us'],
        },
        resource_quota: {
            cpu: 200,
            memory: 512,
            storage: 2000,
        },
        resource_usage: {
            cpu: 80,
            memory: 256,
            storage: 800,
        },
        approval_workflow: {
            enabled: true,
            approvers: ['user-004', 'user-005'],
        },
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Organization Members
export const mockOrganizationMembers: OrganizationMember[] = [
    {
        id: 'member-001',
        organization_id: 'org-001',
        user_id: 'user-001',
        user_name: '张三',
        role: 'admin',
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: 'member-002',
        organization_id: 'org-001',
        user_id: 'user-002',
        user_name: '赵六',
        role: 'developer',
        created_at: '2023-01-15T00:00:00Z',
    },
    {
        id: 'member-003',
        organization_id: 'org-002',
        user_id: 'user-003',
        user_name: '李四',
        role: 'admin',
        created_at: '2023-03-01T00:00:00Z',
    },
    {
        id: 'member-004',
        organization_id: 'org-003',
        user_id: 'user-004',
        user_name: '王五',
        role: 'admin',
        created_at: '2023-02-01T00:00:00Z',
    },
];

// Mock Products
export const mockProducts: Product[] = [
    {
        id: 'prod-backend',
        name: 'Tiangong Backend',
        description: 'Core backend service for Tiangong platform',
        status: 'active',
        organization_ids: ['org-001'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'prod-frontend',
        name: 'Tiangong Frontend',
        description: 'Web UI for Tiangong platform',
        status: 'active',
        organization_ids: ['org-001'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'prod-agent',
        name: 'Tiangong Agent',
        description: 'Edge agent for Tiangong platform',
        status: 'active',
        organization_ids: ['org-001', 'org-002'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Product Versions (扩展版本数据)
export const mockProductVersions: ProductVersion[] = [
    {
        id: 'ver-backend-1.2.0',
        product_id: 'prod-backend',
        version: '1.2.0',
        build_info: 'Build #42',
        changelog: '- Added support for WebSocket\n- Fixed memory leak in task scheduler\n- Performance improvements',
        tag: 'STABLE',
        created_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'ver-backend-1.3.0',
        product_id: 'prod-backend',
        version: '1.3.0-rc1',
        build_info: 'Build #45',
        changelog: '- Experimental feature: AI integration\n- New API endpoints\n- Database migration tools',
        tag: 'CANARY',
        created_at: '2023-11-24T08:00:00Z',
    },
    {
        id: 'ver-frontend-2.1.0',
        product_id: 'prod-frontend',
        version: '2.1.0',
        build_info: 'Build #38',
        changelog: '- New dashboard design\n- Improved performance\n- Bug fixes',
        tag: 'STABLE',
        created_at: '2023-11-15T10:00:00Z',
    },
    {
        id: 'ver-agent-1.5.0',
        product_id: 'prod-agent',
        version: '1.5.0',
        build_info: 'Build #28',
        changelog: '- Support for new task types\n- Enhanced security\n- Performance optimizations',
        tag: 'STABLE',
        created_at: '2023-11-10T10:00:00Z',
    },
];

// Mock Services (产品版本下的服务)
export const mockServices: Service[] = [
    {
        id: 'svc-001',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'api-server',
        description: 'Main API server',
        type: 'backend',
        status: 'running',
        replicas: 3,
        image: 'tiangong/backend:1.2.0',
        resources: {
            cpu: '2',
            memory: '4Gi',
        },
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-24T10:00:00Z',
    },
    {
        id: 'svc-002',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'task-scheduler',
        description: 'Background task scheduler',
        type: 'backend',
        status: 'running',
        replicas: 2,
        image: 'tiangong/scheduler:1.2.0',
        resources: {
            cpu: '1',
            memory: '2Gi',
        },
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-24T10:00:00Z',
    },
    {
        id: 'svc-003',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'redis-cache',
        description: 'Redis cache service',
        type: 'cache',
        status: 'running',
        replicas: 1,
        image: 'redis:7.0',
        resources: {
            cpu: '0.5',
            memory: '1Gi',
        },
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-24T10:00:00Z',
    },
    {
        id: 'svc-004',
        product_id: 'prod-frontend',
        version_id: 'ver-frontend-2.1.0',
        name: 'web-ui',
        description: 'Web UI application',
        type: 'frontend',
        status: 'running',
        replicas: 2,
        image: 'tiangong/frontend:2.1.0',
        resources: {
            cpu: '0.5',
            memory: '512Mi',
        },
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-24T10:00:00Z',
    },
];

// Mock SQL Scripts
export const mockSQLScripts: SQLScript[] = [
    {
        id: 'sql-001',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'init_database.sql',
        description: 'Initialize database schema',
        content: 'CREATE TABLE IF NOT EXISTS users (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  username VARCHAR(50) NOT NULL,\n  email VARCHAR(100)\n);',
        database_type: 'mysql',
        execution_order: 1,
        status: 'executed',
        executed_at: '2023-11-20T10:05:00Z',
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-20T10:05:00Z',
    },
    {
        id: 'sql-002',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'add_indexes.sql',
        description: 'Add performance indexes',
        content: 'CREATE INDEX idx_username ON users(username);\nCREATE INDEX idx_email ON users(email);',
        database_type: 'mysql',
        execution_order: 2,
        status: 'executed',
        executed_at: '2023-11-20T10:06:00Z',
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-20T10:06:00Z',
    },
    {
        id: 'sql-003',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.3.0',
        name: 'migrate_v1.3.sql',
        description: 'Migration script for v1.3.0',
        content: 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;',
        database_type: 'mysql',
        execution_order: 1,
        status: 'pending',
        created_at: '2023-11-24T08:00:00Z',
        updated_at: '2023-11-24T08:00:00Z',
    },
];

// Mock Deployment Schemes
export const mockDeploymentSchemes: DeploymentScheme[] = [
    {
        id: 'scheme-001',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        name: 'Production Blue-Green',
        description: 'Blue-green deployment for production',
        strategy: 'blue-green',
        config: {
            health_check_interval: 30,
            rollback_on_failure: true,
        },
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'scheme-002',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.3.0',
        name: 'Canary Deployment',
        description: 'Canary deployment for testing new features',
        strategy: 'canary',
        config: {
            canary_percentage: 10,
            health_check_interval: 15,
            rollback_on_failure: true,
        },
        created_at: '2023-11-24T08:00:00Z',
        updated_at: '2023-11-24T08:00:00Z',
    },
    {
        id: 'scheme-003',
        product_id: 'prod-frontend',
        version_id: 'ver-frontend-2.1.0',
        name: 'Rolling Update',
        description: 'Rolling update for frontend',
        strategy: 'rolling',
        config: {
            rolling_batch_size: 1,
            health_check_interval: 20,
            rollback_on_failure: true,
        },
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
];

// Mock Builds
export const mockBuilds: Build[] = [
    {
        id: 'build-001',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.2.0',
        build_number: 42,
        status: 'success',
        trigger: 'manual',
        branch: 'release/1.2.0',
        commit: 'a1b2c3d4',
        started_at: '2023-11-20T09:30:00Z',
        finished_at: '2023-11-20T09:45:00Z',
        duration: 900,
        created_by: 'user-001',
        created_at: '2023-11-20T09:30:00Z',
        updated_at: '2023-11-20T09:45:00Z',
    },
    {
        id: 'build-002',
        product_id: 'prod-backend',
        version_id: 'ver-backend-1.3.0',
        build_number: 45,
        status: 'running',
        trigger: 'auto',
        branch: 'develop',
        commit: 'e5f6g7h8',
        started_at: '2023-11-24T08:00:00Z',
        created_by: 'system',
        created_at: '2023-11-24T08:00:00Z',
        updated_at: '2023-11-24T08:05:00Z',
    },
    {
        id: 'build-003',
        product_id: 'prod-frontend',
        version_id: 'ver-frontend-2.1.0',
        build_number: 38,
        status: 'success',
        trigger: 'manual',
        branch: 'release/2.1.0',
        commit: 'i9j0k1l2',
        started_at: '2023-11-15T09:00:00Z',
        finished_at: '2023-11-15T09:12:00Z',
        duration: 720,
        created_by: 'user-002',
        created_at: '2023-11-15T09:00:00Z',
        updated_at: '2023-11-15T09:12:00Z',
    },
];

// Mock Releases
export const mockReleases: Release[] = [
    {
        id: 'rel-backend-1.2.0',
        product_id: 'prod-backend',
        version: '1.2.0',
        changelog: '- Added support for WebSocket\n- Fixed memory leak in task scheduler',
        approval_status: 'approved',
        channels: ['STABLE'],
        created_at: '2023-11-20T10:00:00Z',
        updated_at: '2023-11-20T12:00:00Z',
    },
    {
        id: 'rel-backend-1.3.0-rc1',
        product_id: 'prod-backend',
        version: '1.3.0-rc1',
        changelog: '- Experimental feature: AI integration',
        approval_status: 'pending',
        channels: ['CANARY'],
        created_at: '2023-11-24T08:00:00Z',
        updated_at: '2023-11-24T08:00:00Z',
    },
];

// Mock Deployments
export const mockDeployments: Deployment[] = [
    {
        id: 'dep-001',
        product_id: 'prod-backend',
        environment_id: 'env-prod-us',
        version: '1.2.0',
        status: 'success',
        strategy: 'rolling',
        created_at: '2023-11-21T10:00:00Z',
        updated_at: '2023-11-21T10:15:00Z',
    },
    {
        id: 'dep-002',
        product_id: 'prod-backend',
        environment_id: 'env-prod-eu',
        version: '1.2.0',
        status: 'failed',
        strategy: 'rolling',
        created_at: '2023-11-21T10:30:00Z',
        updated_at: '2023-11-21T10:35:00Z',
    },
    {
        id: 'dep-003',
        product_id: 'prod-frontend',
        environment_id: 'env-staging',
        version: '2.1.0',
        status: 'running',
        strategy: 'blue-green',
        created_at: '2023-11-24T14:00:00Z',
        updated_at: '2023-11-24T14:05:00Z',
    },
];

// Mock Tasks
export const mockTasks: Task[] = [
    {
        id: 'task-001',
        agent_id: 'agent-001',
        type: 'shell',
        status: 'success',
        command: 'echo "Hello World"',
        created_at: '2023-11-24T10:00:00Z',
        updated_at: '2023-11-24T10:00:05Z',
    },
    {
        id: 'task-002',
        agent_id: 'agent-002',
        type: 'k8s',
        status: 'running',
        command: 'kubectl apply -f deployment.yaml',
        created_at: '2023-11-24T14:30:00Z',
        updated_at: '2023-11-24T14:30:10Z',
    },
];

// Mock Agents
export const mockAgents: Agent[] = [
    {
        id: 'agent-001',
        name: 'Agent US East',
        hostname: 'node-us-east-1',
        ip: '10.0.1.5',
        version: '1.5.0',
        env: 'env-prod-us',
        status: 'online',
        last_seen: '2023-11-24T14:35:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-24T14:35:00Z',
    },
    {
        id: 'agent-002',
        name: 'Agent EU Central',
        hostname: 'node-eu-central-1',
        ip: '10.0.2.8',
        version: '1.4.9',
        env: 'env-prod-eu',
        status: 'offline',
        last_seen: '2023-11-23T20:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-23T20:00:00Z',
    },
];

// Mock Changes
export const mockChanges: Change[] = [
    {
        id: 'chg-001',
        title: 'Upgrade Backend to v1.2.0',
        type: 'deployment',
        status: 'completed',
        created_by: 'admin',
        created_at: '2023-11-20T09:00:00Z',
        updated_at: '2023-11-20T12:00:00Z',
    },
    {
        id: 'chg-002',
        title: 'Scale up Database Cluster',
        type: 'maintenance',
        status: 'pending_approval',
        created_by: 'dba_team',
        created_at: '2023-11-24T11:00:00Z',
        updated_at: '2023-11-24T11:00:00Z',
    },
];

// Mock Audit Logs
export const mockAuditLogs: AuditLog[] = [
    {
        id: 'audit-001',
        user_id: 'user-001',
        user_name: 'admin',
        action: 'LOGIN',
        resource_type: 'SYSTEM',
        timestamp: '2023-11-24T08:00:00Z',
    },
    {
        id: 'audit-002',
        user_id: 'user-001',
        user_name: 'admin',
        action: 'CREATE_DEPLOYMENT',
        resource_type: 'DEPLOYMENT',
        resource_id: 'dep-003',
        timestamp: '2023-11-24T14:00:00Z',
    },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
    environments: {
        total: 6,
        online: 4,
        offline: 2,
    },
    deployments: {
        today: 12,
        this_week: 45,
        success_rate: 92.5,
        success: 42,
        failed: 3,
        running: 1,
    },
    tasks: {
        today: 158,
        success_rate: 98.2,
        by_type: {
            shell: 80,
            k8s: 50,
            sql: 20,
            file: 8,
        },
    },
    agents: {
        total: 15,
        online: 12,
        health: 12,
    },
    changes: {
        pending_approval: 3,
        this_week: 8,
        success_rate: 100,
    },
    alerts: {
        total: 5,
        critical: 1,
        warning: 4,
    },
};

// Mock Constraints
export const mockConstraints: Constraint[] = [
    {
        id: 'constraint-001',
        name: 'Backend Version Dependency',
        description: 'Frontend must use compatible backend version',
        type: 'product_dependency',
        scope: 'product',
        target_id: 'prod-frontend',
        rules: [
            {
                id: 'rule-001',
                condition: 'backend_version >= 1.2.0',
                value: '1.2.0',
                error_message: 'Frontend requires backend version >= 1.2.0',
            },
        ],
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'constraint-002',
        name: 'Production Maintenance Window',
        description: 'Production deployments only allowed during maintenance window',
        type: 'maintenance_window',
        scope: 'environment',
        target_id: 'env-prod-us',
        rules: [
            {
                id: 'rule-002',
                condition: 'time_in_window',
                value: { start: '02:00', end: '04:00', timezone: 'UTC' },
                error_message: 'Deployments to production only allowed 02:00-04:00 UTC',
            },
        ],
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'constraint-003',
        name: 'Resource Limit',
        description: 'Maximum CPU and memory limits for development environment',
        type: 'resource_limit',
        scope: 'environment',
        target_id: 'env-dev',
        rules: [
            {
                id: 'rule-003',
                condition: 'cpu <= 10',
                value: 10,
                error_message: 'Development environment CPU limit exceeded',
            },
            {
                id: 'rule-004',
                condition: 'memory <= 20Gi',
                value: '20Gi',
                error_message: 'Development environment memory limit exceeded',
            },
        ],
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Workflows
export const mockWorkflows: Workflow[] = [
    {
        id: 'workflow-001',
        name: 'Production Deployment Workflow',
        description: 'Standard workflow for production deployments',
        type: 'deployment',
        trigger: 'manual',
        steps: [
            {
                id: 'step-001',
                name: 'Pre-deployment Check',
                type: 'task',
                config: { task_type: 'health_check' },
                order: 1,
            },
            {
                id: 'step-002',
                name: 'Manager Approval',
                type: 'approval',
                config: { approvers: ['user-001', 'user-002'] },
                order: 2,
            },
            {
                id: 'step-003',
                name: 'Deploy to Production',
                type: 'task',
                config: { task_type: 'deployment' },
                order: 3,
            },
            {
                id: 'step-004',
                name: 'Send Notification',
                type: 'notification',
                config: { channels: ['email', 'dingtalk'] },
                order: 4,
            },
        ],
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'workflow-002',
        name: 'Automated Testing Workflow',
        description: 'Automated testing after code commit',
        type: 'custom',
        trigger: 'event',
        steps: [
            {
                id: 'step-005',
                name: 'Run Unit Tests',
                type: 'task',
                config: { task_type: 'test', test_suite: 'unit' },
                order: 1,
            },
            {
                id: 'step-006',
                name: 'Run Integration Tests',
                type: 'task',
                config: { task_type: 'test', test_suite: 'integration' },
                order: 2,
            },
            {
                id: 'step-007',
                name: 'Quality Gate Check',
                type: 'condition',
                config: { condition: 'test_pass_rate >= 95' },
                order: 3,
            },
        ],
        enabled: true,
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Workflow Executions
export const mockWorkflowExecutions: WorkflowExecution[] = [
    {
        id: 'exec-001',
        workflow_id: 'workflow-001',
        status: 'success',
        current_step: 4,
        steps: [
            {
                step_id: 'step-001',
                status: 'success',
                started_at: '2023-11-24T10:00:00Z',
                finished_at: '2023-11-24T10:02:00Z',
                result: { health_status: 'ok' },
            },
            {
                step_id: 'step-002',
                status: 'success',
                started_at: '2023-11-24T10:02:00Z',
                finished_at: '2023-11-24T10:15:00Z',
                result: { approved_by: 'user-001' },
            },
            {
                step_id: 'step-003',
                status: 'success',
                started_at: '2023-11-24T10:15:00Z',
                finished_at: '2023-11-24T10:30:00Z',
                result: { deployment_id: 'dep-001' },
            },
            {
                step_id: 'step-004',
                status: 'success',
                started_at: '2023-11-24T10:30:00Z',
                finished_at: '2023-11-24T10:31:00Z',
                result: { notification_sent: true },
            },
        ],
        started_at: '2023-11-24T10:00:00Z',
        finished_at: '2023-11-24T10:31:00Z',
        created_by: 'user-001',
        created_at: '2023-11-24T10:00:00Z',
    },
    {
        id: 'exec-002',
        workflow_id: 'workflow-002',
        status: 'running',
        current_step: 2,
        steps: [
            {
                step_id: 'step-005',
                status: 'success',
                started_at: '2023-11-24T14:00:00Z',
                finished_at: '2023-11-24T14:05:00Z',
                result: { pass_rate: 98.5 },
            },
            {
                step_id: 'step-006',
                status: 'running',
                started_at: '2023-11-24T14:05:00Z',
            },
        ],
        started_at: '2023-11-24T14:00:00Z',
        created_by: 'system',
        created_at: '2023-11-24T14:00:00Z',
    },
];

// Mock Integrations
export const mockIntegrations: Integration[] = [
    {
        id: 'int-001',
        name: 'Jenkins CI/CD',
        type: 'jenkins',
        config: {
            url: 'https://jenkins.example.com',
            username: 'admin',
            api_token: '***',
        },
        enabled: true,
        last_sync_at: '2023-11-24T10:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'int-002',
        name: 'GitLab Repository',
        type: 'gitlab',
        config: {
            url: 'https://gitlab.example.com',
            access_token: '***',
            project_id: '12345',
        },
        enabled: true,
        last_sync_at: '2023-11-24T09:30:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'int-003',
        name: 'DingTalk Notification',
        type: 'dingtalk',
        config: {
            webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***',
            secret: '***',
        },
        enabled: true,
        last_sync_at: '2023-11-24T11:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'int-004',
        name: 'Email Notification',
        type: 'email',
        config: {
            smtp_host: 'smtp.example.com',
            smtp_port: 587,
            username: 'noreply@example.com',
            password: '***',
            from: 'Tiangong Deploy <noreply@example.com>',
        },
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'int-005',
        name: 'SSO Integration',
        type: 'sso',
        config: {
            provider: 'SAML',
            entity_id: 'tiangong-deploy',
            sso_url: 'https://sso.example.com/saml/login',
            certificate: '***',
        },
        enabled: false,
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Deployment Plan Templates
export const mockDeploymentPlanTemplates: DeploymentPlanTemplate[] = [
    {
        id: 'template-001',
        name: 'Full Stack Production Deployment',
        description: 'Deploy backend and frontend to production',
        products: [
            { product_id: 'prod-backend', version: '1.2.0' },
            { product_id: 'prod-frontend', version: '2.1.0' },
        ],
        environments: ['env-prod-us', 'env-prod-eu'],
        strategy: 'blue-green',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'template-002',
        name: 'Staging Environment Update',
        description: 'Deploy all products to staging',
        products: [
            { product_id: 'prod-backend', version: 'latest' },
            { product_id: 'prod-frontend', version: 'latest' },
            { product_id: 'prod-agent', version: 'latest' },
        ],
        environments: ['env-staging'],
        strategy: 'rolling',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Deployment Plans (扩展)
export const mockDeploymentPlans: DeploymentPlan[] = [
    {
        id: 'plan-001',
        name: '生产环境批量部署',
        environments: ['env-prod-us', 'env-prod-eu'],
        deployments: ['dep-001', 'dep-002'],
        status: 'running',
        created_at: '2023-11-24T10:00:00Z',
    },
    {
        id: 'plan-002',
        name: '测试环境部署',
        environments: ['env-test'],
        deployments: ['dep-003'],
        status: 'success',
        created_at: '2023-11-23T14:00:00Z',
    },
    {
        id: 'plan-003',
        name: 'Staging 全量更新',
        environments: ['env-staging'],
        deployments: [],
        status: 'pending',
        created_at: '2023-11-24T15:00:00Z',
    },
];


// Mock Users (成员管理)
export const mockUsers: User[] = [
    {
        id: 'user-001',
        username: 'admin',
        email: 'admin@example.com',
        name: '张三',
        role_ids: ['role-001'],
        status: 'active',
        last_login: '2023-11-24T14:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-24T14:00:00Z',
    },
    {
        id: 'user-002',
        username: 'zhaoLiu',
        email: 'zhao.liu@example.com',
        name: '赵六',
        role_ids: ['role-002'],
        status: 'active',
        last_login: '2023-11-24T13:30:00Z',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-11-24T13:30:00Z',
    },
    {
        id: 'user-003',
        username: 'liSi',
        email: 'li.si@example.com',
        name: '李四',
        role_ids: ['role-002'],
        status: 'active',
        last_login: '2023-11-24T12:00:00Z',
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2023-11-24T12:00:00Z',
    },
    {
        id: 'user-004',
        username: 'wangWu',
        email: 'wang.wu@example.com',
        name: '王五',
        role_ids: ['role-002'],
        status: 'active',
        last_login: '2023-11-24T11:00:00Z',
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-11-24T11:00:00Z',
    },
    {
        id: 'user-005',
        username: 'sunQi',
        email: 'sun.qi@example.com',
        name: '孙七',
        role_ids: ['role-003'],
        status: 'inactive',
        last_login: '2023-11-20T10:00:00Z',
        created_at: '2023-04-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock User Groups
export const mockUserGroups: UserGroup[] = [
    {
        id: 'group-001',
        name: '平台研发组',
        description: '负责核心平台研发',
        user_ids: ['user-001', 'user-002', 'user-003'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'group-002',
        name: '运维团队',
        description: '负责系统运维和监控',
        user_ids: ['user-004'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'group-003',
        name: '测试团队',
        description: '负责质量保证和测试',
        user_ids: ['user-005'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Roles
export const mockRoles: Role[] = [
    {
        id: 'role-001',
        name: '系统管理员',
        description: '拥有所有权限',
        permissions: ['*'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'role-002',
        name: '研发人员',
        description: '可以创建和管理产品、发布、部署',
        permissions: [
            'product:read',
            'product:write',
            'release:read',
            'release:write',
            'deployment:read',
            'deployment:write',
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'role-003',
        name: '只读用户',
        description: '只能查看信息',
        permissions: [
            'product:read',
            'release:read',
            'deployment:read',
            'environment:read',
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
    {
        id: 'alert-001',
        title: '生产环境 CPU 使用率过高',
        message: 'env-prod-us CPU 使用率达到 85%',
        level: 'warning',
        status: 'active',
        source: 'monitoring',
        created_at: '2023-11-24T14:00:00Z',
        updated_at: '2023-11-24T14:00:00Z',
    },
    {
        id: 'alert-002',
        title: '部署失败',
        message: 'dep-002 部署到 env-prod-eu 失败',
        level: 'critical',
        status: 'active',
        source: 'deployment',
        created_at: '2023-11-24T13:00:00Z',
        updated_at: '2023-11-24T13:00:00Z',
    },
    {
        id: 'alert-003',
        title: 'Agent 离线',
        message: 'agent-002 已离线超过 1 小时',
        level: 'warning',
        status: 'acknowledged',
        source: 'agent',
        created_at: '2023-11-24T12:00:00Z',
        updated_at: '2023-11-24T13:30:00Z',
    },
];

// Mock Alert Rules
export const mockAlertRules: AlertRule[] = [
    {
        id: 'rule-001',
        name: 'CPU 使用率告警',
        description: 'CPU 使用率超过 80% 时告警',
        condition: 'cpu_usage \u003e 80',
        level: 'warning',
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'rule-002',
        name: '部署失败告警',
        description: '部署失败时发送告警',
        condition: 'deployment_status == "failed"',
        level: 'critical',
        enabled: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];

// Mock Configurations
export const mockConfigurations: Configuration[] = [
    {
        id: 'config-001',
        name: 'Backend Config',
        environment_id: 'env-prod-us',
        product_id: 'prod-backend',
        content: {
            database: {
                host: 'db.prod.example.com',
                port: 5432,
                name: 'tiangong_prod',
            },
            redis: {
                host: 'redis.prod.example.com',
                port: 6379,
            },
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'config-002',
        name: 'Frontend Config',
        environment_id: 'env-prod-us',
        product_id: 'prod-frontend',
        content: {
            api_url: 'https://api.prod.example.com',
            cdn_url: 'https://cdn.prod.example.com',
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
];


