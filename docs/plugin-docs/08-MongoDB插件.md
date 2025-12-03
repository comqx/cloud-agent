# MongoDB 插件使用指南

## 概述

MongoDB 插件提供 MongoDB 数据库的文档操作功能，支持 CRUD、聚合查询和索引管理。

## 任务类型

`mongo`

## 功能特性

- ✅ 文档 CRUD 操作
- ✅ 聚合查询
- ✅ 索引管理
- ✅ 批量操作

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | MongoDB 操作 JSON |
| `params` | object | 是 | 连接参数 |

## 配置示例

```yaml
plugins:
  - type: mongo
    enabled: true
    config:
      connections:
        - name: default
          host: localhost
          port: 27017
          database: test
          username: admin
          secret_ref: mongo-password
```

## 使用示例

### 插入文档

```json
{
  "type": "mongo",
  "command": "{\"operation\": \"insert\", \"collection\": \"users\", \"documents\": [{\"name\": \"John\", \"email\": \"john@example.com\"}]}",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

### 查询文档

```json
{
  "type": "mongo",
  "command": "{\"operation\": \"find\", \"collection\": \"users\", \"filter\": {\"status\": \"active\"}, \"limit\": 10}",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

### 更新文档

```json
{
  "type": "mongo",
  "command": "{\"operation\": \"update\", \"collection\": \"users\", \"filter\": {\"_id\": \"123\"}, \"update\": {\"$set\": {\"status\": \"inactive\"}}}",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

### 聚合查询

```json
{
  "type": "mongo",
  "command": "{\"operation\": \"aggregate\", \"collection\": \"orders\", \"pipeline\": [{\"$group\": {\"_id\": \"$user_id\", \"total\": {\"$sum\": \"$amount\"}}}]}",
  "params": {
    "connection": "default",
    "database": "test_db"
  }
}
```

## 相关文档

- [MongoDB 官方文档](https://docs.mongodb.com/)
- [开发指南](../5-开发指南.md)
