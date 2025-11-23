# Cloud Agent

一个面向运维的低门槛混合云远程管控开源项目。

## 核心特性

- 🚀 **无需开发能力**：只需部署 cloud + agent，就可以在网页/CLI 上完成各种操作
- 📦 **统一执行模型**：文件上传 → SQL 执行 → 远程命令 → API 调用 → Kubernetes 发布 → 实时日志返回
- 🔗 **长连接管理**：Agent 自动注册、保持连接、可寻址执行任务
- 👀 **实时可见**：执行过程实时显示日志，失败可重试
- 🧩 **插件式扩展**：SQL、K8s、Shell、API 调用都作为插件，支持后续扩展
- ☸️ **K8s 原生支持**：使用 client-go SDK 直接操作 Kubernetes，支持 in-cluster 配置
- 🏷️ **集群标识**：Agent 自动上报所在 K8s 集群名称，便于多集群管理
- 🔍 **SQL 审核**：集成 goInception，提供 SQL 审核、执行、备份和回滚功能

## 快速开始

### 前置要求

- **goInception 服务**：SQL 执行器需要 goInception 服务支持
  ```bash
  # 下载并启动 goInception
  # 参考：https://github.com/hanchuanchuan/goInception
  docker pull hanchuanchuan/goinception
  docker run -d -p 4000:4000 hanchuanchuan/goinception
  ```

### 使用 Docker Compose

```bash
# 克隆项目
git clone <repository-url>
cd cloud-agent

# 启动服务
docker-compose -f deployments/docker-compose.yml up -d

# 查看日志
docker-compose -f deployments/docker-compose.yml logs -f
```

### 手动部署

#### 1. 启动 Cloud 服务

```bash
go run cmd/cloud/main.go -addr :8080 -db ./data/cloud.db -storage ./data/files
```

#### 2. 启动 Agent

```bash
# 设置 K8s 集群名称（可选）
export K8S_CLUSTER_NAME=production

# 启动 Agent
go run cmd/agent/main.go -cloud http://localhost:8080 -name my-agent
```

#### 3. 访问 Web UI

打开浏览器访问：http://localhost:8080

## 使用 CLI

```bash
# 构建 CLI 工具
go build -o cloudctl cmd/cli/main.go

# 执行 Shell 命令
./cloudctl run -type shell -command "ls -la" -agent <agent-id>

# 执行 SQL
./cloudctl run -type sql -file demo.sql -agent <agent-id>

# 上传文件
./cloudctl upload -file demo.zip

# 查看任务列表
./cloudctl list -resource tasks

# 查看任务日志
./cloudctl logs -task <task-id>
```

## 功能模块

### Agent 管理
- 自动注册到 Cloud 端
- 维持长连接和心跳
- 支持多个 Agent 节点

### 任务执行
- Shell 命令执行
- SQL 执行（支持 MySQL/PostgreSQL）
- Kubernetes 部署
- HTTP API 调用
- 文件操作

### 文件管理
- 文件上传和存储
- 文件分发到多个 Agent
- 文件下载

### 实时日志
- WebSocket 流式传输
- 任务执行过程实时显示
- 历史日志查询

## 配置

### Agent 插件配置

编辑 `configs/agent-plugins.yaml` 来配置执行器插件：

```yaml
plugins:
  - type: shell
    enabled: true
    config:
      timeout: 1800

  # MySQL 执行器（使用 goInception）
  - type: mysql
    enabled: true
    config:
      # goInception 服务地址
      goinception_url: http://localhost:4000
      # 数据库连接配置（用于指定数据库名）
      connections:
        - name: default
          database: test

  # PostgreSQL 执行器（预留，待实现）
  # - type: postgres
  #   enabled: false
  #   config:
  #     connections:
  #       - name: default
  #         host: localhost
  #         port: 5432
  #         database: test

  # Redis 执行器（预留，待实现）
  # - type: redis
  #   enabled: false
  #   config:
  #     connections:
  #       - name: default
  #         host: localhost
  #         port: 6379

  # MongoDB 执行器（预留，待实现）
  # - type: mongo
  #   enabled: false
  #   config:
  #     connections:
  #       - name: default
  #         host: localhost
  #         port: 27017
  #         database: test

  - type: k8s
    enabled: true
    config:
      kubeconfig: ~/.kube/config  # 可选，如果在 Pod 中运行会自动使用 in-cluster 配置
      namespace: default
```

**注意**：

1. **数据库执行器**：
   - **MySQL**：使用 goInception 提供 SQL 审核、执行、备份和回滚功能
   - **PostgreSQL/Redis/MongoDB**：预留接口，待实现
   - 支持通过配置文件为每种数据库类型配置多个连接
   - 需要先部署 [goInception](https://github.com/hanchuanchuan/goInception) 服务
   - goInception 提供 SQL 审核、执行、备份和生成回滚语句功能
   - 配置 `goinception_url` 指向 goInception 服务地址（默认：http://localhost:4000）
   - 支持自动备份和生成回滚 SQL

2. **K8s 执行器使用 client-go SDK**：
   - 在 Kubernetes Pod 中运行时自动使用 in-cluster 配置
   - 在集群外运行时使用 kubeconfig 文件
   - 支持 apply YAML、get、list、delete、describe 等操作

## API 文档

### Agent API

- `GET /api/v1/agents` - 列出所有 Agent
- `GET /api/v1/agents/:id` - 获取 Agent 信息
- `GET /api/v1/agents/:id/status` - 获取 Agent 状态

### Task API

- `POST /api/v1/tasks` - 创建任务
- `GET /api/v1/tasks` - 列出任务
- `GET /api/v1/tasks/:id` - 获取任务信息
- `GET /api/v1/tasks/:id/logs` - 获取任务日志
- `POST /api/v1/tasks/:id/cancel` - 取消任务

### File API

- `POST /api/v1/files` - 上传文件
- `GET /api/v1/files` - 列出文件
- `GET /api/v1/files/:id` - 获取文件信息
- `GET /api/v1/files/:id/download` - 下载文件
- `POST /api/v1/files/:id/distribute` - 分发文件

### WebSocket

- `WS /ws` - WebSocket 连接，用于 Agent 注册和实时日志

## 开发

### 项目结构

```
cloud-agent/
├── cmd/
│   ├── cloud/          # Cloud 服务入口
│   ├── agent/          # Agent 服务入口
│   └── cli/            # CLI 工具
├── internal/
│   ├── cloud/          # Cloud 服务核心代码
│   ├── agent/          # Agent 核心代码
│   └── common/         # 共享代码
├── ui/                 # React 前端
├── configs/            # 配置文件
├── deployments/        # 部署文件
└── docs/              # 文档
```

### 构建

```bash
# 构建 Cloud
go build -o bin/cloud ./cmd/cloud

# 构建 Agent
go build -o bin/agent ./cmd/agent

# 构建 CLI
go build -o bin/cloudctl ./cmd/cli

# 构建 UI
cd ui && npm run build
```

## 许可证

MIT License

