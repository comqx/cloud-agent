# SQL 注入安全分析报告

## 概述

本报告分析了 `internal/agent/plugins` 目录中数据库相关执行器的 SQL 注入风险。

## 风险评估结果

### 🔴 高风险 - 存在 SQL 注入漏洞

以下执行器**直接执行用户输入的 SQL 语句**，存在严重的 SQL 注入风险：

#### 1. PostgreSQL 执行器 (`postgres.go`)

**风险位置：**
- 文件：`internal/agent/plugins/postgres.go`
- 行号：327
- 代码：
```go
res, err := tx.ExecContext(ctx, stmt)
```

**问题分析：**
- 直接使用 `tx.ExecContext()` 执行用户输入的 SQL 语句
- `stmt` 来自 `splitStatements()` 方法，该方法只是简单的按分号分割，没有任何验证或转义
- 用户可以通过构造恶意 SQL 语句执行任意操作

**攻击示例：**
```sql
-- 正常 SQL
SELECT * FROM users;

-- 恶意 SQL（SQL 注入）
SELECT * FROM users; DROP TABLE users; --
```

#### 2. ClickHouse 执行器 (`clickhouse.go`)

**风险位置：**
- 文件：`internal/agent/plugins/clickhouse.go`
- 行号：321
- 代码：
```go
err := conn.Exec(ctx, stmt)
```

**问题分析：**
- 与 PostgreSQL 执行器相同的问题
- 直接执行用户输入的 SQL 语句，没有任何参数化处理

### 🟡 中等风险 - 依赖外部服务安全性

#### 3. MySQL 执行器 (`mysql.go`)

**风险位置：**
- 文件：`internal/agent/plugins/mysql.go`
- 行号：173, 286
- 代码：
```go
req := goInceptionRequest{
    SQL:    command,  // 直接传递用户输入的 SQL
    DbName: dbName,
    Backup: backup,
}
```

**问题分析：**
- 通过 goInception 服务执行 SQL
- SQL 注入风险取决于 goInception 的安全性
- 如果 goInception 没有正确处理 SQL，仍然存在注入风险

**建议：**
- 确认 goInception 是否对 SQL 进行了适当的验证和转义
- 如果 goInception 直接执行 SQL，风险与 PostgreSQL/ClickHouse 相同

#### 4. Doris 执行器 (`doris.go`)

**风险位置：**
- 文件：`internal/agent/plugins/doris.go`
- 行号：58

**问题分析：**
- 复用 MySQLExecutor，风险与 MySQL 相同

### 🟢 低风险 - 使用安全的 API

#### 5. MongoDB 执行器 (`mongo.go`)

**风险位置：**
- 文件：`internal/agent/plugins/mongo.go`
- 行号：410, 448, 475

**问题分析：**
- 使用 MongoDB 驱动的安全方法（`InsertMany`, `UpdateMany`, `DeleteMany`）
- 操作通过 BSON 格式传递，驱动会自动处理转义
- 风险较低，但仍需注意：
  - 如果用户输入的 JSON 包含恶意操作（如 `$where` 注入），仍可能存在问题
  - 需要验证操作类型和参数

**当前实现：**
```go
// 使用驱动提供的方法，相对安全
result, err := coll.InsertMany(ctx, docs)
result, err := coll.UpdateMany(ctx, filterBSON, updateDoc)
result, err := coll.DeleteMany(ctx, filterBSON)
```

#### 6. Elasticsearch 执行器 (`elasticsearch.go`)

**风险位置：**
- 文件：`internal/agent/plugins/elasticsearch.go`

**问题分析：**
- 使用 Elasticsearch 官方客户端 API
- 操作通过 JSON 格式传递，客户端会处理序列化
- 风险较低，但需要注意：
  - 需要验证操作类型和参数
  - 防止恶意查询导致性能问题

## 安全建议

### 1. 立即修复（高优先级）

#### PostgreSQL 和 ClickHouse 执行器

**方案 A：使用参数化查询（推荐）**

对于可以参数化的查询，使用 Prepared Statements：

```go
// PostgreSQL 示例
stmt, err := tx.PrepareContext(ctx, "SELECT * FROM users WHERE id = $1")
if err != nil {
    return err
}
defer stmt.Close()

res, err := stmt.ExecContext(ctx, userID)
```

**方案 B：SQL 白名单验证（适用于管理工具）**

如果这是一个数据库管理工具，允许执行任意 SQL，则：

1. **添加权限控制**：
   - 限制可以执行的 SQL 语句类型
   - 禁止执行 DROP、TRUNCATE、ALTER 等危险操作
   - 或要求特殊权限才能执行

2. **SQL 解析和验证**：
   ```go
   // 使用 SQL 解析器验证 SQL 语句
   import "github.com/xwb1989/sqlparser"
   
   stmt, err := sqlparser.Parse(stmt)
   if err != nil {
       return fmt.Errorf("invalid SQL: %w", err)
   }
   
   // 检查是否包含危险操作
   if containsDangerousOperation(stmt) {
       return fmt.Errorf("dangerous operation not allowed")
   }
   ```

3. **添加审计日志**：
   - 记录所有执行的 SQL 语句
   - 记录执行用户、时间、结果等信息

4. **连接权限限制**：
   - 使用最小权限的数据库用户
   - 禁止授予 DROP、ALTER、CREATE 等权限

### 2. 中期改进

#### MySQL/Doris 执行器

1. **验证 goInception 安全性**：
   - 确认 goInception 是否对 SQL 进行了验证
   - 如果 goInception 不安全，考虑添加前置验证

2. **添加 SQL 审计**：
   - 在执行前记录 SQL 语句
   - 检查危险操作模式

#### MongoDB/Elasticsearch 执行器

1. **操作类型白名单**：
   ```go
   allowedOperations := map[string]bool{
       "insert": true,
       "update": true,
       "delete": true,
   }
   
   if !allowedOperations[opType] {
       return fmt.Errorf("operation type '%s' not allowed", opType)
   }
   ```

2. **参数验证**：
   - 验证集合名称、索引名称等参数
   - 防止路径遍历攻击

### 3. 长期改进

1. **统一的安全框架**：
   - 创建统一的 SQL/查询验证接口
   - 所有执行器都通过该接口验证

2. **权限管理系统**：
   - 实现细粒度的权限控制
   - 不同用户/角色可以执行不同类型的操作

3. **安全审计**：
   - 完整的操作审计日志
   - 异常检测和告警

## 代码修复示例

### PostgreSQL 执行器修复示例

```go
// executeSQL 执行 SQL 语句（修复版本）
func (e *PostgresExecutor) executeSQL(ctx context.Context, db *sql.DB, command string, execOpts execOptions, logCallback LogCallback, taskID string) (*execResult, error) {
    // 1. SQL 验证
    if err := e.validateSQL(command); err != nil {
        return nil, fmt.Errorf("SQL validation failed: %w", err)
    }
    
    // 2. 记录审计日志
    if logCallback != nil {
        logCallback(taskID, "audit", fmt.Sprintf("Executing SQL: %s", command))
    }
    
    // 3. 分割 SQL 语句
    statements := e.splitStatements(command)
    if len(statements) == 0 {
        return nil, common.NewError("no valid SQL statements found")
    }
    
    // ... 其余代码保持不变，但添加错误处理
}
```

### SQL 验证函数示例

```go
// validateSQL 验证 SQL 语句
func (e *PostgresExecutor) validateSQL(sql string) error {
    // 检查危险关键字（可以根据需要调整）
    dangerousKeywords := []string{
        "DROP DATABASE",
        "DROP SCHEMA",
        "TRUNCATE",
        "ALTER SYSTEM",
        "COPY FROM",
    }
    
    upperSQL := strings.ToUpper(sql)
    for _, keyword := range dangerousKeywords {
        if strings.Contains(upperSQL, keyword) {
            return fmt.Errorf("dangerous operation detected: %s", keyword)
        }
    }
    
    return nil
}
```

## 总结

**当前状态：**
- 🔴 PostgreSQL 和 ClickHouse 执行器存在严重的 SQL 注入风险
- 🟡 MySQL/Doris 执行器风险取决于 goInception 的安全性
- 🟢 MongoDB 和 Elasticsearch 执行器风险较低

**建议优先级：**
1. **立即修复** PostgreSQL 和 ClickHouse 执行器
2. **验证** MySQL/Doris 执行器的安全性
3. **增强** MongoDB/Elasticsearch 执行器的验证
4. **建立**统一的安全框架和审计系统

**注意：** 如果这是一个数据库管理工具，允许执行任意 SQL 是预期行为，但仍需要：
- 权限控制
- 审计日志
- 使用最小权限的数据库用户
- 操作确认机制（对于危险操作）

