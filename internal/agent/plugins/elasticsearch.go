package plugins

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

// ESExecutor Elasticsearch 执行器
type ESExecutor struct {
	config      map[string]interface{}
	connections map[string]*elasticsearch.Client // 缓存动态创建的连接（基于配置哈希）
	mu          sync.RWMutex
}

// NewESExecutor 创建 Elasticsearch 执行器
func NewESExecutor(config map[string]interface{}) *ESExecutor {
	exec := &ESExecutor{
		config:      config,
		connections: make(map[string]*elasticsearch.Client),
	}

	// 初始化连接
	exec.initConnections()

	return exec
}

// initConnections 初始化连接
func (e *ESExecutor) initConnections() {
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

		// 构建 Elasticsearch 配置
		esConfig := e.buildESConfig(cfg)
		if esConfig == nil {
			continue
		}

		// 创建 Elasticsearch 客户端
		client, err := elasticsearch.NewClient(*esConfig)
		if err != nil {
			continue
		}

		// 测试连接
		res, err := client.Info()
		if err != nil {
			continue
		}
		res.Body.Close()

		e.connections[name] = client
	}
}

// buildESConfig 构建 Elasticsearch 配置
func (e *ESExecutor) buildESConfig(cfg map[string]interface{}) *elasticsearch.Config {
	addresses := []string{}

	host, _ := cfg["host"].(string)
	if host == "" {
		host = "localhost"
	}

	port, _ := cfg["port"].(int)
	if port == 0 {
		port = 9200
	}

	addresses = append(addresses, fmt.Sprintf("http://%s:%d", host, port))

	config := elasticsearch.Config{
		Addresses: addresses,
	}

	// 用户名和密码
	if user, ok := cfg["user"].(string); ok && user != "" {
		config.Username = user
	}
	if password, ok := cfg["password"].(string); ok && password != "" {
		config.Password = password
	}

	// API Key（如果提供）
	if apiKey, ok := cfg["api_key"].(string); ok && apiKey != "" {
		config.APIKey = apiKey
	}

	return &config
}

// getConnection 获取连接（从配置）
func (e *ESExecutor) getConnection(connName string) (*elasticsearch.Client, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	client, exists := e.connections[connName]
	if !exists {
		return nil, fmt.Errorf("connection '%s' not found", connName)
	}

	return client, nil
}

// getOrCreateConnectionFromTarget 从 target 参数创建或获取连接
func (e *ESExecutor) getOrCreateConnectionFromTarget(target map[string]interface{}) (*elasticsearch.Client, string, error) {
	// 构建 Elasticsearch 配置
	esConfig := e.buildESConfig(target)
	if esConfig == nil {
		return nil, "", common.NewError("invalid target configuration")
	}

	// 使用配置的地址作为 key（用于缓存）
	connKey := strings.Join(esConfig.Addresses, ",")
	if esConfig.Username != "" {
		connKey += "@" + esConfig.Username
	}

	// 检查缓存
	e.mu.RLock()
	if client, exists := e.connections[connKey]; exists {
		// 测试连接是否有效
		res, err := client.Info()
		if err == nil {
			res.Body.Close()
			e.mu.RUnlock()
			return client, connKey, nil
		}
		// 连接已失效，移除
		delete(e.connections, connKey)
	}
	e.mu.RUnlock()

	// 创建新连接
	e.mu.Lock()
	defer e.mu.Unlock()

	// 双重检查
	if client, exists := e.connections[connKey]; exists {
		return client, connKey, nil
	}

	client, err := elasticsearch.NewClient(*esConfig)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create client: %w", err)
	}

	// 测试连接
	res, err := client.Info()
	if err != nil {
		return nil, "", fmt.Errorf("failed to connect: %w", err)
	}
	res.Body.Close()

	// 缓存连接
	e.connections[connKey] = client

	return client, connKey, nil
}

// Type 返回执行器类型
func (e *ESExecutor) Type() common.TaskType {
	return common.TaskTypeElasticsearch
}

// GetDatabaseType 返回数据库类型
func (e *ESExecutor) GetDatabaseType() string {
	return "elasticsearch"
}

// Execute 执行 Elasticsearch DSL
func (e *ESExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	startTime := time.Now()

	if command == "" {
		return "", common.NewError("command is empty")
	}

	// 从 params.target 或 connection 获取连接信息
	var client *elasticsearch.Client
	var err error
	var connKey string

	if params != nil {
		// 优先使用 target 参数（动态连接）
		if target, ok := params["target"].(map[string]interface{}); ok {
			client, connKey, err = e.getOrCreateConnectionFromTarget(target)
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
		} else {
			return "", common.NewError("target or connection is required in params")
		}
	} else {
		return "", common.NewError("params is required, must provide target or connection")
	}

	// 解析执行选项
	execOpts := e.extractExecOptions(params)

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Executing Elasticsearch DSL on connection: %s", connKey))
	}

	// 创建上下文（支持超时）
	ctx := context.Background()
	if execOpts.TimeoutMs > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(execOpts.TimeoutMs)*time.Millisecond)
		defer cancel()
	}

	// 执行 DSL
	result, err := e.executeDSL(ctx, client, command, execOpts, logCallback, taskID)
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

// esExecResult Elasticsearch 执行结果
type esExecResult struct {
	DocumentsAffected int64
	TextResult        string
}

// executeDSL 执行 DSL
func (e *ESExecutor) executeDSL(ctx context.Context, client *elasticsearch.Client, command string, execOpts execOptions, logCallback LogCallback, taskID string) (*esExecResult, error) {
	// 尝试解析为 JSON 操作
	var operation map[string]interface{}
	if err := json.Unmarshal([]byte(command), &operation); err != nil {
		return nil, fmt.Errorf("invalid JSON format: %w", err)
	}

	// 获取操作类型
	opType, _ := operation["operation"].(string)
	index, _ := operation["index"].(string)

	if index == "" {
		return nil, common.NewError("index is required")
	}

	switch opType {
	case "bulk":
		return e.executeBulk(ctx, client, index, operation, logCallback, taskID)
	case "update":
		return e.executeUpdate(ctx, client, index, operation, logCallback, taskID)
	case "delete_by_query":
		return e.executeDeleteByQuery(ctx, client, index, operation, logCallback, taskID)
	case "index":
		return e.executeIndex(ctx, client, index, operation, logCallback, taskID)
	default:
		return nil, fmt.Errorf("unsupported operation type: %s", opType)
	}
}

// executeBulk 执行 bulk 操作
func (e *ESExecutor) executeBulk(ctx context.Context, client *elasticsearch.Client, index string, operation map[string]interface{}, logCallback LogCallback, taskID string) (*esExecResult, error) {
	actions, ok := operation["actions"].([]interface{})
	if !ok {
		return nil, common.NewError("actions field is required for bulk operation")
	}

	var buf bytes.Buffer
	var affected int64

	for _, action := range actions {
		actionMap, ok := action.(map[string]interface{})
		if !ok {
			continue
		}

		// 构建 bulk 请求体
		for actionType, actionData := range actionMap {
			meta := map[string]interface{}{
				"_index": index,
			}

			// 如果有 _id，添加到 meta
			if id, ok := actionData.(map[string]interface{})["_id"].(string); ok {
				meta["_id"] = id
			}

			// 写入 action 行
			actionLine := map[string]interface{}{
				actionType: meta,
			}
			actionJSON, _ := json.Marshal(actionLine)
			buf.Write(actionJSON)
			buf.WriteString("\n")

			// 写入 source 行（如果是 index 或 update）
			if actionType == "index" || actionType == "update" {
				source := actionData.(map[string]interface{})["_source"]
				if source != nil {
					sourceJSON, _ := json.Marshal(source)
					buf.Write(sourceJSON)
					buf.WriteString("\n")
				}
			}

			affected++
		}
	}

	// 执行 bulk 请求
	res, err := client.Bulk(bytes.NewReader(buf.Bytes()), client.Bulk.WithContext(ctx))
	if err != nil {
		return nil, fmt.Errorf("bulk request failed: %w", err)
	}
	defer res.Body.Close()

	// 读取响应
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if res.IsError() {
		return nil, fmt.Errorf("bulk operation failed: %s", string(body))
	}

	var bulkResp map[string]interface{}
	if err := json.Unmarshal(body, &bulkResp); err == nil {
		if items, ok := bulkResp["items"].([]interface{}); ok {
			affected = int64(len(items))
		}
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Bulk operation completed (Documents: %d)", affected))
	}

	return &esExecResult{
		DocumentsAffected: affected,
		TextResult:        fmt.Sprintf("Bulk operation completed\nDocuments affected: %d\nResponse: %s", affected, string(body)),
	}, nil
}

// executeUpdate 执行 update 操作
func (e *ESExecutor) executeUpdate(ctx context.Context, client *elasticsearch.Client, index string, operation map[string]interface{}, logCallback LogCallback, taskID string) (*esExecResult, error) {
	id, _ := operation["id"].(string)
	if id == "" {
		return nil, common.NewError("id is required for update operation")
	}

	doc, ok := operation["doc"].(map[string]interface{})
	if !ok {
		return nil, common.NewError("doc field is required for update operation")
	}

	docJSON, _ := json.Marshal(doc)

	req := esapi.UpdateRequest{
		Index:      index,
		DocumentID: id,
		Body:       bytes.NewReader(docJSON),
	}

	res, err := req.Do(ctx, client)
	if err != nil {
		return nil, fmt.Errorf("update request failed: %w", err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if res.IsError() {
		return nil, fmt.Errorf("update operation failed: %s", string(body))
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Update operation completed (ID: %s)", id))
	}

	return &esExecResult{
		DocumentsAffected: 1,
		TextResult:        fmt.Sprintf("Update operation completed\nID: %s\nResponse: %s", id, string(body)),
	}, nil
}

// executeDeleteByQuery 执行 delete_by_query 操作
func (e *ESExecutor) executeDeleteByQuery(ctx context.Context, client *elasticsearch.Client, index string, operation map[string]interface{}, logCallback LogCallback, taskID string) (*esExecResult, error) {
	query, ok := operation["query"].(map[string]interface{})
	if !ok {
		return nil, common.NewError("query field is required for delete_by_query operation")
	}

	queryJSON, _ := json.Marshal(query)

	req := esapi.DeleteByQueryRequest{
		Index: []string{index},
		Body:  bytes.NewReader(queryJSON),
	}

	res, err := req.Do(ctx, client)
	if err != nil {
		return nil, fmt.Errorf("delete_by_query request failed: %w", err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if res.IsError() {
		return nil, fmt.Errorf("delete_by_query operation failed: %s", string(body))
	}

	var resp map[string]interface{}
	var affected int64
	if err := json.Unmarshal(body, &resp); err == nil {
		if deleted, ok := resp["deleted"].(float64); ok {
			affected = int64(deleted)
		}
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Delete by query completed (Documents: %d)", affected))
	}

	return &esExecResult{
		DocumentsAffected: affected,
		TextResult:        fmt.Sprintf("Delete by query completed\nDocuments deleted: %d\nResponse: %s", affected, string(body)),
	}, nil
}

// executeIndex 执行 index 操作（单个文档索引）
func (e *ESExecutor) executeIndex(ctx context.Context, client *elasticsearch.Client, index string, operation map[string]interface{}, logCallback LogCallback, taskID string) (*esExecResult, error) {
	doc, ok := operation["doc"].(map[string]interface{})
	if !ok {
		return nil, common.NewError("doc field is required for index operation")
	}

	docJSON, _ := json.Marshal(doc)

	var documentID string
	if id, ok := operation["id"].(string); ok {
		documentID = id
	}

	req := esapi.IndexRequest{
		Index:      index,
		DocumentID: documentID,
		Body:       bytes.NewReader(docJSON),
	}

	res, err := req.Do(ctx, client)
	if err != nil {
		return nil, fmt.Errorf("index request failed: %w", err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if res.IsError() {
		return nil, fmt.Errorf("index operation failed: %s", string(body))
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Index operation completed (ID: %s)", documentID))
	}

	return &esExecResult{
		DocumentsAffected: 1,
		TextResult:        fmt.Sprintf("Index operation completed\nID: %s\nResponse: %s", documentID, string(body)),
	}, nil
}

// extractExecOptions 从 params 中提取执行选项
func (e *ESExecutor) extractExecOptions(params map[string]interface{}) execOptions {
	opts := execOptions{
		TransBatchSize: 200,
		Backup:         false, // Elasticsearch 暂不支持自动备份
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
func (e *ESExecutor) Cancel(taskID string) error {
	// Elasticsearch 执行通过 context 控制，取消功能通过 context cancel 实现
	return nil
}

// Close 关闭所有连接
func (e *ESExecutor) Close() error {
	// Elasticsearch 客户端不需要显式关闭
	return nil
}

