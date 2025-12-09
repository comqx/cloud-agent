# Tiangong Deploy API 接口文档

本文档描述了 Tiangong Deploy 服务提供的核心 API 接口，供其他服务调用。

## 基础信息

- **Base URL**: `http://your-cloud-server:8080/api/v1`
- **Content-Type**: `application/json` (除文件上传接口外)
- **字符编码**: UTF-8

## 任务执行模式说明

所有任务创建接口（`POST /api/v1/tasks`）都支持两种执行模式：

### 异步模式（默认）

- **参数**: `sync: false` 或不设置 `sync` 参数
- **行为**: 接口立即返回任务对象，不等待执行完成
- **适用场景**: 
  - 长时间运行的任务
  - 不需要立即获取结果的场景
  - 批量操作
- **响应**: 任务状态为 `running`，需要通过 `GET /api/v1/tasks/:id` 查询任务状态

### 同步模式

- **参数**: `sync: true`
- **行为**: 接口等待任务执行完成后返回结果
- **适用场景**:
  - 短时间任务（< 30 秒）
  - 需要立即获取执行结果的场景
  - 简单的查询操作
- **响应**: 任务状态为 `success` 或 `failed`，包含完整的执行结果
- **超时控制**: 
  - `timeout` 参数：同步模式超时时间（秒），默认 60，最大 300
  - 超时后返回当前任务状态，可通过 `status` 字段判断是否完成

### 通用参数

所有任务创建接口都支持以下通用参数：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sync | boolean | 否 | 是否同步等待任务完成，默认 `false`（异步模式） |
| timeout | integer | 否 | 同步模式超时时间（秒），默认 60，最大 300 |

## 目录

1. [Shell 命令执行接口](#1-shell-命令执行接口)
2. [API 请求接口](#2-api-请求接口)
3. [Kubernetes 资源操作接口](#3-kubernetes-资源操作接口)
4. [数据库执行接口](#4-数据库执行接口)
   - [4.1 MySQL 执行接口](#41-mysql-执行接口)
   - [4.2 PostgreSQL 执行接口](#42-postgresql-执行接口)
   - [4.3 MongoDB 执行接口](#43-mongodb-执行接口)
   - [4.4 Elasticsearch 执行接口](#44-elasticsearch-执行接口)
   - [4.5 ClickHouse 执行接口](#45-clickhouse-执行接口)
   - [4.6 Doris 执行接口](#46-doris-执行接口)
5. [文件上传接口](#5-文件上传接口)
6. [任务查询接口](#6-任务查询接口)
7. [错误码说明](#7-错误码说明)

---

## 1. Shell 命令执行接口

### 接口说明

通过创建任务的方式执行 Shell 命令，命令将在指定的 Agent 节点上执行。

**执行模式**：
- **异步模式（默认）**：接口立即返回任务对象，不等待执行完成。适用于长时间运行的任务。
- **同步模式**：接口等待任务执行完成后返回结果。适用于短时间任务，需要立即获取执行结果。

### 请求信息

- **方法**: `POST`
- **URL**: `/api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 任务类型，固定为 `"shell"` |
| command | string | 是 | 要执行的 Shell 命令 |
| params | object | 否 | 额外参数（可选） |
| file_id | string | 否 | 关联的文件 ID（如果命令需要文件） |
| sync | boolean | 否 | 是否同步等待任务完成，默认 `false`（异步模式） |
| timeout | integer | 否 | 同步模式超时时间（秒），默认 60，最大 300 |

### 请求示例

#### 异步模式（默认）

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "ls -la /tmp",
  "params": {}
}
```

#### 同步模式

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "echo Hello World",
  "sync": true,
  "timeout": 30
}
```

### 响应格式

#### 异步模式响应（HTTP 201 Created）

接口立即返回，任务状态为 `running`：

```json
{
  "id": "task-abc123",
  "agent_id": "agent-123",
  "type": "shell",
  "status": "running",
  "command": "ls -la /tmp",
  "params": "{}",
  "file_id": "",
  "result": "",
  "error": "",
  "started_at": null,
  "finished_at": null,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

#### 同步模式响应（HTTP 201 Created）

接口等待任务完成后返回，任务状态为 `success` 或 `failed`：

```json
{
  "id": "task-abc123",
  "agent_id": "agent-123",
  "type": "shell",
  "status": "success",
  "command": "echo Hello World",
  "params": "{}",
  "file_id": "",
  "result": "Hello World\n",
  "error": "",
  "started_at": "2024-01-01T10:00:00Z",
  "finished_at": "2024-01-01T10:00:01Z",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:01Z"
}
```

**同步模式超时响应**（HTTP 201 Created，但包含错误信息）：

如果任务在指定超时时间内未完成，接口会返回当前任务状态，并在响应中包含超时错误提示。客户端可以通过检查 `status` 字段判断任务是否完成。

### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 任务 ID，用于后续查询任务状态和日志 |
| agent_id | string | Agent 节点 ID |
| type | string | 任务类型 |
| status | string | 任务状态：`pending`（待执行）、`running`（执行中）、`success`（成功）、`failed`（失败）、`canceled`（已取消） |
| command | string | 执行的命令 |
| result | string | 执行结果（任务完成后才有值） |
| error | string | 错误信息（任务失败时才有值） |
| started_at | string | 开始执行时间（ISO 8601 格式） |
| finished_at | string | 完成时间（ISO 8601 格式） |
| created_at | string | 创建时间（ISO 8601 格式） |

### 使用示例

#### cURL

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-123",
    "type": "shell",
    "command": "echo Hello World"
  }'
```

---

## 2. API 请求接口

### 接口说明

通过创建任务的方式执行 HTTP/HTTPS 请求，支持 GET、POST、PUT、DELETE 等方法。

### 请求信息

- **方法**: `POST`
- **URL**: `/api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 任务类型，固定为 `"api"` |
| command | string | 否 | HTTP 方法（GET、POST、PUT、DELETE 等），默认为 `"GET"` |
| params | object | 是 | 请求参数，包含以下字段：<br><br>  - `url` (string, 必填): 请求的 URL<br>  - `headers` (object, 可选): HTTP 请求头<br>  - `body` (string/object, 可选): 请求体，可以是字符串或 JSON 对象 |
| file_id | string | 否 | 关联的文件 ID（可选） |
| sync | boolean | 否 | 是否同步等待任务完成，默认 `false`（异步模式） |
| timeout | integer | 否 | 同步模式超时时间（秒），默认 60，最大 300 |

### params 参数详细说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| url | string | 是 | 请求的目标 URL |
| headers | object | 否 | HTTP 请求头，键值对形式 |
| body | string/object | 否 | 请求体。如果是对象，会自动序列化为 JSON；如果是字符串，按原样发送 |

### 请求示例

#### GET 请求

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "GET",
  "params": {
    "url": "https://api.example.com/users",
    "headers": {
      "Authorization": "Bearer token123"
    }
  }
}
```

#### POST 请求（JSON 格式）

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://api.example.com/users",
    "headers": {
      "Authorization": "Bearer token123",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### POST 请求（字符串格式）

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://api.example.com/data",
    "headers": {
      "Content-Type": "text/plain"
    },
    "body": "raw string data"
  }
}
```

### 响应格式

**成功响应** (HTTP 201 Created)

响应格式与 Shell 命令执行接口相同，但 `result` 字段包含 HTTP 响应的详细信息：

```text
Status: 200 OK HTTP/1.1
Headers:
  Content-Type: application/json
  Content-Length: 123

Body:
{"id": 1, "name": "John Doe"}
```

### 请求示例

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-123",
    "type": "api",
    "command": "GET",
    "params": {
      "url": "https://api.github.com/users/octocat",
      "headers": {
        "User-Agent": "Tiangong-Deploy"
      }
    }
  }'
```

---

## 3. Kubernetes 资源操作接口

### 接口说明

通过创建任务的方式操作 Kubernetes 集群中的资源，支持创建、更新、删除、补丁和应用等操作。支持 YAML 和 JSON 两种格式的资源配置。

### 请求信息

- **方法**: `POST`
- **URL**: `/api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID（必须是在 Kubernetes 集群中运行的 Agent） |
| type | string | 是 | 任务类型，固定为 `"k8s"` |
| command | string | 是 | Kubernetes 资源的 YAML 或 JSON 配置内容 |
| params | object | 否 | 操作参数（见下方说明） |
| file_id | string | 否 | 关联的文件 ID（如果配置内容在文件中） |
| sync | boolean | 否 | 是否同步等待任务完成，默认 `false`（异步模式） |
| timeout | integer | 否 | 同步模式超时时间（秒），默认 60，最大 300 |

### params 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| operation | string | 否 | 操作类型：`create`（创建）、`update`（更新）、`delete`（删除）、`patch`（补丁）、`apply`（应用，默认值）。apply 操作会自动判断资源是否存在，存在则更新，不存在则创建 |
| namespace | string | 否 | 命名空间，如果不指定则使用配置中的 namespace 或默认命名空间 `default` |
| patch_type | string | 否 | 仅当 operation 为 `patch` 时有效。补丁类型：`strategic`（战略合并补丁，默认）、`merge`（合并补丁）、`json`（JSON 补丁） |

### 支持的操作类型

1. **create**: 创建新资源，如果资源已存在则返回错误
2. **update**: 更新现有资源，如果资源不存在则返回错误
3. **delete**: 删除资源，需要提供完整的资源定义（至少包含 apiVersion、kind、metadata.name）
4. **patch**: 对资源进行部分更新，配置中只需包含要修改的字段
5. **apply**: 智能应用（推荐），自动判断资源是否存在并执行创建或更新操作

### 请求示例

#### 示例 1: 创建 Pod（YAML 格式，使用 apply 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.21\n    ports:\n    - containerPort: 80",
  "params": {
    "operation": "apply"
  }
}
```

#### 示例 2: 创建 Deployment（JSON 格式，使用 create 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "{\"apiVersion\":\"apps/v1\",\"kind\":\"Deployment\",\"metadata\":{\"name\":\"nginx-deployment\",\"namespace\":\"production\"},\"spec\":{\"replicas\":3,\"selector\":{\"matchLabels\":{\"app\":\"nginx\"}},\"template\":{\"metadata\":{\"labels\":{\"app\":\"nginx\"}},\"spec\":{\"containers\":[{\"name\":\"nginx\",\"image\":\"nginx:1.21\",\"ports\":[{\"containerPort\":80}]}]}}}}",
  "params": {
    "operation": "create",
    "namespace": "production"
  }
}
```

#### 示例 3: 更新资源（使用 update 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  namespace: production\nspec:\n  replicas: 5",
  "params": {
    "operation": "update",
    "namespace": "production"
  }
}
```

#### 示例 4: 删除资源（使用 delete 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  namespace: default",
  "params": {
    "operation": "delete"
  }
}
```

#### 示例 5: 补丁资源（使用 patch 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  namespace: production\nspec:\n  replicas: 10",
  "params": {
    "operation": "patch",
    "patch_type": "strategic",
    "namespace": "production"
  }
}
```

### cURL 示例

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-123",
    "type": "k8s",
    "command": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.21",
    "params": {
      "operation": "create"
    }
  }'
```

### 响应格式

**成功响应** (HTTP 201 Created)

```json
{
  "id": "task-abc123",
  "agent_id": "agent-123",
  "type": "k8s",
  "status": "pending",
  "command": "apiVersion: v1\nkind: Pod\n...",
  "params": "{\"operation\":\"create\"}",
  "file_id": "",
  "result": "",
  "error": "",
  "started_at": null,
  "finished_at": null,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

任务执行成功后，`result` 字段会包含操作结果（资源的 JSON 格式）：

```json
{
  "id": "task-abc123",
  "status": "success",
  "result": "{\n  \"apiVersion\": \"v1\",\n  \"kind\": \"Pod\",\n  \"metadata\": {\n    \"name\": \"nginx-pod\",\n    \"namespace\": \"default\",\n    \"uid\": \"...\",\n    \"resourceVersion\": \"...\"\n  },\n  \"spec\": {...},\n  \"status\": {...}\n}"
}
```

### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 任务 ID，用于后续查询任务状态和日志 |
| agent_id | string | Agent 节点 ID |
| type | string | 任务类型，固定为 `"k8s"` |
| status | string | 任务状态：`pending`（待执行）、`running`（执行中）、`success`（成功）、`failed`（失败）、`canceled`（已取消） |
| command | string | YAML 或 JSON 配置内容 |
| params | string | JSON 格式的参数 |
| result | string | 操作结果（资源的 JSON 格式） |
| error | string | 错误信息（如果操作失败） |

### 支持的资源类型

支持所有 Kubernetes 原生资源和自定义资源（CRD），包括但不限于：

- **核心资源**: Pod, Service, ConfigMap, Secret, Namespace, PersistentVolume, PersistentVolumeClaim 等
- **应用资源**: Deployment, StatefulSet, DaemonSet, ReplicaSet, Job, CronJob 等
- **网络资源**: Ingress, NetworkPolicy, ServiceAccount 等
- **存储资源**: StorageClass, Volume 等
- **自定义资源**: 所有通过 CRD 定义的自定义资源

### 注意事项

1. **格式支持**: 支持 YAML 和 JSON 两种格式，系统会自动识别格式
2. **多资源**: 支持在单个任务中处理多个资源，使用 `---` 分隔符分隔
3. **Agent 配置**: Agent 必须能够访问 Kubernetes 集群（通过 in-cluster 配置或 kubeconfig 文件）
4. **权限要求**: Agent 需要有足够的权限执行相应的操作（创建、更新、删除等）
5. **命名空间**: 如果不指定命名空间，将使用配置中的 namespace 或默认的 `default` 命名空间
6. **资源版本**: update 和 patch 操作会自动处理 resourceVersion，确保并发安全

### 错误处理

如果操作失败，任务状态会变为 `failed`，`error` 字段会包含详细的错误信息：

```json
{
  "id": "task-abc123",
  "status": "failed",
  "error": "failed to create resource: pods \"nginx-pod\" already exists"
}
```

常见错误：
- 资源已存在（create 操作）
- 资源不存在（update/delete 操作）
- YAML/JSON 格式错误
- 权限不足
- 资源定义无效

---

## 4. 数据库执行接口

Tiangong Deploy 支持多种数据库的执行操作，包括 MySQL、PostgreSQL、MongoDB、Elasticsearch、ClickHouse 和 Doris。所有数据库执行接口使用统一的接口格式，通过 `type` 字段区分不同的数据库类型。

### 通用请求格式

- **方法**: `POST`
- **URL**: `/api/v1/tasks`
- **Content-Type**: `application/json`

### 通用请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 数据库类型：`mysql`、`postgres`、`mongo`、`elasticsearch`、`clickhouse`、`doris` |
| command | string | 否 | SQL 语句或数据库操作命令（如果提供了 `file_id`，则从文件读取，command 可选） |
| params | object | 否 | 数据库连接和执行参数（见各数据库详细说明） |
| file_id | string | 否 | 关联的文件 ID（支持 SQL 文件和 zip 压缩包）<br>- 如果提供了 `file_id`，优先从文件读取 SQL<br>- 支持普通 `.sql` 文件和 `.zip` 压缩包<br>- 如果是 zip 文件，可以通过 `params.file_name` 指定要执行的文件名，否则自动查找第一个 `.sql` 文件 |
| sync | boolean | 否 | 是否同步等待任务完成，默认 `false`（异步模式） |
| timeout | integer | 否 | 同步模式超时时间（秒），默认 60，最大 300 |

### 通用响应格式

响应格式与 Shell 命令执行接口相同，`result` 字段包含执行结果详情。

---

### 4.1 MySQL 执行接口

#### 接口说明

通过 goInception 执行 MySQL SQL 语句，支持 SQL 审核、执行、备份和回滚 SQL 生成。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"mysql"` |
| command | string | 是 | SQL 语句（支持多语句，用分号分隔） |
| params | object | 否 | 数据库参数（见下方说明） |
| file_id | string | 否 | SQL 文件 ID |

#### params 参数说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| target | object | **推荐** | 目标数据库连接信息（动态连接，支持同时执行多个实例）<br>- `host` (string): 数据库主机，必填<br>- `port` (int): 端口，默认 3306<br>- `user` (string): 用户名<br>- `password` (string): 密码<br>- `secret_ref` (string): 凭据引用（预留，暂不支持）<br>- `db` (string): 数据库名，**可选**（可在 SQL 中使用 `库名.表名` 指定）<br><br>**注意**：<br>- MySQL 使用 goInception 执行，连接信息需要在 goInception 服务端配置。如果未指定数据库名，会使用默认值 `mysql`<br>- 数据库名可以在 SQL 脚本中通过 `库名.表名` 的方式指定，无需在参数中提供 |
| connection | string | 否 | 使用配置文件中的连接名（向后兼容，不推荐用于多实例场景） |
| database | string | 否 | 数据库名（可选，优先使用 target.db 或 target.database） |
| exec_options | object | 否 | 执行选项<br>- `trans_batch_size` (int): 事务批次大小，默认 200<br>- `backup` (bool): 是否备份，默认 true<br>- `sleep_ms` (int): 批次间休眠时间（毫秒）<br>- `timeout_ms` (int): 执行超时时间（毫秒），默认 600000<br>- `concurrency` (int): 并发数，默认 1 |
| metadata | object | 否 | 审计元数据<br>- `env` (string): 环境标识<br>- `creator` (string): 创建者<br>- `ticket` (string): 工单号 |

#### 请求示例

**示例 1：使用 target 参数（推荐，支持多实例）**

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "command": "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100)); INSERT INTO users VALUES (1, 'test');",
  "params": {
    "target": {
      "host": "mysql-server-1.example.com",
      "port": 3306,
      "user": "admin",
      "password": "password",
      "db": "test_db"
    },
    "exec_options": {
      "trans_batch_size": 200,
      "backup": true,
      "timeout_ms": 600000
    },
    "metadata": {
      "env": "prod",
      "creator": "admin"
    }
  }
}
```

**示例 2：使用 connection 参数（向后兼容）**

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "command": "SELECT * FROM users",
  "params": {
    "connection": "default",
    "database": "test_db",
    "exec_options": {
      "backup": true
    }
  }
}
```

**示例 3：使用 file_id 执行 SQL 文件**

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "file_id": "file-abc123",
  "params": {
    "target": {
      "host": "mysql-server-1.example.com",
      "port": 3306,
      "user": "admin",
      "password": "password",
      "db": "test_db"
    },
    "exec_options": {
      "backup": true
    }
  }
}
```

**示例 4：使用 file_id 执行 zip 文件中的指定 SQL 文件**

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "file_id": "file-abc123",
  "params": {
    "target": {
      "host": "mysql-server-1.example.com",
      "port": 3306,
      "user": "admin",
      "password": "password",
      "db": "test_db"
    },
    "file_name": "migration_v1.sql",
    "exec_options": {
      "backup": true
    }
  }
}
```

**示例 5：不指定数据库名，在 SQL 中使用库名.表名**

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "command": "SELECT * FROM test_db.users; INSERT INTO prod_db.orders VALUES (1, 'order1');",
  "params": {
    "target": {
      "host": "mysql-server-1.example.com",
      "port": 3306,
      "user": "admin",
      "password": "password"
      // 注意：未指定 db，SQL 中使用 test_db.users 和 prod_db.orders 指定数据库
    },
    "exec_options": {
      "backup": true
    }
  }
}
```

#### 响应示例

```json
{
  "id": "task-abc123",
  "agent_id": "agent-123",
  "type": "mysql",
  "status": "success",
  "command": "CREATE TABLE users...",
  "result": "Order ID: 1\nStage: EXECUTED\nStatus: Execute Successfully\nAffected Rows: 0\nExecute Time: 0.001s\nBackup DB: backup_test_db_20240101\nRollback SQL: DROP TABLE IF EXISTS `users`\nSQL: CREATE TABLE users...",
  "error": "",
  "started_at": "2024-01-01T10:00:05Z",
  "finished_at": "2024-01-01T10:00:06Z"
}
```

#### 注意事项

1. **goInception 连接管理**：
   - MySQL 执行通过 goInception 服务，需要在 Agent 配置中指定 `goinception_url`
   - goInception 的连接信息需要在 goInception 服务端配置
   - `target` 参数中的 `host`、`port`、`user`、`password` 主要用于标识，goInception 会根据 `db_name` 查找对应的连接配置
   - 如需支持多个 MySQL 实例，需要在 goInception 端配置多个数据库连接

2. **动态连接支持**：
   - 推荐使用 `target` 参数传递连接信息，支持同时执行多个数据库实例
   - `target.db` 或 `target.database` 用于指定数据库名
   - 连接信息会被缓存，相同连接字符串会复用连接池

3. **SQL 审核与备份**：
   - goInception 会自动进行 SQL 审核，检查潜在问题
   - 启用备份时，会自动生成回滚 SQL（当前阶段仅记录，不实现回滚执行）

4. **多语句执行**：
   - 支持多语句执行，按批次处理

---

### 4.2 PostgreSQL 执行接口

#### 接口说明

执行 PostgreSQL SQL 语句，支持事务批次处理。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"postgres"` |
| command | string | 是 | SQL 语句（支持多语句，用分号分隔） |
| params | object | 否 | 数据库参数 |

#### params 参数说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| target | object | **推荐** | 目标数据库连接信息（动态连接）<br>- `host` (string): 数据库主机，必填<br>- `port` (int): 端口，默认 5432<br>- `user` (string): 用户名，默认 "postgres"<br>- `password` (string): 密码<br>- `database` (string): 数据库名，**可选**（可在 SQL 中使用 `库名.表名` 指定，未提供时使用默认值 "postgres"）<br>- `sslmode` (string): SSL 模式，默认 "disable" |
| connection | string | 否 | 连接名（向后兼容，不推荐用于多实例场景） |
| exec_options | object | 否 | 执行选项<br>- `trans_batch_size` (int): 事务批次大小，默认 200<br>- `sleep_ms` (int): 批次间休眠时间<br>- `timeout_ms` (int): 执行超时时间（毫秒），默认 600000 |

#### 请求示例

**示例 1：使用 target 参数（推荐，支持多实例）**

```json
{
  "agent_id": "agent-123",
  "type": "postgres",
  "command": "CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100)); INSERT INTO users (name) VALUES ('test');",
  "params": {
    "target": {
      "host": "postgres-server-1.example.com",
      "port": 5432,
      "user": "postgres",
      "password": "password",
      "database": "test_db",
      "sslmode": "require"
    },
    "exec_options": {
      "trans_batch_size": 200,
      "timeout_ms": 600000
    }
  }
}
```

**示例 2：使用 connection 参数（向后兼容）**

```json
{
  "agent_id": "agent-123",
  "type": "postgres",
  "command": "SELECT * FROM users",
  "params": {
    "connection": "default",
    "exec_options": {
      "timeout_ms": 600000
    }
  }
}
```

#### 注意事项

1. **动态连接支持**：
   - 推荐使用 `target` 参数传递连接信息，支持同时执行多个数据库实例
   - 连接信息会被缓存，相同连接字符串会复用连接池
   - 如果使用 `connection` 参数，需要在 Agent 配置文件中配置连接信息（向后兼容）

2. **事务处理**：
   - DDL 语句会隐式提交，需要注意事务边界
   - 支持事务批次处理，失败时自动回滚

3. **连接池管理**：
   - 每个连接字符串维护独立的连接池
   - 连接池配置：最大打开连接数 10，最大空闲连接数 5，连接最大生存时间 1 小时

---

### 4.3 MongoDB 执行接口

#### 接口说明

执行 MongoDB 操作，支持 insert、update、delete 等操作。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"mongo"` |
| command | string | 是 | MongoDB 操作 JSON（见下方格式说明） |
| params | object | 否 | 数据库参数 |

#### command 格式说明

支持单个操作或操作序列（数组）：

**单个操作**:
```json
{
  "operation": "insert",
  "collection": "users",
  "documents": [
    {"name": "test", "email": "test@example.com"}
  ]
}
```

**操作序列**:
```json
[
  {
    "operation": "insert",
    "collection": "users",
    "documents": [{"name": "user1"}]
  },
  {
    "operation": "update",
    "collection": "users",
    "filter": {"name": "user1"},
    "update": {"status": "active"}
  }
]
```

#### 支持的操作类型

- **insert**: 插入文档
  - `collection` (string, 必填): 集合名
  - `documents` (array, 必填): 要插入的文档数组

- **update**: 更新文档
  - `collection` (string, 必填): 集合名
  - `filter` (object, 必填): 查询条件
  - `update` (object, 必填): 更新内容

- **delete**: 删除文档
  - `collection` (string, 必填): 集合名
  - `filter` (object, 必填): 查询条件

#### params 参数说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| target | object | **推荐** | 目标数据库连接信息（动态连接）<br>- `host` (string): 数据库主机，必填<br>- `port` (int): 端口，默认 27017<br>- `user` (string): 用户名<br>- `password` (string): 密码<br>- `db` 或 `database` (string): 数据库名，**可选**（未提供时使用默认值 "admin"） |
| connection | string | 否 | 连接名（向后兼容，不推荐用于多实例场景） |
| database | string | 否 | 数据库名（优先使用 target.db 或 target.database） |
| exec_options | object | 否 | 执行选项<br>- `timeout_ms` (int): 执行超时时间（毫秒），默认 600000 |

#### 请求示例

**示例 1：使用 target 参数（推荐，支持多实例）**

```json
{
  "agent_id": "agent-123",
  "type": "mongo",
  "command": "{\"operation\":\"insert\",\"collection\":\"users\",\"documents\":[{\"name\":\"test\",\"email\":\"test@example.com\"}]}",
  "params": {
    "target": {
      "host": "mongo-server-1.example.com",
      "port": 27017,
      "user": "admin",
      "password": "password",
      "db": "test_db"
    },
    "exec_options": {
      "timeout_ms": 600000
    }
  }
}
```

**示例 2：使用 connection 参数（向后兼容）**

```json
{
  "agent_id": "agent-123",
  "type": "mongo",
  "command": "{\"operation\":\"insert\",\"collection\":\"users\",\"documents\":[{\"name\":\"test\"}]}",
  "params": {
    "connection": "default",
    "database": "test_db",
    "exec_options": {
      "timeout_ms": 600000
    }
  }
}
```

---

### 4.4 Elasticsearch 执行接口

#### 接口说明

执行 Elasticsearch DSL 操作，支持 bulk、update、delete_by_query、index 等操作。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"elasticsearch"` |
| command | string | 是 | Elasticsearch 操作 JSON（见下方格式说明） |
| params | object | 否 | 数据库参数 |

#### command 格式说明

```json
{
  "operation": "bulk",
  "index": "test_index",
  "actions": [
    {
      "index": {
        "_id": "1",
        "_source": {"field": "value"}
      }
    }
  ]
}
```

#### 支持的操作类型

- **bulk**: 批量操作
  - `index` (string, 必填): 索引名
  - `actions` (array, 必填): 操作数组

- **update**: 更新文档
  - `index` (string, 必填): 索引名
  - `id` (string, 必填): 文档 ID
  - `doc` (object, 必填): 更新内容

- **delete_by_query**: 按查询删除
  - `index` (string, 必填): 索引名
  - `query` (object, 必填): 查询条件

- **index**: 索引单个文档
  - `index` (string, 必填): 索引名
  - `id` (string, 可选): 文档 ID
  - `doc` (object, 必填): 文档内容

#### params 参数说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| connection | string | 否 | 连接名，默认 `"default"` |
| exec_options | object | 否 | 执行选项<br>- `timeout_ms` (int): 执行超时时间（毫秒），默认 600000 |

#### 请求示例

**示例 1：使用 target 参数（推荐，支持多实例）**

```json
{
  "agent_id": "agent-123",
  "type": "elasticsearch",
  "command": "{\"operation\":\"index\",\"index\":\"test_index\",\"id\":\"1\",\"doc\":{\"field\":\"value\"}}",
  "params": {
    "target": {
      "host": "es-server-1.example.com",
      "port": 9200,
      "user": "elastic",
      "password": "password"
    },
    "exec_options": {
      "timeout_ms": 600000
    }
  }
}
```

**示例 2：使用 API Key 认证**

```json
{
  "agent_id": "agent-123",
  "type": "elasticsearch",
  "command": "{\"operation\":\"bulk\",\"index\":\"test_index\",\"actions\":[...]}",
  "params": {
    "target": {
      "host": "es-server-1.example.com",
      "port": 9200,
      "api_key": "your-api-key"
    }
  }
}
```

---

### 4.5 ClickHouse 执行接口

#### 接口说明

执行 ClickHouse SQL 语句。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"clickhouse"` |
| command | string | 是 | SQL 语句（支持多语句，用分号分隔） |
| params | object | 否 | 数据库参数 |

#### params 参数说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| connection | string | 否 | 连接名，默认 `"default"` |
| exec_options | object | 否 | 执行选项<br>- `timeout_ms` (int): 执行超时时间（毫秒），默认 600000 |

#### 请求示例

**示例 1：使用 target 参数（推荐，支持多实例）**

```json
{
  "agent_id": "agent-123",
  "type": "clickhouse",
  "command": "CREATE TABLE test_table (id UInt32, name String) ENGINE = MergeTree() ORDER BY id; INSERT INTO test_table VALUES (1, 'test');",
  "params": {
    "target": {
      "host": "clickhouse-server-1.example.com",
      "port": 9000,
      "protocol": "native",
      "user": "default",
      "password": "password",
      "database": "test_db"
    },
    "exec_options": {
      "timeout_ms": 600000
    }
  }
}
```

**示例 2：使用 HTTP 协议**

```json
{
  "agent_id": "agent-123",
  "type": "clickhouse",
  "command": "SELECT * FROM test_table",
  "params": {
    "target": {
      "host": "clickhouse-server-1.example.com",
      "port": 8123,
      "protocol": "http",
      "user": "default",
      "password": "password",
      "database": "test_db"
    }
  }
}
```

#### 注意事项

1. ClickHouse 不支持通用事务，需要注意操作的原子性
2. 破坏性操作（如 DROP、ALTER DROP PART）建议先备份
3. 支持 Native 协议（默认端口 9000）和 HTTP 协议（端口 8123）

---

### 4.6 Doris 执行接口

#### 接口说明

执行 Doris SQL 语句。Doris 兼容 MySQL 协议，使用 goInception 执行。

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | string | 是 | Agent 节点 ID |
| type | string | 是 | 固定为 `"doris"` |
| command | string | 是 | SQL 语句 |
| params | object | 否 | 数据库参数（与 MySQL 相同） |

#### 请求示例

```json
{
  "agent_id": "agent-123",
  "type": "doris",
  "command": "SELECT * FROM table1 WHERE id = 1",
  "params": {
    "connection": "default",
    "database": "test_db",
    "exec_options": {
      "timeout_ms": 1800000
    }
  }
}
```

#### 注意事项

1. Doris 查询可能较慢，默认超时时间为 30 分钟（1800000 毫秒）
2. 使用 goInception 执行（如果支持 Doris）
3. 参数格式与 MySQL 相同

---

### 数据库执行通用注意事项

1. **动态连接支持（推荐）**：
   - 所有数据库执行器支持通过 `params.target` 参数动态传递连接信息
   - 支持同时执行多个数据库实例，无需在配置文件中预先配置
   - 连接信息会被缓存，相同连接字符串会复用连接池，提高性能
   - 参数格式：`{"target": {"host": "...", "port": ..., "user": "...", "password": "...", "db": "..."}}`

2. **SQL 文件执行支持**：
   - 支持通过 `file_id` 参数执行 SQL 文件，无需在 `command` 中传递 SQL 内容
   - 支持普通 `.sql` 文件和 `.zip` 压缩包
   - 如果是 zip 文件：
     - 可以通过 `params.file_name` 指定要执行的文件名
     - 如果不指定，自动查找 zip 中的第一个 `.sql` 文件
   - 文件路径查找顺序：
     1. `params.file_path`（如果提供）
     2. `tmp/{file_id}`（agent 工作目录下的 tmp 目录）
     3. `/tmp/{file_id}`（系统临时目录）
   - **文件分发**：如果文件尚未分发到 agent，需要先通过文件分发接口将文件分发到 agent

3. **向后兼容**：
   - 仍支持通过 `connection` 参数使用配置文件中的连接（向后兼容）
   - 但推荐使用 `target` 参数，更灵活且支持多实例

4. **参数优先级**：
   - SQL 内容：`file_id`（从文件读取）> `command`（直接传递）
   - 数据库名：`target.db` 或 `target.database` > `database` > `connection` 配置中的数据库名 > 默认值
   - 连接信息：`target` 参数 > `connection` 配置

5. **数据库名说明**：
   - 数据库名是**可选的**，可以在 SQL 脚本中使用 `库名.表名` 的方式指定数据库
   - 如果未提供数据库名，各数据库会使用默认值：
     - MySQL: `mysql`
     - PostgreSQL: `postgres`
     - MongoDB: `admin`
     - ClickHouse: `default`
   - 对于需要数据库名的场景（如 MongoDB），如果未指定，会使用默认数据库

6. **超时控制**：
   - 通过 `exec_options.timeout_ms` 控制执行超时时间
   - 不同数据库的默认超时时间可能不同

7. **错误处理**：
   - 执行失败时，任务状态为 `failed`，`error` 字段包含详细错误信息
   - 连接失败会立即返回错误，不会重试
   - 文件读取失败会返回明确的错误信息

8. **结果格式**：
   - 执行结果包含影响行数、执行时间、错误级别等信息
   - 支持 JSON 和文本两种格式（默认文本格式保持兼容）

9. **回滚功能**：
   - 当前阶段回滚功能预留，MySQL 通过 goInception 生成回滚 SQL 但暂不执行

10. **MySQL 特殊说明**：
   - MySQL 使用 goInception 执行，连接信息需要在 goInception 服务端配置
   - `target` 参数主要用于指定数据库名，goInception 会根据 `db_name` 查找对应的连接配置
   - 如需支持多个 MySQL 实例，需要在 goInception 端配置多个数据库连接

---

## 5. 文件上传接口

### 接口说明

上传文件到 Cloud 服务，文件会被存储并返回文件 ID，可用于后续的文件分发或任务执行。

### 请求信息

- **方法**: `POST`
- **URL**: `/api/v1/files`
- **Content-Type**: `multipart/form-data`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | 要上传的文件（multipart/form-data 格式） |

### 请求示例

```bash
curl -X POST http://localhost:8080/api/v1/files \
  -F "file=@/path/to/your/file.txt"
```

### 响应格式

**成功响应** (HTTP 201 Created)

```json
{
  "id": "file-abc123",
  "name": "file.txt",
  "path": "/data/files/file.txt",
  "size": 1024,
  "content_type": "text/plain",
  "md5": "5d41402abc4b2a76b9719d911017c592",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 文件 ID，用于后续引用该文件 |
| name | string | 原始文件名 |
| path | string | 文件存储路径 |
| size | int64 | 文件大小（字节） |
| content_type | string | 文件 MIME 类型 |
| md5 | string | 文件 MD5 哈希值（用于去重） |
| created_at | string | 创建时间（ISO 8601 格式） |

### 注意事项

1. 如果上传的文件已存在（通过 MD5 校验），系统会返回已存在的文件记录，不会重复存储
2. 文件名中的路径分隔符（`/`、`\`）和相对路径符号（`..`）会被自动清理，防止路径遍历攻击
3. 如果文件名冲突，系统会自动添加文件 ID 前缀

---

## 6. 任务查询接口

### 6.1 查询任务状态

#### 接口说明

根据任务 ID 查询任务的状态和结果。

#### 请求信息

- **方法**: `GET`
- **URL**: `/api/v1/tasks/{task_id}`

#### 请求示例

```bash
curl http://localhost:8080/api/v1/tasks/task-abc123
```

#### 响应格式

```json
{
  "id": "task-abc123",
  "agent_id": "agent-123",
  "type": "shell",
  "status": "success",
  "command": "ls -la /tmp",
  "params": "{}",
  "file_id": "",
  "result": "total 8\ndrwxrwxrwt  2 root root 4096 Jan  1 10:00 .",
  "error": "",
  "started_at": "2024-01-01T10:00:05Z",
  "finished_at": "2024-01-01T10:00:06Z",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:06Z"
}
```

### 6.2 查询任务日志

#### 接口说明

获取任务的执行日志，支持实时查看任务执行过程。

#### 请求信息

- **方法**: `GET`
- **URL**: `/api/v1/tasks/{task_id}/logs`
- **查询参数**:
  - `limit` (可选): 返回的日志条数，默认 1000

#### 请求示例

```bash
curl "http://localhost:8080/api/v1/tasks/task-abc123/logs?limit=100"
```

#### 响应格式

```json
[
  {
    "id": 1,
    "task_id": "task-abc123",
    "level": "info",
    "message": "Executing command: ls -la /tmp",
    "timestamp": "2024-01-01T10:00:05Z"
  },
  {
    "id": 2,
    "task_id": "task-abc123",
    "level": "info",
    "message": "total 8",
    "timestamp": "2024-01-01T10:00:06Z"
  }
]
```

---

## 7. 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误描述信息"
}
```

### 常见错误

1. **Agent 不存在或离线**

   ```json
   {
     "error": "agent not found"
   }
   ```

2. **任务类型不支持**

   ```json
   {
     "error": "unsupported task type"
   }
   ```

3. **命令为空**

   ```json
   {
     "error": "command is empty"
   }
   ```

4. **API 请求缺少 URL**

   ```json
   {
     "error": "url is required in params"
   }
   ```

5. **文件上传失败**

   ```json
   {
     "error": "failed to upload file: <详细错误信息>"
   }
   ```

---

## 8. 注意事项

1. **Agent 状态**: 执行任务前，请确保目标 Agent 处于在线状态（`status: "online"`）
2. **任务超时**: Shell 命令默认超时时间为 30 分钟，API 请求默认超时时间为 30 秒
3. **文件大小**: 文件上传没有明确的大小限制，但建议单个文件不超过 100MB
4. **并发限制**: 建议控制并发任务数量，避免对 Agent 节点造成过大压力
5. **安全性**:
   - 不要在命令中包含敏感信息（密码、密钥等）
   - 使用 HTTPS 协议进行 API 请求
   - 验证 Agent ID 的有效性

---

## 9. 联系与支持

如有问题或建议，请联系开发团队或提交 Issue。

