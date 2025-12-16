package plugins

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/cloud-agent/internal/common"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoExecutor MongoDB 执行器
type MongoExecutor struct {
	config      map[string]interface{}
	connections map[string]*mongo.Client // 缓存动态创建的连接（基于连接 URI 哈希）
	mu          sync.RWMutex
	validator   *SQLSecurityValidator // 操作安全验证器
}

// NewMongoExecutor 创建 MongoDB 执行器
func NewMongoExecutor(config map[string]interface{}) *MongoExecutor {
	exec := &MongoExecutor{
		config:      config,
		connections: make(map[string]*mongo.Client),
		// 默认启用严格模式
		validator: NewSQLSecurityValidator(false, true),
	}

	// 初始化连接
	exec.initConnections()

	return exec
}

// initConnections 初始化连接
func (e *MongoExecutor) initConnections() {
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

		// 构建连接 URI
		uri := e.buildConnectionURI(cfg)
		if uri == "" {
			continue
		}

		// 创建 MongoDB 客户端
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err != nil {
			continue
		}

		// 测试连接
		if err := client.Ping(ctx, nil); err != nil {
			client.Disconnect(ctx)
			continue
		}

		e.connections[name] = client
	}
}

// buildConnectionURI 构建 MongoDB 连接 URI
func (e *MongoExecutor) buildConnectionURI(cfg map[string]interface{}) string {
	host, _ := cfg["host"].(string)
	if host == "" {
		host = "localhost"
	}

	port, _ := cfg["port"].(int)
	if port == 0 {
		port = 27017
	}

	user, _ := cfg["user"].(string)
	password, _ := cfg["password"].(string)
	database, _ := cfg["database"].(string)

	// 构建连接 URI
	var uri string
	if user != "" && password != "" {
		uri = fmt.Sprintf("mongodb://%s:%s@%s:%d", user, password, host, port)
	} else {
		uri = fmt.Sprintf("mongodb://%s:%d", host, port)
	}

	if database != "" {
		uri += "/" + database
	}

	return uri
}

// getConnection 获取数据库连接（从配置）
func (e *MongoExecutor) getConnection(connName string) (*mongo.Client, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	client, exists := e.connections[connName]
	if !exists {
		return nil, fmt.Errorf("connection '%s' not found", connName)
	}

	return client, nil
}

// getOrCreateConnectionFromTarget 从 target 参数创建或获取连接
func (e *MongoExecutor) getOrCreateConnectionFromTarget(target map[string]interface{}) (*mongo.Client, string, string, error) {
	// 获取数据库名（可选）
	dbName, _ := target["db"].(string)
	if dbName == "" {
		dbName, _ = target["database"].(string)
	}
	// 如果未提供数据库名，使用默认值
	if dbName == "" {
		dbName = "admin" // MongoDB 默认数据库
	}

	// 构建连接 URI
	uri := e.buildConnectionURI(target)
	if uri == "" {
		return nil, "", "", common.NewError("invalid target configuration")
	}

	// 使用连接 URI 作为 key（用于缓存）
	connKey := uri

	// 检查缓存
	e.mu.RLock()
	if client, exists := e.connections[connKey]; exists {
		// 测试连接是否有效
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := client.Ping(ctx, nil); err == nil {
			cancel()
			e.mu.RUnlock()
			return client, connKey, dbName, nil
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
	if client, exists := e.connections[connKey]; exists {
		return client, connKey, dbName, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to connect: %w", err)
	}

	// 测试连接
	if err := client.Ping(ctx, nil); err != nil {
		client.Disconnect(ctx)
		return nil, "", "", fmt.Errorf("failed to ping: %w", err)
	}

	// 缓存连接
	e.connections[connKey] = client

	return client, connKey, dbName, nil
}

// Type 返回执行器类型
func (e *MongoExecutor) Type() common.TaskType {
	return common.TaskTypeMongo
}

// GetDatabaseType 返回数据库类型
func (e *MongoExecutor) GetDatabaseType() string {
	return "mongo"
}

// Execute 执行 MongoDB 操作
func (e *MongoExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	startTime := time.Now()

	if command == "" {
		return "", common.NewError("command is empty")
	}

	// 从 params.target 或 connection 获取连接信息
	var client *mongo.Client
	var err error
	var connKey string
	var dbName string

	if params != nil {
		// 优先使用 target 参数（动态连接）
		if target, ok := params["target"].(map[string]interface{}); ok {
			client, connKey, dbName, err = e.getOrCreateConnectionFromTarget(target)
			if err != nil {
				return "", fmt.Errorf("failed to create connection from target: %w", err)
			}
		} else if connName, ok := params["connection"].(string); ok {
			// 使用配置的连接（向后兼容）
			client, err = e.getConnection(connName)
			if err != nil {
				return "", fmt.Errorf("failed to get connection: %w", err)
			}
			connKey = connName
			// 获取数据库名
			if db, ok := params["database"].(string); ok {
				dbName = db
			} else if connConfig, ok := e.getConnectionConfig(connName); ok {
				if db, ok := connConfig["database"].(string); ok {
					dbName = db
				}
			}
		} else {
			return "", common.NewError("target or connection is required in params")
		}
	} else {
		return "", common.NewError("params is required, must provide target or connection")
	}

	// 数据库名可选，如果未提供，使用默认值
	if dbName == "" {
		dbName = "admin" // MongoDB 默认数据库
		if logCallback != nil {
			logCallback(taskID, "info", "No database name specified, using default 'admin' (database name can be specified in operations)")
		}
	}

	db := client.Database(dbName)

	// 解析执行选项
	execOpts := e.extractExecOptions(params)

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Executing MongoDB operations on database: %s (connection: %s)", dbName, connKey))
	}

	// 创建上下文（支持超时）
	ctx := context.Background()
	if execOpts.TimeoutMs > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(execOpts.TimeoutMs)*time.Millisecond)
		defer cancel()
	}

	// 执行操作
	result, err := e.executeOperations(ctx, db, command, execOpts, logCallback, taskID)
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
		RowsAffected: result.DocumentsAffected,
		Stage:        "EXECUTED",
		ExecuteTime:  duration.String(),
		StartAt:      startTime,
		EndAt:        endTime,
		TextResult:   result.TextResult,
	}

	return FormatResult(execResult, false)
}

// mongoExecResult MongoDB 执行结果
type mongoExecResult struct {
	DocumentsAffected int64
	TextResult        string
}

// executeOperations 执行 MongoDB 操作
func (e *MongoExecutor) executeOperations(ctx context.Context, db *mongo.Database, command string, execOpts execOptions, logCallback LogCallback, taskID string) (*mongoExecResult, error) {
	// 尝试解析为 JSON 操作序列
	var operations []map[string]interface{}
	if err := json.Unmarshal([]byte(command), &operations); err == nil {
		// 是 JSON 格式的操作序列
		return e.executeJSONOperations(ctx, db, operations, execOpts, logCallback, taskID)
	}

	// 尝试解析为单个操作
	var operation map[string]interface{}
	if err := json.Unmarshal([]byte(command), &operation); err == nil {
		operations = []map[string]interface{}{operation}
		return e.executeJSONOperations(ctx, db, operations, execOpts, logCallback, taskID)
	}

	// 如果不是 JSON 格式，返回错误（暂不支持 mongo shell 脚本）
	return nil, common.NewError("MongoDB command must be JSON format operation sequence")
}

// executeJSONOperations 执行 JSON 格式的操作序列
func (e *MongoExecutor) executeJSONOperations(ctx context.Context, db *mongo.Database, operations []map[string]interface{}, execOpts execOptions, logCallback LogCallback, taskID string) (*mongoExecResult, error) {
	// 验证所有操作
	for i, op := range operations {
		if err := e.validator.ValidateMongoOperation(op); err != nil {
			errorMsg := fmt.Sprintf("Operation %d security validation failed: %v", i+1, err)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			return nil, fmt.Errorf("security validation failed for operation %d: %w", i+1, err)
		}
	}

	// 记录审计日志
	if logCallback != nil {
		logCallback(taskID, "audit", fmt.Sprintf("Executing %d MongoDB operation(s) after security validation", len(operations)))
	}

	var totalAffected int64
	var results []string
	var hasError bool

	for i, op := range operations {
		opType, _ := op["operation"].(string)
		collection, _ := op["collection"].(string)

		if collection == "" {
			hasError = true
			errorMsg := fmt.Sprintf("Operation %d: collection is required", i+1)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			results = append(results, fmt.Sprintf("Operation %d: ERROR - %s", i+1, errorMsg))
			continue
		}

		// 记录操作（用于审计）
		if logCallback != nil {
			logCallback(taskID, "audit", fmt.Sprintf("Executing operation %d: %s on collection %s", i+1, opType, collection))
		}

		coll := db.Collection(collection)

		switch opType {
		case "insert":
			affected, err := e.executeInsert(ctx, coll, op, logCallback, taskID, i+1)
			if err != nil {
				hasError = true
				results = append(results, fmt.Sprintf("Operation %d: ERROR - %v", i+1, err))
				continue
			}
			totalAffected += affected
			results = append(results, fmt.Sprintf("Operation %d: INSERT SUCCESS (Documents: %d)", i+1, affected))

		case "update":
			affected, err := e.executeUpdate(ctx, coll, op, logCallback, taskID, i+1)
			if err != nil {
				hasError = true
				results = append(results, fmt.Sprintf("Operation %d: ERROR - %v", i+1, err))
				continue
			}
			totalAffected += affected
			results = append(results, fmt.Sprintf("Operation %d: UPDATE SUCCESS (Documents: %d)", i+1, affected))

		case "delete":
			affected, err := e.executeDelete(ctx, coll, op, logCallback, taskID, i+1)
			if err != nil {
				hasError = true
				results = append(results, fmt.Sprintf("Operation %d: ERROR - %v", i+1, err))
				continue
			}
			totalAffected += affected
			results = append(results, fmt.Sprintf("Operation %d: DELETE SUCCESS (Documents: %d)", i+1, affected))

		default:
			hasError = true
			errorMsg := fmt.Sprintf("Operation %d: unsupported operation type '%s'", i+1, opType)
			if logCallback != nil {
				logCallback(taskID, "error", errorMsg)
			}
			results = append(results, fmt.Sprintf("Operation %d: ERROR - %s", i+1, errorMsg))
		}

		// 批次间休眠（如果有配置）
		if execOpts.SleepMs > 0 && i < len(operations)-1 {
			time.Sleep(time.Duration(execOpts.SleepMs) * time.Millisecond)
		}
	}

	if hasError {
		return nil, fmt.Errorf("MongoDB operations failed: %s", strings.Join(results, "\n"))
	}

	return &mongoExecResult{
		DocumentsAffected: totalAffected,
		TextResult:        strings.Join(results, "\n"),
	}, nil
}

// executeInsert 执行插入操作
func (e *MongoExecutor) executeInsert(ctx context.Context, coll *mongo.Collection, op map[string]interface{}, logCallback LogCallback, taskID string, opNum int) (int64, error) {
	documents, ok := op["documents"].([]interface{})
	if !ok {
		return 0, fmt.Errorf("documents field is required for insert operation")
	}

	var docs []interface{}
	for _, doc := range documents {
		docs = append(docs, doc)
	}

	result, err := coll.InsertMany(ctx, docs)
	if err != nil {
		return 0, err
	}

	affected := int64(len(result.InsertedIDs))
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Operation %d: Inserted %d documents", opNum, affected))
	}

	return affected, nil
}

// executeUpdate 执行更新操作
func (e *MongoExecutor) executeUpdate(ctx context.Context, coll *mongo.Collection, op map[string]interface{}, logCallback LogCallback, taskID string, opNum int) (int64, error) {
	filter, ok := op["filter"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("filter field is required for update operation")
	}

	update, ok := op["update"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("update field is required for update operation")
	}

	// 转换 filter 和 update 为 bson.M
	filterBSON := bson.M{}
	for k, v := range filter {
		filterBSON[k] = v
	}

	updateBSON := bson.M{}
	for k, v := range update {
		updateBSON[k] = v
	}

	// 执行更新
	updateDoc := bson.M{"$set": updateBSON}
	result, err := coll.UpdateMany(ctx, filterBSON, updateDoc)
	if err != nil {
		return 0, err
	}

	affected := result.ModifiedCount
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Operation %d: Updated %d documents", opNum, affected))
	}

	return affected, nil
}

// executeDelete 执行删除操作
func (e *MongoExecutor) executeDelete(ctx context.Context, coll *mongo.Collection, op map[string]interface{}, logCallback LogCallback, taskID string, opNum int) (int64, error) {
	filter, ok := op["filter"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("filter field is required for delete operation")
	}

	// 转换 filter 为 bson.M
	filterBSON := bson.M{}
	for k, v := range filter {
		filterBSON[k] = v
	}

	// 执行删除
	result, err := coll.DeleteMany(ctx, filterBSON)
	if err != nil {
		return 0, err
	}

	affected := result.DeletedCount
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Operation %d: Deleted %d documents", opNum, affected))
	}

	return affected, nil
}

// getConnectionConfig 获取连接配置
func (e *MongoExecutor) getConnectionConfig(connName string) (map[string]interface{}, bool) {
	connections, ok := e.config["connections"].([]interface{})
	if !ok {
		return nil, false
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

		if name == connName {
			return cfg, true
		}
	}

	return nil, false
}

// extractExecOptions 从 params 中提取执行选项
func (e *MongoExecutor) extractExecOptions(params map[string]interface{}) execOptions {
	opts := execOptions{
		TransBatchSize: 200,
		Backup:         false, // MongoDB 暂不支持自动备份
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
func (e *MongoExecutor) Cancel(taskID string) error {
	// MongoDB 执行通过 context 控制，取消功能通过 context cancel 实现
	return nil
}

// Close 关闭所有连接
func (e *MongoExecutor) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	for _, client := range e.connections {
		client.Disconnect(ctx)
	}

	return nil
}
