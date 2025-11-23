# Tiangong Deploy Service 技术方案

## 1. 项目背景

`tiangong-deploy-service` 是 Tiangong Deploy 平台的业务逻辑核心服务，主要负责承接 `tiangong-deploy-ui` 的所有后端请求。它将作为用户界面和底层 `cloud` 服务之间的中间层，处理复杂的业务逻辑、权限控制、数据持久化以及与 `cloud` 服务的交互。

## 2. 总体架构

```mermaid
graph TB
    UI[Tiangong Deploy UI]
    Service[Tiangong Deploy Service]
    Cloud[Cloud Server]
    DB[(Shared Database)]

    UI -->|REST API| Service
    Service -->|REST API (Write/Execute)| Cloud
    Service -->|SQL (Read/Write)| DB
    Cloud -->|SQL (Read/Write)| DB
```

### 2.1 核心职责

1.  **业务数据管理**：管理环境、产品、发布、部署、变更、用户、权限等核心业务数据。
2.  **业务逻辑处理**：实现发布审批、变更流转、配置同步、合规检查等复杂业务逻辑。
3.  **数据查询与聚合**：
    *   **直接查询**：对于 `cloud` 服务已有的数据（如 Agent、Task、Log），`tiangong-deploy-service` 直接连接数据库进行查询，减少 RPC 开销。
    *   **操作代理**：对于需要触发动作的操作（如执行任务、分发文件），通过 API 调用 `cloud` 服务，确保触发 WebSocket 消息推送和任务调度。
4.  **权限控制**：实现基于 RBAC 的细粒度权限控制。

### 2.2 技术选型

*   **语言**：Go (Golang)
*   **框架**：Gin (Web 框架) + GORM (ORM)
*   **数据库**：MySQL / PostgreSQL (与 Cloud 服务共用同一个数据库实例)
*   **通信**：HTTP RESTful API (用于触发 Cloud 动作)

## 3. 接口设计

根据 `tiangong-deploy-ui` 的需求，服务需提供以下 API 模块：

### 3.1 基础管理模块

#### Environment API (环境管理)
*   `GET /api/v1/environments` - 获取环境列表
*   `GET /api/v1/environments/:id` - 获取环境详情
*   `POST /api/v1/environments` - 创建环境
*   `PUT /api/v1/environments/:id` - 更新环境
*   `DELETE /api/v1/environments/:id` - 删除环境
*   `POST /api/v1/environments/:id/health-check` - 环境健康检查

#### Product API (产品管理)
*   `GET /api/v1/products` - 获取产品列表
*   `GET /api/v1/products/:id` - 获取产品详情
*   `POST /api/v1/products` - 创建产品
*   `PUT /api/v1/products/:id` - 更新产品
*   `DELETE /api/v1/products/:id` - 删除产品
*   `GET /api/v1/products/:id/versions` - 获取产品版本列表
*   `POST /api/v1/products/:id/versions` - 创建产品版本

#### User & IAM API (用户与权限)
*   `GET /api/v1/users` - 用户列表
*   `POST /api/v1/users` - 创建用户
*   ... (User, UserGroup, Role 的 CRUD 接口)

### 3.2 部署与发布模块

#### Release API (发布管理)
*   `GET /api/v1/releases` - 发布列表
*   `POST /api/v1/releases` - 创建发布
*   `PUT /api/v1/releases/:id` - 更新发布
*   `POST /api/v1/releases/:id/approve` - 审批发布

#### Deployment API (部署管理)
*   `GET /api/v1/deployments` - 部署列表
*   `POST /api/v1/deployments` - 创建部署计划
*   `POST /api/v1/deployments/:id/execute` - 执行部署 (调用 Cloud API)
*   `POST /api/v1/deployments/:id/rollback` - 回滚部署
*   `GET /api/v1/deployments/:id/logs` - 获取部署日志 (直接查询数据库中的 Log 表)

### 3.3 变更与合规模块

#### Change API (变更管理)
*   `GET /api/v1/changes` - 变更列表
*   `POST /api/v1/changes` - 创建变更请求
*   `POST /api/v1/changes/:id/submit` - 提交变更
*   `POST /api/v1/changes/:id/approve` - 审批变更
*   `POST /api/v1/changes/:id/execute` - 执行变更

#### Audit API (审计日志)
*   `GET /api/v1/audit-logs` - 查询审计日志
*   `GET /api/v1/audit-logs/export` - 导出审计日志

### 3.4 底层资源模块 (混合模式)

对于 Agent、Task、File 等底层资源，采用 **读写分离** 策略：

*   **查询 (Read)**：直接查询数据库
    *   `GET /api/v1/agents` -> SQL Select `agents` table
    *   `GET /api/v1/tasks` -> SQL Select `tasks` table
    *   `GET /api/v1/files` -> SQL Select `files` table
*   **操作 (Write/Execute)**：调用 Cloud API
    *   `POST /api/v1/tasks` -> Call Cloud API (触发任务下发)
    *   `POST /api/v1/files` -> Call Cloud API (处理文件上传和存储)

## 4. 数据库设计 (ER 模型概要)

### 4.1 Cloud 服务已有表 (Shared)

`tiangong-deploy-service` 将直接读取这些表：

*   **agents**: Agent 节点信息
*   **tasks**: 任务执行记录
*   **logs**: 任务日志
*   **files**: 文件记录
*   **task_files**: 任务与文件关联

### 4.2 新增业务表 (Owned by Service)

`tiangong-deploy-service` 负责维护这些表：

*   **environments**: `id`, `name`, `type`, `config`, `status`
*   **products**: `id`, `name`, `description`
*   **product_versions**: `id`, `product_id`, `version`, `artifacts`
*   **releases**: `id`, `product_id`, `version_id`, `channel`, `status`
*   **deployments**: `id`, `release_id`, `environment_id`, `status`, `plan`
*   **changes**: `id`, `title`, `type`, `status`, `applicant_id`, `approver_id`
*   **users**: `id`, `username`, `email`, `role_id`
*   **audit_logs**: `id`, `user_id`, `action`, `resource`, `timestamp`

### 4.3 关联关系

*   `Deployment` (Service表) 关联 `Task` (Cloud表) -> 通过 `task_id` 逻辑关联
*   `Environment` (Service表) 关联 `Agent` (Cloud表) -> 通过 `agent_id` 逻辑关联

## 5. 与 Cloud Server 的交互

`tiangong-deploy-service` 通过 HTTP Client 调用 `Cloud Server` 的 API。

### 5.1 配置
在 `tiangong-deploy-service` 的配置文件中需指定 `Cloud Server` 的地址：

```yaml
cloud_server:
  url: "http://localhost:8080"
  api_key: "internal-secure-key" # 用于服务间认证
```

### 5.2 交互场景示例：部署执行

1.  用户在 UI 点击“执行部署”。
2.  UI 请求 `POST /api/v1/deployments/:id/execute`。
3.  `tiangong-deploy-service`：
    *   校验用户权限。
    *   读取 Deployment 关联的 Release 和 Environment 信息。
    *   生成具体的 Task 定义 (如 K8s Apply 或 Shell 命令)。
    *   调用 `Cloud Server` 的 `POST /api/v1/tasks` 创建任务。
    *   更新本地 Deployment 状态为 `running`，并记录 Cloud 返回的 Task ID。
4.  `tiangong-deploy-service` 轮询或通过 Webhook (需 Cloud 支持) 监听 Task 状态，同步更新 Deployment 状态。

## 6. 开发计划

1.  **初始化项目**：搭建 Gin 框架，配置数据库连接，集成 Swagger。
2.  **实现基础模块**：Environment, Product, User 的 CRUD。
3.  **对接 Cloud Server**：封装 Cloud SDK，实现 Agent/Task 的代理。
4.  **实现核心业务**：Release, Deployment 的流程逻辑。
5.  **完善变更与审计**：Change 审批流，Audit 记录。
