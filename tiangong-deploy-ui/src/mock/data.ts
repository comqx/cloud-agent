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

// Mock Products
export const mockProducts: Product[] = [
    {
        id: 'prod-backend',
        name: 'Tiangong Backend',
        description: 'Core backend service for Tiangong platform',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'prod-frontend',
        name: 'Tiangong Frontend',
        description: 'Web UI for Tiangong platform',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
    },
    {
        id: 'prod-agent',
        name: 'Tiangong Agent',
        description: 'Edge agent for Tiangong platform',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-20T10:00:00Z',
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
