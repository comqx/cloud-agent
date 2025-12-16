package plugins

import (
	"fmt"
	"regexp"
	"strings"
)

// SQLSecurityValidator SQL 安全验证器
type SQLSecurityValidator struct {
	// 是否允许危险操作（如 DROP、TRUNCATE 等）
	allowDangerousOps bool
	// 是否启用严格模式（更严格的验证）
	strictMode bool
}

// NewSQLSecurityValidator 创建 SQL 安全验证器
func NewSQLSecurityValidator(allowDangerousOps bool, strictMode bool) *SQLSecurityValidator {
	return &SQLSecurityValidator{
		allowDangerousOps: allowDangerousOps,
		strictMode:        strictMode,
	}
}

// ValidateSQL 验证 SQL 语句的安全性
func (v *SQLSecurityValidator) ValidateSQL(sql string) error {
	if sql == "" {
		return fmt.Errorf("SQL statement is empty")
	}

	// 标准化 SQL（去除注释和多余空白）
	normalizedSQL := v.normalizeSQL(sql)

	// 检查危险操作
	if !v.allowDangerousOps {
		if err := v.checkDangerousOperations(normalizedSQL); err != nil {
			return err
		}
	}

	// 严格模式下的额外检查
	if v.strictMode {
		if err := v.strictValidation(normalizedSQL); err != nil {
			return err
		}
	}

	// 检查 SQL 注入模式
	if err := v.checkSQLInjectionPatterns(normalizedSQL); err != nil {
		return err
	}

	return nil
}

// normalizeSQL 标准化 SQL 语句
func (v *SQLSecurityValidator) normalizeSQL(sql string) string {
	// 移除单行注释
	re := regexp.MustCompile(`--.*`)
	sql = re.ReplaceAllString(sql, "")

	// 移除多行注释
	re = regexp.MustCompile(`/\*.*?\*/`)
	sql = re.ReplaceAllString(sql, "")

	// 标准化空白字符
	sql = regexp.MustCompile(`\s+`).ReplaceAllString(sql, " ")
	sql = strings.TrimSpace(sql)

	return strings.ToUpper(sql)
}

// checkDangerousOperations 检查危险操作
func (v *SQLSecurityValidator) checkDangerousOperations(sql string) error {
	// 危险操作关键字列表
	dangerousOps := []struct {
		keyword string
		message string
	}{
		{"DROP DATABASE", "DROP DATABASE operation is not allowed"},
		{"DROP SCHEMA", "DROP SCHEMA operation is not allowed"},
		{"DROP TABLE", "DROP TABLE operation is not allowed"},
		{"DROP VIEW", "DROP VIEW operation is not allowed"},
		{"DROP FUNCTION", "DROP FUNCTION operation is not allowed"},
		{"DROP PROCEDURE", "DROP PROCEDURE operation is not allowed"},
		{"DROP TRIGGER", "DROP TRIGGER operation is not allowed"},
		{"DROP INDEX", "DROP INDEX operation is not allowed"},
		{"DROP USER", "DROP USER operation is not allowed"},
		{"DROP ROLE", "DROP ROLE operation is not allowed"},
		{"TRUNCATE", "TRUNCATE operation is not allowed"},
		{"ALTER SYSTEM", "ALTER SYSTEM operation is not allowed"},
		{"ALTER DATABASE", "ALTER DATABASE operation is not allowed"},
		{"COPY FROM", "COPY FROM operation is not allowed"},
		{"CREATE USER", "CREATE USER operation is not allowed"},
		{"CREATE ROLE", "CREATE ROLE operation is not allowed"},
		{"GRANT", "GRANT operation is not allowed"},
		{"REVOKE", "REVOKE operation is not allowed"},
	}

	for _, op := range dangerousOps {
		// 使用单词边界匹配，避免误判（如 "DROPPED" 不会匹配 "DROP"）
		pattern := fmt.Sprintf(`\b%s\b`, regexp.QuoteMeta(op.keyword))
		matched, _ := regexp.MatchString(pattern, sql)
		if matched {
			return fmt.Errorf("security validation failed: %s", op.message)
		}
	}

	return nil
}

// checkSQLInjectionPatterns 检查 SQL 注入模式
func (v *SQLSecurityValidator) checkSQLInjectionPatterns(sql string) error {
	// 检查常见的 SQL 注入模式
	suspiciousPatterns := []struct {
		pattern string
		message string
	}{
		{`;\s*(DROP|DELETE|TRUNCATE|ALTER)`, "suspicious SQL injection pattern: multiple statements"},
		{`--\s*$`, "suspicious SQL injection pattern: comment terminator"},
		{`/\*.*\*/`, "suspicious SQL injection pattern: comment block"},
		{`;\s*--`, "suspicious SQL injection pattern: statement terminator with comment"},
		{`UNION.*SELECT`, "suspicious SQL injection pattern: UNION SELECT"},
		{`EXEC\s*\(`, "suspicious SQL injection pattern: EXEC function"},
		{`EXECUTE\s*\(`, "suspicious SQL injection pattern: EXECUTE function"},
		{`xp_cmdshell`, "suspicious SQL injection pattern: xp_cmdshell"},
		{`sp_executesql`, "suspicious SQL injection pattern: sp_executesql"},
	}

	for _, pattern := range suspiciousPatterns {
		matched, _ := regexp.MatchString(pattern.pattern, sql)
		if matched {
			return fmt.Errorf("security validation failed: %s", pattern.message)
		}
	}

	return nil
}

// strictValidation 严格模式验证
func (v *SQLSecurityValidator) strictValidation(sql string) error {
	// 检查是否包含多个语句（在严格模式下，只允许单个语句）
	if strings.Count(sql, ";") > 1 {
		return fmt.Errorf("strict mode: only single SQL statement is allowed")
	}

	// 检查是否包含存储过程调用
	if matched, _ := regexp.MatchString(`\bCALL\b|\bEXEC\b|\bEXECUTE\b`, sql); matched {
		return fmt.Errorf("strict mode: stored procedure calls are not allowed")
	}

	return nil
}

// ValidateMongoOperation 验证 MongoDB 操作
func (v *SQLSecurityValidator) ValidateMongoOperation(operation map[string]interface{}) error {
	// 验证操作类型
	opType, ok := operation["operation"].(string)
	if !ok {
		return fmt.Errorf("operation type is required")
	}

	allowedOps := map[string]bool{
		"insert": true,
		"update": true,
		"delete": true,
		"find":   true,
	}

	if !allowedOps[opType] {
		return fmt.Errorf("unsupported operation type: %s", opType)
	}

	// 验证集合名称（防止路径遍历）
	if collection, ok := operation["collection"].(string); ok {
		if err := v.validateCollectionName(collection); err != nil {
			return err
		}
	}

	// 检查危险操作（如 $where 注入）
	if filter, ok := operation["filter"].(map[string]interface{}); ok {
		if err := v.validateMongoFilter(filter); err != nil {
			return err
		}
	}

	return nil
}

// validateCollectionName 验证集合名称
func (v *SQLSecurityValidator) validateCollectionName(name string) error {
	if name == "" {
		return fmt.Errorf("collection name cannot be empty")
	}

	// 防止路径遍历
	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		return fmt.Errorf("invalid collection name: contains path traversal characters")
	}

	// 验证集合名称格式（MongoDB 集合名称规则）
	if matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]+$`, name); !matched {
		return fmt.Errorf("invalid collection name: contains invalid characters")
	}

	return nil
}

// validateMongoFilter 验证 MongoDB 过滤器
func (v *SQLSecurityValidator) validateMongoFilter(filter map[string]interface{}) error {
	// 检查 $where 操作符（可能导致注入）
	if _, ok := filter["$where"]; ok {
		return fmt.Errorf("security validation failed: $where operator is not allowed (potential injection risk)")
	}

	// 检查 $expr 操作符（需要谨慎处理）
	if _, ok := filter["$expr"]; ok && v.strictMode {
		return fmt.Errorf("strict mode: $expr operator is not allowed")
	}

	return nil
}

// ValidateElasticsearchOperation 验证 Elasticsearch 操作
func (v *SQLSecurityValidator) ValidateElasticsearchOperation(operation map[string]interface{}) error {
	// 验证操作类型
	opType, ok := operation["operation"].(string)
	if !ok {
		return fmt.Errorf("operation type is required")
	}

	allowedOps := map[string]bool{
		"bulk":           true,
		"update":         true,
		"delete_by_query": true,
		"index":          true,
		"search":         true,
	}

	if !allowedOps[opType] {
		return fmt.Errorf("unsupported operation type: %s", opType)
	}

	// 验证索引名称
	if index, ok := operation["index"].(string); ok {
		if err := v.validateIndexName(index); err != nil {
			return err
		}
	}

	return nil
}

// validateIndexName 验证索引名称
func (v *SQLSecurityValidator) validateIndexName(name string) error {
	if name == "" {
		return fmt.Errorf("index name cannot be empty")
	}

	// 防止路径遍历
	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		return fmt.Errorf("invalid index name: contains path traversal characters")
	}

	// Elasticsearch 索引名称规则：小写字母、数字、连字符、下划线
	if matched, _ := regexp.MatchString(`^[a-z0-9_-]+$`, name); !matched {
		return fmt.Errorf("invalid index name: contains invalid characters")
	}

	return nil
}

