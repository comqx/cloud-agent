# ClickHouse 插件使用指南

## 概述

ClickHouse 插件提供 ClickHouse 分析型数据库的高性能查询和数据导入功能。

## 任务类型

`clickhouse`

## 功能特性

- ✅ 高性能查询
- ✅ 批量插入
- ✅ 数据导入
- ✅ DDL 操作

## 配置示例

```yaml
plugins:
  - type: clickhouse
    enabled: true
    config:
      connections:
        - name: default
          host: localhost
          port: 9000
          database: default
          username: default
          secret_ref: clickhouse-password
```

## 使用示例

### 查询数据

```json
{
  "type": "clickhouse",
  "command": "SELECT * FROM events WHERE date >= '2024-01-01' LIMIT 100;",
  "params": {
    "connection": "default",
    "database": "analytics"
  }
}
```

### 批量插入

```json
{
  "type": "clickhouse",
  "command": "INSERT INTO events (date, user_id, event_type) VALUES ('2024-01-01', 123, 'click');",
  "params": {
    "connection": "default",
    "database": "analytics",
    "exec_options": {
      "trans_batch_size": 1000
    }
  }
}
```

## 相关文档

- [ClickHouse 官方文档](https://clickhouse.com/docs/)
- [开发指南](../5-开发指南.md)
