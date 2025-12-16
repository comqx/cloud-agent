# goInception API 使用文档

## 概述

goInception 是一个集 SQL 审核、执行、备份及生成回滚语句于一体的 MySQL 运维工具。本项目中的 MySQL 执行器通过 HTTP API 方式调用 goInception 服务。

## 服务配置

### 启动 goInception 服务

```bash
# 使用 Docker 启动
docker pull hanchuanchuan/goinception
docker run -d -p 4000:4000 hanchuanchuan/goinception
```

默认服务地址：`http://localhost:4000`

### Agent 配置

在 `configs/agent-plugins.yaml` 中配置 goInception 服务地址：

```yaml
- type: mysql
  enabled: true
  config:
    goinception_url: http://localhost:4000
    connections:
      - name: default
        database: test
```

## HTTP API 接口

### 1. SQL 审核和执行接口

**接口地址**: `POST /check`

**请求格式**:

```json
{
  "sql": "SQL语句内容",
  "db_name": "数据库名",
  "backup": "1"  // 是否备份：1-备份，0-不备份（可选，默认为1）
}
```

**请求参数说明**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sql | string | 是 | 要执行的 SQL 语句，支持多语句（用分号分隔） |
| db_name | string | 是 | 目标数据库名称 |
| backup | string | 否 | 是否备份：`"1"` 表示备份，`"0"` 表示不备份。默认值为 `"1"` |

**响应格式**:

```json
{
  "error_code": 0,
  "error_msg": "",
  "data": [
    {
      "order_id": 1,
      "stage": "CHECKED",
      "error_level": 0,
      "stage_status": "Audit completed",
      "error_msg": "",
      "sql": "CREATE TABLE t1(id INT PRIMARY KEY)",
      "affected_rows": 0,
      "sequence": "0_0_0",
      "backup_dbname": "backup_test_20240101",
      "execute_time": "0.001s",
      "sqlhash": "abc123",
      "backup_time": "2024-01-01 10:00:00",
      "rollback_sql": "DROP TABLE IF EXISTS `t1`"
    }
  ]
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| error_code | int | 错误码，0 表示成功 |
| error_msg | string | 错误消息 |
| data | array | SQL 执行结果数组 |
| data[].order_id | int | SQL 语句序号 |
| data[].stage | string | 阶段：`CHECKED`（审核完成）、`EXECUTED`（执行完成） |
| data[].error_level | int | 错误级别：0-正常，1-警告，2-错误 |
| data[].stage_status | string | 阶段状态描述 |
| data[].error_msg | string | 错误消息 |
| data[].sql | string | 执行的 SQL 语句 |
| data[].affected_rows | int | 影响的行数 |
| data[].sequence | string | 执行序列号 |
| data[].backup_dbname | string | 备份数据库名（如果启用了备份） |
| data[].execute_time | string | 执行时间 |
| data[].sqlhash | string | SQL 语句的哈希值 |
| data[].backup_time | string | 备份时间 |
| data[].rollback_sql | string | 回滚 SQL 语句 |

## 数据导出

goInception 本身不直接提供数据导出功能，但可以通过以下方式实现：

### 方式一：通过 SQL 查询导出数据

使用 `SELECT ... INTO OUTFILE` 语句导出数据到文件：

```sql
SELECT * FROM table_name 
INTO OUTFILE '/tmp/export_data.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"' 
LINES TERMINATED BY '\n';
```

**注意事项**:
- 需要 MySQL 用户具有 `FILE` 权限
- 文件路径必须是 MySQL 服务器可访问的路径
- 文件不能已存在

### 方式二：结合 mysqldump 工具

在 Agent 上通过 Shell 执行器调用 `mysqldump` 命令：

```bash
mysqldump -h host -u user -p database_name > /tmp/backup.sql
```

**示例**（通过 Cloud UI 执行）:

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "mysqldump -h 127.0.0.1 -u root -p'password' test_db > /tmp/backup_$(date +%Y%m%d).sql"
}
```

### 方式三：通过 SELECT 查询获取数据

执行 SELECT 查询，将结果保存到文件：

```sql
SELECT * FROM table_name;
```

然后在应用层处理查询结果，将其保存为 CSV 或 JSON 格式。

## 数据导入

### 方式一：通过 SQL 文件导入

使用 `source` 命令或通过 MySQL 客户端导入：

```bash
mysql -h host -u user -p database_name < /tmp/backup.sql
```

**示例**（通过 Cloud UI 执行）:

```json
{
  "agent_id": "agent-123",
  "type": "shell",
  "command": "mysql -h 127.0.0.1 -u root -p'password' test_db < /tmp/backup.sql"
}
```

### 方式二：通过 LOAD DATA 语句

使用 `LOAD DATA INFILE` 语句导入数据：

```sql
LOAD DATA INFILE '/tmp/import_data.csv'
INTO TABLE table_name
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

**注意事项**:
- 需要 MySQL 用户具有 `FILE` 权限
- 文件路径必须是 MySQL 服务器可访问的路径
- 建议先通过 goInception 审核 SQL 语句

### 方式三：通过 INSERT 语句批量导入

将数据转换为 INSERT 语句，通过 goInception 执行：

```sql
INSERT INTO table_name (col1, col2, col3) VALUES
(1, 'value1', 'data1'),
(2, 'value2', 'data2'),
(3, 'value3', 'data3');
```

**示例**（通过 Cloud UI 执行）:

```json
{
  "agent_id": "agent-123",
  "type": "mysql",
  "command": "INSERT INTO users (name, email) VALUES ('user1', 'user1@example.com'), ('user2', 'user2@example.com')",
  "params": {
    "database": "test_db",
    "connection": "default"
  }
}
```

## 备份和回滚

### 启用备份

goInception 在执行 SQL 时可以自动备份数据，并在响应中提供回滚 SQL。

**请求示例**:

```json
{
  "sql": "UPDATE users SET status = 'active' WHERE id = 1",
  "db_name": "test_db",
  "backup": "1"
}
```

**响应中的回滚信息**:

```json
{
  "backup_dbname": "backup_test_db_20240101",
  "backup_time": "2024-01-01 10:00:00",
  "rollback_sql": "UPDATE users SET status = 'inactive' WHERE id = 1"
}
```

### 执行回滚

使用响应中的 `rollback_sql` 字段执行回滚：

```json
{
  "sql": "UPDATE users SET status = 'inactive' WHERE id = 1",
  "db_name": "test_db",
  "backup": "0"
}
```

## 使用示例

### 示例 1：创建表并备份

```json
{
  "sql": "CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100), email VARCHAR(100))",
  "db_name": "test_db",
  "backup": "1"
}
```

### 示例 2：批量插入数据

```json
{
  "sql": "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com'), ('Bob', 'bob@example.com')",
  "db_name": "test_db",
  "backup": "1"
}
```

### 示例 3：更新数据（不备份）

```json
{
  "sql": "UPDATE users SET email = 'newemail@example.com' WHERE id = 1",
  "db_name": "test_db",
  "backup": "0"
}
```

### 示例 4：多语句执行

```json
{
  "sql": "CREATE TABLE t1 (id INT); INSERT INTO t1 VALUES (1); INSERT INTO t1 VALUES (2);",
  "db_name": "test_db",
  "backup": "1"
}
```

## 错误处理

### 错误级别说明

- **error_level = 0**: 正常，SQL 执行成功
- **error_level = 1**: 警告，SQL 可以执行但可能有风险
- **error_level = 2**: 错误，SQL 执行失败

### 常见错误

1. **数据库不存在**: 确保 `db_name` 参数正确
2. **权限不足**: 检查 MySQL 用户权限
3. **SQL 语法错误**: 检查 SQL 语句语法
4. **备份失败**: 检查 goInception 备份配置

## 最佳实践

1. **生产环境操作建议启用备份**: 设置 `backup: "1"`，以便在需要时进行回滚
2. **大数据量导入**: 对于大量数据，建议使用 `mysqldump` 和 `mysql` 命令行工具
3. **SQL 审核**: 在执行前，goInception 会自动进行 SQL 审核，检查潜在问题
4. **分批执行**: 对于大量 SQL 语句，建议分批执行，避免超时
5. **监控执行时间**: 注意 `execute_time` 字段，对于长时间运行的 SQL 需要特别关注

## 相关配置

### goInception 备份配置

goInception 需要在配置文件中设置备份库连接信息：

```toml
[backup]
host = "127.0.0.1"
port = 3306
user = "backup_user"
password = "backup_password"
```

### 备份用户权限

备份用户需要以下权限：

```sql
GRANT SELECT, INSERT, CREATE ON *.* TO 'backup_user'@'%';
```

## 参考资源

- goInception 官方仓库: https://github.com/hanchuanchuan/goInception
- MySQL 官方文档: https://dev.mysql.com/doc/

