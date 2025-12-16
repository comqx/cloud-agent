package plugins

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/cloud-agent/internal/common"
)

// ClickHouseExecutor ClickHouse 执行器
type ClickHouseExecutor struct {
	config      map[string]interface{}
	connections map[string]driver.Conn // 缓存动态创建的连接（基于配置哈希）
	mu          sync.RWMutex
	validator   *SQLSecurityValidator // SQL 安全验证器
}

// NewClickHouseExecutor 创建 ClickHouse 执行器
func NewClickHouseExecutor(config map[string]interface{}) *ClickHouseExecutor {
	exec := &ClickHouseExecutor{
		config:      config,
		connections: make(map[string]driver.Conn),
		// 默认不允许危险操作，启用严格模式
		validator: NewSQLSecurityValidator(false, true),
	}

	// 初始化连接
	exec.initConnections()

	return exec
}

// initConnections 初始化连接
func (e *ClickHouseExecutor) initConnections() {
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

		// 构建连接选项
		options := e.buildConnectionOptions(cfg)
		if options == nil {
			continue
		}

		// 创建连接
		conn, err := clickhouse.Open(options)
		if err != nil {
			continue
		}

		// 测试连接
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := conn.Ping(ctx); err != nil {
			cancel()
			conn.Close()
			continue
		}
		cancel()

		e.connections[name] = conn
	}
}

// buildConnectionOptions 构建连接选项
func (e *ClickHouseExecutor) buildConnectionOptions(cfg map[string]interface{}) *clickhouse.Options {
	options := &clickhouse.Options{}

	host, _ := cfg["host"].(string)
	if host == "" {
		host = "localhost"
	}

	port, _ := cfg["port"].(int)
	if port == 0 {
		port = 9000 // ClickHouse 默认 Native 端口
	}

	// 检查是否使用 HTTP 协议
	useHTTP := false
	if protocol, ok := cfg["protocol"].(string); ok && protocol == "http" {
		useHTTP = true
		port = 8123 // ClickHouse HTTP 端口
	}

	options.Addr = []string{fmt.Sprintf("%s:%d", host, port)}

	// 数据库名
	if database, ok := cfg["database"].(string); ok {
		options.Auth.Database = database
	} else {
		options.Auth.Database = "default"
	}

	// 用户名和密码
	if user, ok := cfg["user"].(string); ok {
		options.Auth.Username = user
	} else {
		options.Auth.Username = "default"
	}

	if password, ok := cfg["password"].(string); ok {
		options.Auth.Password = password
	}

	// 如果使用 HTTP 协议，需要设置
	if useHTTP {
		// ClickHouse Go 驱动默认使用 Native 协议
		// 如果需要 HTTP，可能需要使用不同的客户端
		// 这里先使用 Native 协议
	}

	return options
}

// getConnection 获取连接（从配置）
func (e *ClickHouseExecutor) getConnection(connName string) (driver.Conn, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	conn, exists := e.connections[connName]
	if !exists {
		return nil, fmt.Errorf("connection '%s' not found", connName)
	}

	return conn, nil
}

// getOrCreateConnectionFromTarget 从 target 参数创建或获取连接
func (e *ClickHouseExecutor) getOrCreateConnectionFromTarget(target map[string]interface{}) (driver.Conn, string, error) {
	// 构建连接选项
	options := e.buildConnectionOptions(target)
	if options == nil {
		return nil, "", common.NewError("invalid target configuration")
	}

	// 使用地址和数据库作为 key（用于缓存）
	connKey := strings.Join(options.Addr, ",") + "@" + options.Auth.Database

	// 检查缓存
	e.mu.RLock()
	if conn, exists := e.connections[connKey]; exists {
		// 测试连接是否有效
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := conn.Ping(ctx); err == nil {
			cancel()
			e.mu.RUnlock()
			return conn, connKey, nil
		}
		cancel()
		// 连接已失效，移除
		delete(e.connections, connKey)
	}
	e.mu.RUnlock()

	// 创建新连接
	e.mu.Lock()
	defer e.mu.Unlock()

	// 双重检查
	if conn, exists := e.connections[connKey]; exists {
		return conn, connKey, nil
	}

	conn, err := clickhouse.Open(options)
	if err != nil {
		return nil, "", fmt.Errorf("failed to open connection: %w", err)
	}

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := conn.Ping(ctx); err != nil {
		cancel()
		conn.Close()
		return nil, "", fmt.Errorf("failed to ping: %w", err)
	}
	cancel()

	// 缓存连接
	e.connections[connKey] = conn

	return conn, connKey, nil
}

// Type 返回执行器类型
func (e *ClickHouseExecutor) Type() common.TaskType {
	return common.TaskTypeClickHouse
}

// GetDatabaseType 返回数据库类型
func (e *ClickHouseExecutor) GetDatabaseType() string {
	return "clickhouse"
}

// Execute 执行 ClickHouse SQL
func (e *ClickHouseExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
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
	var conn driver.Conn
	var err error
	var connKey string

	if params != nil {
		// 优先使用 target 参数（动态连接）
		if target, ok := params["target"].(map[string]interface{}); ok {
			conn, connKey, err = e.getOrCreateConnectionFromTarget(target)
			if err != nil {
				return "", fmt.Errorf("failed to create connection from target: %w", err)
			}
		} else if connName, ok := params["connection"].(string); ok {
			// 使用配置的连接（向后兼容）
			conn, err = e.getConnection(connName)
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
		logCallback(taskID, "info", fmt.Sprintf("Executing ClickHouse SQL on connection: %s", connKey))
	}

	// 创建上下文（支持超时）
	ctx := context.Background()
	if execOpts.TimeoutMs > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(execOpts.TimeoutMs)*time.Millisecond)
		defer cancel()
	}

	// 执行 SQL
	result, err := e.executeSQL(ctx, conn, command, execOpts, logCallback, taskID)
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

// clickhouseExecResult ClickHouse 执行结果
type clickhouseExecResult struct {
	RowsAffected int64
	TextResult   string
}

// executeSQL 执行 SQL 语句
func (e *ClickHouseExecutor) executeSQL(ctx context.Context, conn driver.Conn, command string, execOpts execOptions, logCallback LogCallback, taskID string) (*clickhouseExecResult, error) {
	// 分割 SQL 语句（按分号分割）
	statements := e.splitStatements(command)
	if len(statements) == 0 {
		return nil, common.NewError("no valid SQL statements found")
	}

	// 验证每个 SQL 语句
	for i, stmt := range statements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}
		if err := e.validator.ValidateSQL(stmt); err != nil {
			errorMsg := fmt.Sprintf("Statement %d security validation failed: %v", i+1, err)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			return nil, fmt.Errorf("security validation failed for statement %d: %w", i+1, err)
		}
	}

	// 记录审计日志
	if logCallback != nil {
		logCallback(taskID, "audit", fmt.Sprintf("Executing %d SQL statement(s) after security validation", len(statements)))
	}

	var totalRowsAffected int64
	var results []string
	var hasError bool

	for i, stmt := range statements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}

		// 记录执行的 SQL（用于审计）
		if logCallback != nil {
			logCallback(taskID, "audit", fmt.Sprintf("Executing statement %d: %s", i+1, stmt))
		}

		// 执行语句
		err := conn.Exec(ctx, stmt)
		if err != nil {
			hasError = true
			errorMsg := fmt.Sprintf("Statement %d failed: %v", i+1, err)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			results = append(results, fmt.Sprintf("Statement %d: ERROR - %v\nSQL: %s", i+1, err, stmt))
			continue
		}

		// ClickHouse 的 Exec 不返回影响行数，需要通过查询获取
		// 对于 INSERT/UPDATE/DELETE，尝试解析影响行数
		rowsAffected := int64(0)
		if strings.HasPrefix(strings.ToUpper(strings.TrimSpace(stmt)), "INSERT") ||
			strings.HasPrefix(strings.ToUpper(strings.TrimSpace(stmt)), "UPDATE") ||
			strings.HasPrefix(strings.ToUpper(strings.TrimSpace(stmt)), "DELETE") {
			// 尝试查询影响行数（ClickHouse 不直接支持，这里设为 1 表示执行成功）
			rowsAffected = 1
		}

		totalRowsAffected += rowsAffected

		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf("Statement %d executed successfully", i+1))
		}
		results = append(results, fmt.Sprintf("Statement %d: SUCCESS\nSQL: %s", i+1, stmt))

		// 批次间休眠（如果有配置）
		if execOpts.SleepMs > 0 && i < len(statements)-1 {
			time.Sleep(time.Duration(execOpts.SleepMs) * time.Millisecond)
		}
	}

	if hasError {
		return nil, fmt.Errorf("SQL execution failed: %s", strings.Join(results, "\n"))
	}

	return &clickhouseExecResult{
		RowsAffected: totalRowsAffected,
		TextResult:   strings.Join(results, "\n\n"),
	}, nil
}

// splitStatements 分割 SQL 语句
func (e *ClickHouseExecutor) splitStatements(sql string) []string {
	// 简单的按分号分割
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
func (e *ClickHouseExecutor) extractExecOptions(params map[string]interface{}) execOptions {
	opts := execOptions{
		TransBatchSize: 200,
		Backup:         false, // ClickHouse 暂不支持自动备份
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
func (e *ClickHouseExecutor) Cancel(taskID string) error {
	// ClickHouse 执行通过 context 控制，取消功能通过 context cancel 实现
	return nil
}

// Close 关闭所有连接
func (e *ClickHouseExecutor) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, conn := range e.connections {
		conn.Close()
	}

	return nil
}
