# Shell 插件

Shell 插件用于在 Agent 所在主机上执行 Shell 命令。它是最基础也是最强大的插件，支持执行任意合法的 Shell 指令（受安全策略限制）。

## 功能简介

- 支持执行系统命令和 Shell 脚本
- 支持实时日志输出（stdout 和 stderr）
- 内置安全审计和命令拦截机制
- 自动超时控制

## Cloud API 调用说明

任务通过 Cloud API 下发，由 Agent 接收并执行。

- **接口地址**: `POST /api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent_id` | string | 是 | 目标 Agent ID |
| `type` | string | 是 | 任务类型，固定值为 `"shell"` |
| `command` | string | 是 | 要执行的 Shell 命令 |
| `params` | object | 否 | 扩展参数（目前无特定参数） |
| `sync` | bool | 否 | 是否同步等待结果，默认 `false` |
| `timeout` | int | 否 | 超时时间（秒），默认 1800（30分钟） |

### 安全机制

Shell 插件集成了严格的安全控制：
1. **命令验证**：执行前会经过 `CommandValidator` 校验，禁止执行高危命令（如 `rm -rf /` 等，具体取决于安全配置）。
2. **审计日志**：所有执行的命令及其结果都会被记录到审计日志中。
3. **权限控制**：命令以 Agent 进程的权限运行，建议不要以 root 身份运行 Agent。

## 使用示例

### 示例 1：查看系统负载

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "uptime"
}
```

### 示例 2：查看磁盘空间

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "df -h"
}
```

### 示例 3：执行复合命令

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "ls -la /var/log | grep error | tail -n 10"
}
```

### 示例 4：执行带参数的命令

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "echo 'Hello World' > /tmp/test.txt && cat /tmp/test.txt"
}
```

## 返回结果

执行成功后，`result` 字段将包含命令的标准输出（Stdout）和标准错误（Stderr）的组合内容。

响应示例（`result` 字段内容）：

```text
Filesystem      Size  Used Avail Use% Mounted on
overlay         100G   20G   80G  20% /
tmpfs            64M     0   64M   0% /dev
/dev/vda1       100G   20G   80G  20% /etc/hosts
```

如果命令执行失败（退出码非 0），任务状态将被标记为失败，并返回错误信息。
