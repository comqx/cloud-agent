# Shell 插件使用指南

## 概述

Shell 插件允许在 Agent 节点上执行 Shell 命令和脚本。支持命令安全验证、实时日志输出和超时控制。

## 任务类型

`shell`

## 功能特性

- ✅ 执行任意 Shell 命令
- ✅ 支持多行脚本执行
- ✅ 实时日志流式输出
- ✅ 命令安全验证（白名单/黑名单）
- ✅ 超时控制（默认 30 分钟）
- ✅ 审计日志记录

## 参数说明

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | 要执行的 Shell 命令或脚本 |

### 配置参数（agent-plugins.yaml）

```yaml
plugins:
  - type: shell
    enabled: true
    config:
      timeout: 1800  # 超时时间（秒），默认 1800 秒（30 分钟）
```

## 使用示例

### 示例 1: 执行简单命令

**任务参数：**
```json
{
  "type": "shell",
  "command": "ls -la /tmp"
}
```

**预期输出：**
```
total 48
drwxrwxrwt  12 root  wheel   384 Dec  3 10:00 .
drwxr-xr-x  20 root  wheel   640 Nov 15 09:30 ..
-rw-r--r--   1 user  wheel  1024 Dec  3 09:45 test.txt
```

### 示例 2: 执行多行脚本

**任务参数：**
```json
{
  "type": "shell",
  "command": "#!/bin/bash\nset -e\necho 'Starting deployment...'\ncd /app\ngit pull origin main\nnpm install\nnpm run build\necho 'Deployment completed!'"
}
```

### 示例 3: 带环境变量的命令

**任务参数：**
```json
{
  "type": "shell",
  "command": "export APP_ENV=production && ./deploy.sh"
}
```

### 示例 4: 管道和重定向

**任务参数：**
```json
{
  "type": "shell",
  "command": "ps aux | grep nginx | grep -v grep | awk '{print $2}'"
}
```

### 示例 5: 条件执行

**任务参数：**
```json
{
  "type": "shell",
  "command": "if [ -f /tmp/lock ]; then echo 'Already running'; exit 1; else touch /tmp/lock && ./run.sh && rm /tmp/lock; fi"
}
```

## 安全配置

Shell 插件支持命令安全验证，通过 `configs/agent-security.yaml` 配置：

### 配置示例

```yaml
shell:
  # 命令白名单（正则表达式）
  whitelist:
    - "^ls\\s+"
    - "^echo\\s+"
    - "^cat\\s+"
    - "^grep\\s+"
    - "^awk\\s+"
    - "^sed\\s+"
    - "^find\\s+"
    - "^ps\\s+"
    - "^df\\s+"
    - "^du\\s+"
    - "^tail\\s+"
    - "^head\\s+"
    - "^git\\s+"
    - "^npm\\s+"
    - "^docker\\s+"
    - "^kubectl\\s+"
  
  # 命令黑名单（正则表达式）
  blacklist:
    - "rm\\s+-rf\\s+/"  # 禁止删除根目录
    - "shutdown"        # 禁止关机
    - "reboot"          # 禁止重启
    - "mkfs"            # 禁止格式化
    - "dd\\s+if="       # 禁止 dd 命令
    - ":(){ :|:& };:"   # 禁止 fork 炸弹
```

### 安全建议

1. **生产环境**：
   - 启用白名单模式，只允许必要的命令
   - 配置严格的黑名单，阻止危险操作
   - 定期审查审计日志

2. **开发环境**：
   - 可以放宽白名单限制
   - 保留核心黑名单规则

3. **审计日志**：
   - 所有命令执行都会记录到审计日志
   - 包括命令内容、执行结果、耗时等信息

## 常见问题

### 1. 命令被安全策略阻止

**错误信息：**
```
Error: security validation failed: command not allowed by whitelist
```

**解决方案：**
- 检查 `agent-security.yaml` 中的白名单配置
- 添加需要的命令到白名单
- 或者调整正则表达式以匹配命令

### 2. 命令超时

**错误信息：**
```
Error: command failed: context deadline exceeded
```

**解决方案：**
- 增加 `agent-plugins.yaml` 中的 timeout 配置
- 优化命令执行效率
- 考虑将长时间任务拆分为多个步骤

### 3. 权限不足

**错误信息：**
```
Error: permission denied
```

**解决方案：**
- 检查 Agent 进程的运行用户权限
- 使用 `sudo` 执行需要特权的命令（需要在白名单中配置）
- 调整文件或目录权限

## 最佳实践

### 1. 使用 set -e 确保错误停止

```bash
#!/bin/bash
set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时报错
set -o pipefail  # 管道中任何命令失败都会导致整个管道失败

echo "Step 1: Backup"
./backup.sh

echo "Step 2: Deploy"
./deploy.sh

echo "Step 3: Verify"
./verify.sh
```

### 2. 添加详细的日志输出

```bash
#!/bin/bash
echo "=== Starting deployment at $(date) ==="
echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"

echo "Step 1: Pulling latest code..."
git pull origin main

echo "Step 2: Installing dependencies..."
npm install

echo "Step 3: Building application..."
npm run build

echo "=== Deployment completed at $(date) ==="
```

### 3. 使用函数提高可读性

```bash
#!/bin/bash

function check_prerequisites() {
    echo "Checking prerequisites..."
    command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }
    command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }
}

function deploy() {
    echo "Starting deployment..."
    git pull origin main
    npm install
    npm run build
}

function verify() {
    echo "Verifying deployment..."
    curl -f http://localhost:3000/health || { echo "Health check failed"; exit 1; }
}

check_prerequisites
deploy
verify
echo "Deployment successful!"
```

### 4. 错误处理和回滚

```bash
#!/bin/bash
set -e

BACKUP_DIR="/tmp/backup-$(date +%Y%m%d-%H%M%S)"

function backup() {
    echo "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    cp -r /app "$BACKUP_DIR/"
}

function rollback() {
    echo "Rolling back..."
    rm -rf /app
    cp -r "$BACKUP_DIR/app" /app
}

trap rollback ERR

backup
./deploy.sh
echo "Deployment successful!"
```

## 相关文档

- [安全配置指南](../4-安全配置.md)
- [开发指南](../5-开发指南.md)
