# MySQL 插件使用指南

## 概述

MySQL 插件通过集成 [goInception](https://github.com/hanchuanchuan/goInception) 提供 SQL 审核、执行、备份和回滚功能。支持多数据库连接配置和事务批量执行。

## 任务类型

`mysql`

## 功能特性

- ✅ SQL 语法审核（通过 goInception）
- ✅ 自动备份（生成回滚 SQL）
- ✅ 事务批量执行
- ✅ 多数据库连接管理
- ✅ 执行超时控制
- ✅ 详细的执行日志

## 前置条件

需要部署 goInception 服务：

```bash
docker pull hanchuanchuan/goinception
docker run -d -p 4000:4000 hanchuanchuan/goinception
```

## 参数说明

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | 要执行的 SQL 语句 |
| `params` | object | 是 | 执行参数配置 |

### params 对象结构

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `connection` | string | 是 | 连接名称（在配置文件中定义） |
| `database` | string | 否 | 目标数据库名 |
| `exec_options` | object | 否 | 执行选项 |
| `metadata` | object | 否 | 元数据信息 |

### exec_options 对象

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `trans_batch_size` | int | 200 | 事务批量大小 |
| `backup` | boolean | true | 是否备份（生成回滚 SQL） |
| `timeout_ms` | int | 600000 | 超时时间（毫秒） |

## 配置示例

### agent-plugins.yaml

```yaml
plugins:
  - type: mysql
    enabled: true
    config:
      goinception_url: http://localhost:4000
      connections:
        - name: default
          host: localhost
          port: 3306
          user: root
          secret_ref: mysql-password  # 密钥引用
          database: test
        
        - name: production
          host: prod-mysql.example.com
          port: 3306
          user: app_user
          secret_ref: prod-mysql-password
          database: app_db
```

## 使用示例

### 示例 1: 简单查询

**任务参数：**
```json
{
  "type": "mysql",
  "command": "SELECT * FROM users WHERE status = 'active' LIMIT 10;",
  "params": {
    "connection": "default",
    "database": "test"
  }
}
```

### 示例 2: 插入数据

**任务参数：**
```json
{
  "type": "mysql",
  "command": "INSERT INTO users (name, email, status) VALUES ('John Doe', 'john@example.com', 'active');",
  "params": {
    "connection": "default",
    "database": "test",
    "exec_options": {
      "backup": true,
      "timeout_ms": 30000
    }
  }
}
```

### 示例 3: 批量更新

**任务参数：**
```json
{
  "type": "mysql",
  "command": "UPDATE users SET status = 'inactive' WHERE last_login < '2024-01-01';\nUPDATE orders SET status = 'archived' WHERE created_at < '2024-01-01';",
  "params": {
    "connection": "production",
    "database": "app_db",
    "exec_options": {
      "trans_batch_size": 500,
      "backup": true,
      "timeout_ms": 600000
    },
    "metadata": {
      "env": "production",
      "creator": "admin",
      "ticket": "JIRA-1234"
    }
  }
}
```

### 示例 4: DDL 操作

**任务参数：**
```json
{
  "type": "mysql",
  "command": "ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email;\nCREATE INDEX idx_phone ON users(phone);",
  "params": {
    "connection": "default",
    "database": "test",
    "exec_options": {
      "backup": true
    }
  }
}
```

### 示例 5: 复杂查询

**任务参数：**
```json
{
  "type": "mysql",
  "command": "SELECT u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_amount\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at >= '2024-01-01'\nGROUP BY u.id\nHAVING order_count > 5\nORDER BY total_amount DESC\nLIMIT 100;",
  "params": {
    "connection": "production",
    "database": "app_db"
  }
}
```

## goInception 审核规则

goInception 会自动审核 SQL，常见的审核规则包括：

1. **禁止全表更新/删除**：必须带 WHERE 条件
2. **禁止删除主键**：不允许删除表的主键
3. **字段类型检查**：检查字段类型是否合理
4. **索引建议**：对于大表操作建议添加索引
5. **字符集检查**：检查字符集是否一致

## 备份和回滚

### 自动备份

当 `exec_options.backup` 为 `true` 时，goInception 会自动生成回滚 SQL：

```sql
-- 原始 SQL
UPDATE users SET status = 'inactive' WHERE id = 1;

-- 自动生成的回滚 SQL
UPDATE users SET status = 'active' WHERE id = 1;
```

### 查看回滚 SQL

回滚 SQL 会包含在任务执行结果中，可以通过任务日志查看。

### 执行回滚

如需回滚，创建新任务并执行回滚 SQL：

```json
{
  "type": "mysql",
  "command": "-- 从任务日志中复制的回滚 SQL\nUPDATE users SET status = 'active' WHERE id = 1;",
  "params": {
    "connection": "default",
    "database": "test"
  }
}
```

## 常见问题

### 1. 连接 goInception 失败

**错误信息：**
```
Error: failed to connect to goInception: dial tcp localhost:4000: connection refused
```

**解决方案：**
- 检查 goInception 服务是否启动
- 确认 `goinception_url` 配置正确
- 检查网络连接

### 2. SQL 审核不通过

**错误信息：**
```
Error: SQL audit failed: [Warning] 不建议对表进行全表更新
```

**解决方案：**
- 添加 WHERE 条件限制更新范围
- 调整 goInception 审核规则
- 使用批量更新减小影响范围

### 3. 数据库连接失败

**错误信息：**
```
Error: failed to connect to database: Access denied for user 'root'@'localhost'
```

**解决方案：**
- 检查数据库连接配置
- 验证用户名和密码
- 确认数据库访问权限

## 最佳实践

### 1. 使用事务批量执行

对于大量数据更新，使用 `trans_batch_size` 控制批量大小：

```json
{
  "exec_options": {
    "trans_batch_size": 500
  }
}
```

### 2. 生产环境必须备份

```json
{
  "exec_options": {
    "backup": true
  }
}
```

### 3. 添加元数据信息

```json
{
  "metadata": {
    "env": "production",
    "creator": "admin",
    "ticket": "JIRA-1234",
    "description": "清理过期数据"
  }
}
```

### 4. 设置合理的超时时间

```json
{
  "exec_options": {
    "timeout_ms": 600000  // 10 分钟
  }
}
```

### 5. 先在测试环境验证

在生产环境执行前，先在测试环境验证 SQL：

1. 使用测试数据库连接
2. 验证 SQL 语法和逻辑
3. 检查执行结果
4. 确认无误后再在生产环境执行

## 相关文档

- [goInception 文档](https://github.com/hanchuanchuan/goInception)
- [开发指南](../5-开发指南.md)
