package plugins

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/cloud-agent/cloud-agent/internal/common"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// PostgresExecutor PostgreSQL 执行器
type PostgresExecutor struct {
	config      map[string]interface{}
	connections map[string]*sql.DB // 缓存动态创建的连接（基于连接字符串哈希）
	mu          sync.RWMutex
}

// NewPostgresExecutor 创建 PostgreSQL 执行器
func NewPostgresExecutor(config map[string]interface{}) *PostgresExecutor {
	exec := &PostgresExecutor{
		config:      config,
		connections: make(map[string]*sql.DB),
	}

	// 初始化连接池
	exec.initConnections()

	return exec
}

// initConnections 初始化连接池
func (e *PostgresExecutor) initConnections() {
	connections, ok := e.config["connections"].([]interface{})
	if !ok {
		return
	}

	for _, connConfig := range connections {
		cfg, ok := connConfig.(map[string]interface{})
		if !ok {
			continue
		}

		name, _ := cfg["name"].(string)
		if name == "" {
			name = "default"
		}

		// 构建连接字符串
		connStr := e.buildConnectionString(cfg)
		if connStr == "" {
			continue
		}

		// 创建数据库连接
		db, err := sql.Open("pgx", connStr)
		if err != nil {
			continue
		}

		// 配置连接池
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(time.Hour)

		// 测试连接
		if err := db.Ping(); err != nil {
			db.Close()
			continue
		}

		e.connections[name] = db
	}
}

// buildConnectionString 构建 PostgreSQL 连接字符串
func (e *PostgresExecutor) buildConnectionString(cfg map[string]interface{}) string {
	host, _ := cfg["host"].(string)
	if host == "" {
		host = "localhost"
	}

	port, _ := cfg["port"].(int)
	if port == 0 {
		port = 5432
	}

	user, _ := cfg["user"].(string)
	if user == "" {
		// 兼容 username 字段
		user, _ = cfg["username"].(string)
		if user == "" {
			user = "postgres"
		}
	}

	password, _ := cfg["password"].(string)
	database, _ := cfg["database"].(string)
	// 数据库名可选，如果未提供，使用默认值 postgres
	if database == "" {
		database = "postgres"
	}

	// 构建连接字符串：postgres://user:password@host:port/database
	connStr := fmt.Sprintf("postgres://%s:%s@%s:%d/%s",
		user, password, host, port, database)

	// 添加 SSL 模式（如果指定）
	if sslmode, ok := cfg["sslmode"].(string); ok {
		connStr += "?sslmode=" + sslmode
	} else {
		connStr += "?sslmode=disable"
	}

	return connStr
}

// getConnection 获取数据库连接（从配置）
func (e *PostgresExecutor) getConnection(connName string) (*sql.DB, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	db, exists := e.connections[connName]
	if !exists {
		return nil, fmt.Errorf("connection '%s' not found", connName)
	}

	return db, nil
}

// getOrCreateConnectionFromTarget 从 target 参数创建或获取连接
func (e *PostgresExecutor) getOrCreateConnectionFromTarget(target map[string]interface{}) (*sql.DB, string, error) {
	// 构建连接字符串（数据库名可选，会使用默认值）
	connStr := e.buildConnectionString(target)
	if connStr == "" {
		return nil, "", common.NewError("invalid target configuration")
	}

	// 使用连接字符串作为 key（用于缓存）
	connKey := connStr

	// 检查缓存
	e.mu.RLock()
	if db, exists := e.connections[connKey]; exists {
		// 测试连接是否有效
		if err := db.Ping(); err == nil {
			e.mu.RUnlock()
			return db, connKey, nil
		}
		// 连接已失效，移除
		delete(e.connections, connKey)
	}
	e.mu.RUnlock()

	// 创建新连接
	e.mu.Lock()
	defer e.mu.Unlock()

	// 双重检查
	if db, exists := e.connections[connKey]; exists {
		return db, connKey, nil
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, "", fmt.Errorf("failed to open database: %w", err)
	}

	// 配置连接池
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	// 测试连接
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, "", fmt.Errorf("failed to ping database: %w", err)
	}

	// 缓存连接
	e.connections[connKey] = db

	return db, connKey, nil
}

// Type 返回执行器类型
func (e *PostgresExecutor) Type() common.TaskType {
	return common.TaskTypePostgres
}

// GetDatabaseType 返回数据库类型
func (e *PostgresExecutor) GetDatabaseType() string {
	return "postgres"
}

// Execute 执行 PostgreSQL 脚本
func (e *PostgresExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	startTime := time.Now()

	// 如果提供了 fileID，优先从文件读取 SQL
	if fileID != "" {
		filePath, _ := params["file_path"].(string)
		fileName, _ := params["file_name"].(string)
		
		fileSQL, err := ReadSQLFromFile(fileID, filePath, fileName, logCallback, taskID)
		if err != nil {
			return "", fmt.Errorf("failed to read SQL from file: %w", err)
		}
		if fileSQL != "" {
			command = fileSQL
		}
	}

	if command == "" {
		return "", common.NewError("SQL command is empty (provide command or file_id)")
	}

	// 从 params.target 或 connection 获取连接信息
	var db *sql.DB
	var err error
	var connKey string

	if params != nil {
		// 优先使用 target 参数（动态连接）
		if target, ok := params["target"].(map[string]interface{}); ok {
			// 数据库名可选，如果未提供，使用默认值或从连接字符串中获取
			db, connKey, err = e.getOrCreateConnectionFromTarget(target)
			if err != nil {
				return "", fmt.Errorf("failed to create connection from target: %w", err)
			}
		} else if connName, ok := params["connection"].(string); ok {
			// 使用配置的连接（向后兼容）
			db, err = e.getConnection(connName)
			if err != nil {
				return "", fmt.Errorf("failed to get connection: %w", err)
			}
			connKey = connName
		} else {
			return "", common.NewError("target or connection is required in params")
		}
	} else {
		return "", common.NewError("params is required, must provide target or connection")
	}

	// 解析执行选项
	execOpts := e.extractExecOptions(params)

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Executing PostgreSQL SQL on connection: %s", connKey))
	}

	// 创建上下文（支持超时）
	ctx := context.Background()
	if execOpts.TimeoutMs > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(execOpts.TimeoutMs)*time.Millisecond)
		defer cancel()
	}

	// 执行 SQL
	result, err := e.executeSQL(ctx, db, command, execOpts, logCallback, taskID)
	if err != nil {
		return "", err
	}

	// 构建执行结果
	endTime := time.Now()
	duration := endTime.Sub(startTime)

	execResult := &ExecutionResult{
		RunID:        taskID,
		TaskID:       taskID,
		Success:      true,
		ErrorLevel:   0,
		RowsAffected: result.RowsAffected,
		Stage:        "EXECUTED",
		ExecuteTime:  duration.String(),
		StartAt:      startTime,
		EndAt:        endTime,
		TextResult:   result.TextResult,
	}

	return FormatResult(execResult, false)
}

// execResult 执行结果
type execResult struct {
	RowsAffected int64
	TextResult   string
}

// executeSQL 执行 SQL 语句
func (e *PostgresExecutor) executeSQL(ctx context.Context, db *sql.DB, command string, execOpts execOptions, logCallback LogCallback, taskID string) (*execResult, error) {
	// 分割 SQL 语句（按分号分割）
	statements := e.splitStatements(command)
	if len(statements) == 0 {
		return nil, common.NewError("no valid SQL statements found")
	}

	var totalRowsAffected int64
	var results []string
	var hasError bool

	// 开始事务
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 按批次执行
	batchSize := execOpts.TransBatchSize
	if batchSize <= 0 {
		batchSize = 200
	}

	for i, stmt := range statements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}

		// 执行语句
		res, err := tx.ExecContext(ctx, stmt)
		if err != nil {
			hasError = true
			errorMsg := fmt.Sprintf("Statement %d failed: %v", i+1, err)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			results = append(results, fmt.Sprintf("Statement %d: ERROR - %v\nSQL: %s", i+1, err, stmt))
			continue
		}

		rowsAffected, _ := res.RowsAffected()
		totalRowsAffected += rowsAffected

		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf("Statement %d executed successfully (Affected rows: %d)", i+1, rowsAffected))
		}
		results = append(results, fmt.Sprintf("Statement %d: SUCCESS (Affected rows: %d)\nSQL: %s", i+1, rowsAffected, stmt))

		// 批次间休眠（如果有配置）
		if execOpts.SleepMs > 0 && i < len(statements)-1 {
			time.Sleep(time.Duration(execOpts.SleepMs) * time.Millisecond)
		}
	}

	// 如果有错误，回滚事务
	if hasError {
		if err := tx.Rollback(); err != nil {
			return nil, fmt.Errorf("failed to rollback transaction: %w", err)
		}
		return nil, fmt.Errorf("SQL execution failed: %s", strings.Join(results, "\n"))
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &execResult{
		RowsAffected: totalRowsAffected,
		TextResult:   strings.Join(results, "\n\n"),
	}, nil
}

// splitStatements 分割 SQL 语句
func (e *PostgresExecutor) splitStatements(sql string) []string {
	// 简单的按分号分割（实际应该使用 SQL 解析器）
	parts := strings.Split(sql, ";")
	var statements []string

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			statements = append(statements, part)
		}
	}

	return statements
}

// extractExecOptions 从 params 中提取执行选项
func (e *PostgresExecutor) extractExecOptions(params map[string]interface{}) execOptions {
	opts := execOptions{
		TransBatchSize: 200,
		Backup:         false, // PostgreSQL 暂不支持自动备份
		SleepMs:        0,
		TimeoutMs:      600000, // 10分钟
		Concurrency:    1,
	}

	if params == nil {
		return opts
	}

	if execOpts, ok := params["exec_options"].(map[string]interface{}); ok {
		if batchSize, ok := execOpts["trans_batch_size"].(int); ok {
			opts.TransBatchSize = batchSize
		}
		if sleepMs, ok := execOpts["sleep_ms"].(int); ok {
			opts.SleepMs = sleepMs
		}
		if timeoutMs, ok := execOpts["timeout_ms"].(int); ok {
			opts.TimeoutMs = timeoutMs
		}
		if concurrency, ok := execOpts["concurrency"].(int); ok {
			opts.Concurrency = concurrency
		}
	}

	return opts
}

// Cancel 取消执行
func (e *PostgresExecutor) Cancel(taskID string) error {
	// PostgreSQL 执行通过 context 控制，取消功能通过 context cancel 实现
	return nil
}

// Close 关闭所有连接
func (e *PostgresExecutor) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, db := range e.connections {
		db.Close()
	}

	return nil
}

