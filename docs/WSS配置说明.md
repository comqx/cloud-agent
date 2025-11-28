# WSS 协议配置说明

本文档说明如何配置和使用 WSS（WebSocket Secure）协议进行云上云下通信。

## 概述

WSS 是 WebSocket 的安全版本，使用 TLS/SSL 加密传输层数据，保证通信安全。本项目支持使用自签证书配置 WSS。

## 快速开始

### 1. 生成自签证书

使用提供的脚本生成自签证书：

```bash
# 给脚本添加执行权限
chmod +x scripts/generate-cert.sh

# 生成证书（默认生成到 ./certs 目录，证书域名 localhost）
./scripts/generate-cert.sh

# 或者指定证书目录和域名/IP
./scripts/generate-cert.sh ./certs example.com
./scripts/generate-cert.sh ./certs 192.168.1.100
```

生成的证书文件：
- `server.crt` - 证书文件
- `server.key` - 私钥文件

### 2. 启动 Cloud 服务（启用 WSS）

```bash
# 使用证书启动服务
./bin/cloud -addr :8080 \
  -cert ./certs/server.crt \
  -key ./certs/server.key \
  -db ./data/cloud.db \
  -storage ./data/files
```

或者通过环境变量配置：

```bash
export CERT_FILE=./certs/server.crt
export KEY_FILE=./certs/server.key
```

### 3. 启动 Agent（连接 WSS）

Agent 会自动根据 Cloud URL 的协议选择 WS 或 WSS：

```bash
# 使用 HTTPS URL，自动使用 WSS
./bin/agent -cloud https://cloud.example.com:8080

# 对于自签证书，Agent 默认会跳过证书验证
# 如果需要严格验证证书，设置环境变量：
export WS_SKIP_VERIFY=false
```

**注意**：默认情况下，Agent 会跳过证书验证（`WS_SKIP_VERIFY=true`），这对于自签证书是必要的。如果使用受信任的 CA 签发的证书，可以设置 `WS_SKIP_VERIFY=false` 启用证书验证。

### 4. 前端配置

前端会自动根据页面协议（HTTP/HTTPS）选择 WS/WSS。如果页面使用 HTTPS，WebSocket 会自动使用 WSS。

也可以通过环境变量配置：

```bash
# 在 .env 文件中配置
VITE_WS_URL=wss://cloud.example.com:8080/ws
```

## 配置选项

### Cloud 服务配置

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `-cert` | TLS 证书文件路径 | 无（禁用 TLS） | `-cert ./certs/server.crt` |
| `-key` | TLS 私钥文件路径 | 无（禁用 TLS） | `-key ./certs/server.key` |
| `-addr` | 服务器监听地址 | `:8080` | `-addr :8443` |

**启用 TLS 的条件**：必须同时提供 `-cert` 和 `-key` 参数，否则使用普通 HTTP/WS。

### Agent 客户端配置

| 环境变量 | 说明 | 默认值 | 示例 |
|----------|------|--------|------|
| `WS_SKIP_VERIFY` | 是否跳过 TLS 证书验证 | `true`（自签证书） | `export WS_SKIP_VERIFY=false` |

**注意**：
- 对于自签证书，必须设置 `WS_SKIP_VERIFY=true` 或保持默认值
- 对于受信任的 CA 证书，可以设置 `WS_SKIP_VERIFY=false` 启用严格验证

### 前端配置

| 环境变量 | 说明 | 默认值 | 示例 |
|----------|------|--------|------|
| `VITE_WS_URL` | WebSocket 连接 URL | 根据页面协议自动判断 | `VITE_WS_URL=wss://example.com/ws` |

## 部署示例

### Docker Compose 配置

```yaml
services:
  cloud:
    build:
      context: ..
      dockerfile: Dockerfile.cloud
    ports:
      - "8080:8080"
      - "8443:8443"  # HTTPS/WSS 端口
    volumes:
      - ./certs:/app/certs:ro  # 挂载证书目录
      - cloud-data:/app/data
    command: 
      - "./cloud"
      - "-addr"
      - ":8443"
      - "-cert"
      - "/app/certs/server.crt"
      - "-key"
      - "/app/certs/server.key"
      - "-db"
      - "/app/data/cloud.db"
      - "-storage"
      - "/app/data/files"
    environment:
      - DB_PATH=/app/data/cloud.db
      - FILE_STORAGE=/app/data/files

  agent:
    build:
      context: ..
      dockerfile: Dockerfile.agent
    environment:
      - CLOUD_URL=https://cloud:8443  # 使用 HTTPS，自动使用 WSS
      - WS_SKIP_VERIFY=true  # 跳过证书验证（自签证书）
      - AGENT_ID=${AGENT_ID:-}
      - AGENT_NAME=${AGENT_NAME:-agent-1}
```

### Kubernetes 配置

在 Kubernetes 中，可以通过 ConfigMap 和 Secret 管理证书：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloud-tls-cert
type: Opaque
data:
  server.crt: <base64-encoded-cert>
  server.key: <base64-encoded-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud
spec:
  template:
    spec:
      containers:
      - name: cloud
        command:
          - "./cloud"
          - "-addr"
          - ":8443"
          - "-cert"
          - "/etc/tls/server.crt"
          - "-key"
          - "/etc/tls/server.key"
        volumeMounts:
        - name: tls-cert
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls-cert
        secret:
          secretName: cloud-tls-cert
```

## 安全建议

1. **生产环境**：建议使用受信任的 CA 签发的证书（如 Let's Encrypt），而不是自签证书
2. **证书管理**：
   - 定期更新证书
   - 妥善保管私钥文件（权限 600）
   - 不要将私钥提交到代码仓库
3. **网络隔离**：在内网环境中，自签证书是可行的选择
4. **证书验证**：生产环境应启用证书验证（`WS_SKIP_VERIFY=false`）

## 故障排查

### Agent 无法连接到 Cloud

1. 检查 Cloud URL 是否正确（使用 `https://` 会自动使用 WSS）
2. 检查证书文件路径是否正确
3. 对于自签证书，确保 `WS_SKIP_VERIFY=true` 或未设置（默认跳过验证）

### 前端 WebSocket 连接失败

1. 如果使用自签证书，浏览器会显示安全警告，需要手动接受证书
2. 检查 `VITE_WS_URL` 环境变量配置是否正确
3. 确保页面协议（HTTP/HTTPS）与 WebSocket 协议（WS/WSS）匹配

### 证书错误

1. 确保证书和私钥文件匹配
2. 检查证书是否过期
3. 验证证书的域名/IP 是否与服务器地址匹配

## 测试

### 测试 WSS 连接

```bash
# 使用 wscat 测试（需要安装：npm install -g wscat）
wscat -c wss://localhost:8443/ws --no-check

# 或使用 openssl 测试 TLS 连接
openssl s_client -connect localhost:8443 -showcerts
```

## 相关文件

- 证书生成脚本：`scripts/generate-cert.sh`
- Cloud 服务：`cmd/cloud/main.go`
- Agent 客户端：`internal/agent/client/client.go`
- 前端 WebSocket：`cloud-ui/src/services/websocket.ts`

