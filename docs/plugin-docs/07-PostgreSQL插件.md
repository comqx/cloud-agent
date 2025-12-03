# PostgreSQL 插件使用指南

## 概述

PostgreSQL 插件提供 PostgreSQL 数据库的直接连接和 SQL 执行功能，支持事务、查询和数据操作。

## 任务类型

`postgres`

## 功能特性

- ✅ SQL 查询和执行
- ✅ 事务支持
- ✅ 多连接管理
- ✅ 超时控制

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | SQL 语句 |
| `params` | object | 是 | 连接和执行参数 |

### params 结构

```json
{
  "connection": "default",
  "database": "test_db",
  "exec_options": {
    "timeout_ms": 600000
  }
}
```

## 配置示例

```yaml
plugins:
  - type: postgres
    enabled: true
    config:
      connections:
        - name: default
          host: localhost
          port: 5432
          database: test
          username: postgres
          secret_ref: postgres-password
```

## 使用示例

### 查询数据

```json
{
  "type": "postgres",
  "command": "SELECT * FROM users WHERE status = 'active' LIMIT 10;",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

### 插入数据

```json
{
  "type": "postgres",
  "command": "INSERT INTO users (name, email) VALUES ('John', 'john@example.com');",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

### 批量更新

```json
{
  "type": "postgres",
  "command": "UPDATE users SET status = 'inactive' WHERE last_login < '2024-01-01';",
  "params": {
    "connection": "default",
    "database": "test_db",
    "exec_options": {
      "timeout_ms": 300000
    }
  }
}
```

## 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [开发指南](../5-开发指南.md)
