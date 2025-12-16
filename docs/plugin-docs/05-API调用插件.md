# API 调用插件使用指南

## 概述

API 调用插件提供 HTTP/HTTPS 请求功能，支持 GET、POST、PUT、DELETE 等方法，可用于调用外部 API、Webhook 通知等场景。

## 任务类型

`api`

## 功能特性

- ✅ 支持所有 HTTP 方法（GET、POST、PUT、DELETE、PATCH 等）
- ✅ 自定义请求头
- ✅ JSON/Form 请求体
- ✅ 超时控制
- ✅ SSL 证书验证
- ✅ 响应状态码检查

## 参数说明

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | HTTP 方法（GET/POST/PUT/DELETE/PATCH） |
| `params` | object | 是 | 请求参数 |

### params 对象结构

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `url` | string | 是 | 请求 URL |
| `headers` | object | 否 | 请求头 |
| `body` | object | 否 | 请求体（POST/PUT/PATCH） |
| `timeout` | int | 否 | 超时时间（秒），默认 30 |
| `verify_ssl` | boolean | 否 | 是否验证 SSL 证书，默认 true |

## 配置示例

### agent-plugins.yaml

```yaml
plugins:
  - type: api
    enabled: true
    config:
      timeout: 30
      verify_ssl: true
```

## 使用示例

### 示例 1: GET 请求

**任务参数：**
```json
{
  "type": "api",
  "command": "GET",
  "params": {
    "url": "https://api.example.com/users",
    "headers": {
      "Authorization": "Bearer your-token",
      "Content-Type": "application/json"
    }
  }
}
```

### 示例 2: POST 请求（JSON）

**任务参数：**
```json
{
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://api.example.com/users",
    "headers": {
      "Authorization": "Bearer your-token",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    }
  }
}
```

### 示例 3: PUT 请求

**任务参数：**
```json
{
  "type": "api",
  "command": "PUT",
  "params": {
    "url": "https://api.example.com/users/123",
    "headers": {
      "Authorization": "Bearer your-token",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
}
```

### 示例 4: DELETE 请求

**任务参数：**
```json
{
  "type": "api",
  "command": "DELETE",
  "params": {
    "url": "https://api.example.com/users/123",
    "headers": {
      "Authorization": "Bearer your-token"
    }
  }
}
```

### 示例 5: Webhook 通知

**任务参数：**
```json
{
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "text": "Deployment completed successfully!",
      "channel": "#deployments",
      "username": "Cloud UI Bot"
    }
  }
}
```

### 示例 6: 带查询参数的 GET 请求

**任务参数：**
```json
{
  "type": "api",
  "command": "GET",
  "params": {
    "url": "https://api.example.com/users?page=1&limit=10&status=active",
    "headers": {
      "Authorization": "Bearer your-token"
    }
  }
}
```

### 示例 7: 自签名证书（跳过验证）

**任务参数：**
```json
{
  "type": "api",
  "command": "GET",
  "params": {
    "url": "https://internal-api.example.com/status",
    "verify_ssl": false,
    "timeout": 60
  }
}
```

## 常见场景

### 1. 触发 CI/CD 流水线

```json
{
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://gitlab.example.com/api/v4/projects/123/trigger/pipeline",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "token": "your-trigger-token",
      "ref": "main",
      "variables": {
        "ENV": "production",
        "VERSION": "v1.0.0"
      }
    }
  }
}
```

### 2. 发送钉钉通知

```json
{
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "msgtype": "text",
      "text": {
        "content": "部署完成！环境：生产环境，版本：v1.0.0"
      }
    }
  }
}
```

### 3. 调用微服务 API

```json
{
  "type": "api",
  "command": "POST",
  "params": {
    "url": "http://user-service:8080/api/v1/users/sync",
    "headers": {
      "Content-Type": "application/json",
      "X-Request-ID": "req-12345"
    },
    "body": {
      "source": "external",
      "batch_size": 1000
    },
    "timeout": 300
  }
}
```

### 4. 健康检查

```json
{
  "type": "api",
  "command": "GET",
  "params": {
    "url": "http://app-service:8080/health",
    "timeout": 5
  }
}
```

## 响应处理

### 成功响应

任务结果会包含：
- HTTP 状态码
- 响应头
- 响应体

**示例输出：**
```json
{
  "status_code": 200,
  "headers": {
    "Content-Type": "application/json",
    "X-Request-ID": "abc-123"
  },
  "body": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### 错误响应

**4xx 客户端错误：**
```json
{
  "status_code": 404,
  "error": "Not Found",
  "message": "User not found"
}
```

**5xx 服务器错误：**
```json
{
  "status_code": 500,
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```

## 常见问题

### 1. 连接超时

**错误信息：**
```
Error: request timeout: context deadline exceeded
```

**解决方案：**
- 增加 `timeout` 参数值
- 检查网络连接
- 确认目标服务是否可达

### 2. SSL 证书验证失败

**错误信息：**
```
Error: x509: certificate signed by unknown authority
```

**解决方案：**
- 设置 `verify_ssl: false`（仅用于开发环境）
- 或者添加 CA 证书到系统信任列表

### 3. 认证失败

**错误信息：**
```
Error: 401 Unauthorized
```

**解决方案：**
- 检查 Authorization 头是否正确
- 确认 token 是否有效
- 验证 API 密钥是否正确

## 最佳实践

### 1. 使用环境变量存储敏感信息

不要在参数中硬编码 token 和密钥：

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

### 2. 设置合理的超时时间

```json
{
  "timeout": 30  // 根据 API 响应时间调整
}
```

### 3. 添加请求 ID

```json
{
  "headers": {
    "X-Request-ID": "tiangong-deploy-${TASK_ID}",
    "X-Source": "tiangong-deploy"
  }
}
```

### 4. 错误重试

对于重要的 API 调用，可以配置任务失败后自动重试。

### 5. 记录详细日志

API 调用会自动记录请求和响应详情到任务日志。

## 安全建议

1. **HTTPS 优先**：生产环境使用 HTTPS
2. **验证 SSL 证书**：不要在生产环境禁用 SSL 验证
3. **保护敏感信息**：使用密钥管理系统存储 token
4. **限制访问**：配置防火墙规则限制 Agent 的网络访问
5. **审计日志**：定期检查 API 调用日志

## 相关文档

- [开发指南](../5-开发指南.md)
