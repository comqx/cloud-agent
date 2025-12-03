# Redis 插件使用指南

## 概述

Redis 插件提供 Redis 缓存数据库的键值操作功能。

## 任务类型

`redis`

## 功能特性

- ✅ 键值操作（GET/SET/DEL）
- ✅ 批量操作
- ✅ 过期时间设置
- ✅ 数据类型操作（String/Hash/List/Set/ZSet）

## 配置示例

```yaml
plugins:
  - type: redis
    enabled: true
    config:
      connections:
        - name: default
          host: localhost
          port: 6379
          password: ""
          db: 0
```

## 使用示例

### 设置键值

```json
{
  "type": "redis",
  "command": "SET mykey myvalue",
  "params": {
    "connection": "default"
  }
}
```

### 获取键值

```json
{
  "type": "redis",
  "command": "GET mykey",
  "params": {
    "connection": "default"
  }
}
```

### 设置过期时间

```json
{
  "type": "redis",
  "command": "SETEX mykey 3600 myvalue",
  "params": {
    "connection": "default"
  }
}
```

## 相关文档

- [Redis 官方文档](https://redis.io/documentation)
- [开发指南](../5-开发指南.md)
