# Cloud Agent MCP Tools

将 Cloud 执行任务相关的接口转换为 MCP (Model Context Protocol) tools，供 AI 调用。

## 功能

本 MCP 服务器提供了以下工具：

1. **execute_shell_command** - 在指定的 Agent 节点上执行 Shell 命令
2. **execute_api_request** - 通过 Agent 节点执行 HTTP/HTTPS 请求
3. **execute_k8s_operation** - 操作 Kubernetes 集群中的资源
4. **execute_mysql_query** - 执行 MySQL SQL 语句
5. **execute_postgres_query** - 执行 PostgreSQL SQL 语句
6. **upload_file** - 上传文件到 Cloud 服务
7. **get_task_status** - 查询任务状态
8. **get_task_logs** - 获取任务执行日志
9. **list_agents** - 列出所有可用的 Agent 节点

## 安装

```bash
pip install -r requirements.txt
```

## 配置

通过环境变量 `CLOUD_API_URL` 配置 Cloud API 的基础 URL，默认为 `http://localhost:8080/api/v1`。

```bash
export CLOUD_API_URL=http://your-cloud-server:8080/api/v1
```

## 使用

### 作为 MCP 服务器运行

```bash
python cloud_tasks.py
```

### 在 Claude Desktop 中配置

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "cloud-tasks": {
      "command": "python",
      "args": ["/path/to/cloud_tasks.py"],
      "env": {
        "CLOUD_API_URL": "http://localhost:8080/api/v1"
      }
    }
  }
}
```

## 工具说明

### execute_shell_command

在指定的 Agent 节点上执行 Shell 命令。

**参数：**
- `agent_id` (string, 必填): Agent 节点 ID
- `command` (string, 必填): 要执行的 Shell 命令
- `params` (object, 可选): 额外参数
- `file_id` (string, 可选): 关联的文件 ID
- `sync` (boolean, 可选): 是否同步等待任务完成，默认 false
- `timeout` (integer, 可选): 同步模式超时时间（秒），默认 60，最大 300

### execute_api_request

通过 Agent 节点执行 HTTP/HTTPS 请求。

**参数：**
- `agent_id` (string, 必填): Agent 节点 ID
- `url` (string, 必填): 请求的目标 URL
- `method` (string, 可选): HTTP 方法，默认为 GET
- `headers` (object, 可选): HTTP 请求头
- `body` (string/object, 可选): 请求体
- `sync` (boolean, 可选): 是否同步等待任务完成，默认 false
- `timeout` (integer, 可选): 同步模式超时时间（秒），默认 60，最大 300

### execute_k8s_operation

操作 Kubernetes 集群中的资源。

**参数：**
- `agent_id` (string, 必填): Agent 节点 ID
- `resource_config` (string, 必填): Kubernetes 资源的 YAML 或 JSON 配置内容
- `operation` (string, 可选): 操作类型（create/update/delete/patch/apply），默认 apply
- `namespace` (string, 可选): 命名空间
- `patch_type` (string, 可选): 补丁类型（strategic/merge/json），默认 strategic
- `file_id` (string, 可选): 关联的文件 ID
- `sync` (boolean, 可选): 是否同步等待任务完成，默认 false
- `timeout` (integer, 可选): 同步模式超时时间（秒），默认 60，最大 300

### execute_mysql_query

执行 MySQL SQL 语句。

**参数：**
- `agent_id` (string, 必填): Agent 节点 ID
- `sql` (string, 可选): SQL 语句（如果提供了 file_id，则从文件读取）
- `target` (object, 可选): 目标数据库连接信息
  - `host` (string, 必填): 数据库主机
  - `port` (integer, 可选): 端口，默认 3306
  - `user` (string, 可选): 用户名
  - `password` (string, 可选): 密码
  - `db` (string, 可选): 数据库名
- `connection` (string, 可选): 使用配置文件中的连接名
- `database` (string, 可选): 数据库名
- `file_id` (string, 可选): SQL 文件 ID
- `exec_options` (object, 可选): 执行选项
- `metadata` (object, 可选): 审计元数据
- `sync` (boolean, 可选): 是否同步等待任务完成，默认 false
- `timeout` (integer, 可选): 同步模式超时时间（秒），默认 60，最大 300

### execute_postgres_query

执行 PostgreSQL SQL 语句。

**参数：**
- `agent_id` (string, 必填): Agent 节点 ID
- `sql` (string, 可选): SQL 语句（如果提供了 file_id，则从文件读取）
- `target` (object, 可选): 目标数据库连接信息
  - `host` (string, 必填): 数据库主机
  - `port` (integer, 可选): 端口，默认 5432
  - `user` (string, 可选): 用户名，默认 postgres
  - `password` (string, 可选): 密码
  - `database` (string, 可选): 数据库名
  - `sslmode` (string, 可选): SSL 模式，默认 disable
- `connection` (string, 可选): 连接名
- `file_id` (string, 可选): SQL 文件 ID
- `exec_options` (object, 可选): 执行选项
- `sync` (boolean, 可选): 是否同步等待任务完成，默认 false
- `timeout` (integer, 可选): 同步模式超时时间（秒），默认 60，最大 300

### upload_file

上传文件到 Cloud 服务。

**参数：**
- `file_path` (string, 必填): 要上传的文件路径

### get_task_status

查询任务状态。

**参数：**
- `task_id` (string, 必填): 任务 ID

### get_task_logs

获取任务执行日志。

**参数：**
- `task_id` (string, 必填): 任务 ID
- `limit` (integer, 可选): 返回的日志条数，默认 1000

### list_agents

列出所有可用的 Agent 节点。

**参数：** 无

## 示例

### 执行 Shell 命令

```python
# 异步执行
{
  "agent_id": "agent-123",
  "command": "ls -la /tmp",
  "sync": false
}

# 同步执行
{
  "agent_id": "agent-123",
  "command": "echo Hello World",
  "sync": true,
  "timeout": 30
}
```

### 执行 MySQL 查询

```python
{
  "agent_id": "agent-123",
  "sql": "SELECT * FROM users LIMIT 10",
  "target": {
    "host": "mysql-server.example.com",
    "port": 3306,
    "user": "admin",
    "password": "password",
    "db": "test_db"
  },
  "sync": true,
  "timeout": 60
}
```

## 注意事项

1. 所有任务创建接口都支持同步和异步两种模式
2. 同步模式适用于短时间任务（< 30 秒），需要立即获取结果
3. 异步模式适用于长时间运行的任务，需要通过 `get_task_status` 查询任务状态
4. 文件上传后返回的文件 ID 可以用于后续的任务执行
5. 数据库连接信息支持通过 `target` 参数动态传递，也支持通过配置文件中的连接名

## 更多信息

详细的 API 文档请参考 `../docs/3-API文档.md`。

