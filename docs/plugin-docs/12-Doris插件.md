# Doris 插件使用指南

## 概述

Doris 插件提供 Apache Doris 分析型数据库的 MPP 查询和数据导入功能。

## 任务类型

`doris`

## 功能特性

- ✅ MPP 查询
- ✅ 数据导入
- ✅ 表管理
- ✅ 批量操作

## 配置示例

```yaml
plugins:
  - type: doris
    enabled: true
    config:
      connections:
        - name: default
          host: localhost
          port: 9030
          database: test
          username: root
          secret_ref: doris-password
```

## 使用示例

### 查询数据

```json
{
  "type": "doris",
  "command": "SELECT * FROM sales WHERE date >= '2024-01-01' ORDER BY amount DESC LIMIT 100;",
  "params": {
    "connection": "default",
    "database": "analytics"
  }
}
```

### 插入数据

```json
{
  "type": "doris",
  "command": "INSERT INTO sales (date, product_id, amount) VALUES ('2024-01-01', 123, 1000);",
  "params": {
    "connection": "default",
    "database": "analytics"
  }
}
```

## 相关文档

- [Apache Doris 官方文档](https://doris.apache.org/docs/)
- [开发指南](../5-开发指南.md)
