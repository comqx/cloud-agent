# Elasticsearch 插件使用指南

## 概述

Elasticsearch 插件提供 Elasticsearch 搜索引擎的索引管理和文档操作功能。

## 任务类型

`elasticsearch`

## 功能特性

- ✅ 索引管理
- ✅ 文档 CRUD
- ✅ 批量操作
- ✅ 搜索查询

## 参数说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | Elasticsearch DSL JSON |
| `params` | object | 是 | 连接参数 |

## 配置示例

```yaml
plugins:
  - type: elasticsearch
    enabled: true
    config:
      connections:
        - name: default
          addresses:
            - http://localhost:9200
          username: elastic
          secret_ref: es-password
```

## 使用示例

### 批量导入

```json
{
  "type": "elasticsearch",
  "command": "{\"operation\": \"bulk\", \"index\": \"products\", \"actions\": [{\"index\": {\"_source\": {\"name\": \"Product 1\", \"price\": 100}}}]}",
  "params": {
    "connection": "default"
  }
}
```

### 搜索查询

```json
{
  "type": "elasticsearch",
  "command": "{\"operation\": \"search\", \"index\": \"products\", \"query\": {\"match\": {\"name\": \"Product\"}}}",
  "params": {
    "connection": "default"
  }
}
```

## 相关文档

- [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [开发指南](../5-开发指南.md)
