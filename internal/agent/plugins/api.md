# API 插件

API 插件用于执行 HTTP 请求，支持 GET、POST、PUT、DELETE 等各种 HTTP 方法，常用于与其他系统进行集成或触发 Webhook。

## 功能简介

- 支持自定义 HTTP 方法（GET, POST, PUT, DELETE, PATCH 等）
- 支持自定义请求头（Headers）
- 支持 JSON 对象或原始字符串作为请求体（Body）
- 自动处理 Content-Type
- 支持 HTTPS 和 SSL 验证配置

## Cloud API 调用说明

任务通过 Cloud API 下发，由 Agent 接收并执行。

- **接口地址**: `POST /api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent_id` | string | 是 | 目标 Agent ID |
| `type` | string | 是 | 任务类型，固定值为 `"api"` |
| `command` | string | 否 | HTTP 请求方法，默认为 `"GET"` (e.g., `"POST"`, `"PUT"`) |
| `params` | object | 是 | 请求详细参数，见下表 |
| `sync` | bool | 否 | 是否同步等待结果，默认 `false` |
| `timeout` | int | 否 | 超时时间（秒），默认 30 |

### Params 参数说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标 URL 地址 |
| `headers` | object | 否 | HTTP 请求头，键值对形式 |
| `body` | object/string | 否 | 请求体，可以是 JSON 对象或字符串 |

## 使用示例

### 示例 1：简单 GET 请求

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "GET",
  "params": {
    "url": "https://api.example.com/health"
  }
}
```

### 示例 2：POST JSON 数据

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://api.example.com/users",
    "headers": {
      "Authorization": "Bearer token-xxx"
    },
    "body": {
      "username": "testuser",
      "email": "test@example.com"
    }
  }
}
```

### 示例 3：POST 原始字符串数据

```json
{
  "agent_id": "agent-123",
  "type": "api",
  "command": "POST",
  "params": {
    "url": "https://webhook.example.com/alert",
    "headers": {
      "Content-Type": "text/plain"
    },
    "body": "Alert: CPU usage high"
  }
}
```

## 返回结果

执行成功后，`result` 字段将包含格式化的响应内容（状态码、响应头和响应体）。

响应示例（`result` 字段内容）：

```text
Status: 200 OK HTTP/2.0
Headers:
  Content-Type: application/json; charset=utf-8
  Date: Thu, 01 Jan 2024 00:00:00 GMT

Body:
{"status": "success", "data": {...}}
```
