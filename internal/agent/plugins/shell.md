# Shell 插件

Shell 插件用于在 Agent 所在主机上执行 Shell 命令。它是最基础也是最强大的插件，支持执行任意合法的 Shell 指令（受安全策略限制）。

## 功能简介

- 支持执行系统命令和 Shell 脚本
- 支持实时日志输出（stdout 和 stderr 分离回传）
- 内置安全审计和命令拦截机制（黑白名单）
- 自动超时控制（默认 30 分钟）
- 支持命令取消（通过 context 取消进程）

## Cloud API 调用说明

任务通过 Cloud API 下发，由 Agent 接收并执行。

- **接口地址**: `POST /api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `agent_id` | string | 是 | - | 目标 Agent ID |
| `type` | string | 是 | - | 任务类型，固定值为 `"shell"` |
| `command` | string | 是 | - | 要执行的 Shell 命令 |
| `params` | object | 否 | `{}` | 扩展参数（目前无特定参数，预留字段） |
| `file_id` | string | 否 | - | 关联的文件 ID（预留字段，可用于脚本文件下发场景） |
| `sync` | bool | 否 | `false` | 是否同步等待结果。`true` 时接口会阻塞直到任务完成或超时 |
| `timeout` | int | 否 | `60` | 同步模式超时时间（秒），范围 1-300，超出范围会被修正 |

### 请求参数详细说明

#### `agent_id`（必填）

指定要执行命令的目标 Agent。可通过 `GET /api/v1/agents` 获取可用的 Agent 列表。

#### `type`（必填）

固定值 `"shell"`。

#### `command`（必填）

要执行的 Shell 命令字符串。执行逻辑如下：
- 如果命令以 `/` 开头或包含空格，会通过 `sh -c "<command>"` 执行（支持管道、重定向等 Shell 特性）
- 如果是简单命令（如 `hostname`），直接执行二进制文件

**注意**：命令会先经过安全策略验证，不合规的命令会被拦截（见下方安全机制说明）。

#### `params`（可选）

目前 Shell 插件未定义特定参数。此字段为预留扩展字段，传入后会被忽略。

#### `file_id`（可选）

预留字段，用于关联已上传的文件。当前 Shell 插件未使用此字段。

#### `sync`（可选）

- `false`（默认）：异步模式，接口立即返回任务 ID，可通过 `GET /api/v1/tasks/:id` 轮询结果
- `true`：同步模式，接口阻塞等待命令执行完成，直接返回结果

#### `timeout`（可选）

仅在 `sync=true` 时生效，控制 API 层的等待超时（秒）。注意这与 Agent 内部的命令执行超时（30 分钟）是两个独立的超时机制。

### 安全机制

Shell 插件集成了严格的安全控制，安全策略由 `configs/agent-security.yaml` 配置文件定义：

1. **黑名单检查（优先级最高）**：无论白名单是否启用，黑名单中的命令始终会被拦截。包括但不限于：
   - 危险删除操作（`rm -rf /`）
   - 系统关机/重启（`shutdown`、`reboot`）
   - 磁盘格式化（`mkfs`、`fdisk`）
   - 权限提升（`sudo`、`su`）
   - 命令注入防护（`;`、`&&`、`||`、反引号、`$()` 等）

2. **白名单检查**：当 `command_whitelist_enabled: true` 时，只允许执行白名单中匹配的命令。默认允许的命令类别：
   - 系统信息查询（`hostname`、`uptime`、`date` 等）
   - 文件只读操作（`ls`、`cat`、`head`、`tail`、`grep`、`find`）
   - Docker 只读操作（`docker ps`、`docker logs` 等）
   - Kubernetes 只读操作（`kubectl get`、`kubectl describe` 等）
   - 网络诊断（`ping`、`curl`、`netstat` 等）
   - 进程查看（`ps`、`top`）
   - 磁盘统计（`df`、`du`）

3. **审计日志**：所有命令（无论允许还是被阻止）都会被记录到审计日志中，包括：
   - 命令内容
   - 是否被允许执行
   - 执行结果（成功/失败）
   - 执行耗时

4. **权限控制**：命令以 Agent 进程的系统用户权限运行，建议不要以 root 身份运行 Agent。

## 使用示例

### 示例 1：查看系统负载

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "uptime",
  "sync": true,
  "timeout": 10
}
```

### 示例 2：查看磁盘空间

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "df -h",
  "sync": true,
  "timeout": 10
}
```

### 示例 3：查看文件内容

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "cat /etc/hosts",
  "sync": true,
  "timeout": 10
}
```

### 示例 4：查看日志尾部

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "tail -n 100 /var/log/syslog",
  "sync": true,
  "timeout": 10
}
```

### 示例 5：搜索关键字

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "grep error /var/log/app.log",
  "sync": true,
  "timeout": 15
}
```

### 示例 6：查看网络连接

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "netstat -tlnp",
  "sync": true,
  "timeout": 15
}
```

### 示例 7：HTTP 请求

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "curl -s https://httpbin.org/get",
  "sync": true,
  "timeout": 30
}
```

### 示例 8：会被安全策略拦截的命令

以下命令会被黑名单拦截，返回 `security validation failed` 错误：

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "rm -rf /tmp/data",
  "sync": true,
  "timeout": 10
}
```

> 错误响应示例：`"error": "security validation failed: command not in whitelist: \"rm -rf /tmp/data\""`

## 返回结果

### 异步模式（`sync=false`）

接口返回任务对象，状态为 `pending`：

```json
{
  "id": "task-uuid-xxx",
  "agent_id": "agent-123",
  "type": "shell",
  "command": "uptime",
  "status": "pending",
  "created_at": "2025-01-01T00:00:00Z"
}
```

通过 `GET /api/v1/tasks/:id` 查询最终结果：

```json
{
  "id": "task-uuid-xxx",
  "status": "success",
  "result": " 18:30:00 up 30 days,  5:42,  1 user,  load average: 0.15, 0.10, 0.08\n"
}
```

### 同步模式（`sync=true`）

接口直接返回执行完成的任务对象，`result` 字段包含命令的标准输出和标准错误的组合内容：

```json
{
  "id": "task-uuid-xxx",
  "status": "success",
  "result": "Filesystem      Size  Used Avail Use% Mounted on\noverlay         100G   20G   80G  20% /\ntmpfs            64M     0   64M   0% /dev\n"
}
```

### 执行失败

如果命令执行失败（退出码非 0），任务状态为 `failed`，`result` 中仍可能包含部分输出，`error` 字段包含错误信息：

```json
{
  "id": "task-uuid-xxx",
  "status": "failed",
  "result": "partial output before error...\n",
  "error": "command failed: exit status 1"
}
```

### 实时日志

执行过程中，stdout 内容以 `info` 级别、stderr 内容以 `error` 级别实时回传日志。可通过 `GET /api/v1/tasks/:id/logs` 查看。

## 注意事项

1. **安全配置**：安全配置文件路径可通过环境变量 `AGENT_SECURITY_CONFIG` 指定，默认为 `configs/agent-security.yaml`
2. **超时区分**：API 层 `timeout`（1-300 秒）和 Agent 内部执行超时（30 分钟）是独立的。同步模式下建议设置合理的 `timeout` 值
3. **空行过滤**：stdout 和 stderr 中的纯空白行会被自动过滤，不会出现在 `result` 和日志中
4. **命令执行方式**：包含空格的命令通过 `sh -c` 执行，支持完整的 Shell 语法；简单命令直接执行二进制
5. **并发控制**：Shell 命令受全局并发限制和按类型并发限制控制（由 Manager 配置决定）
