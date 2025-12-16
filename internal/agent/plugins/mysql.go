package plugins

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
)

// goInceptionRequest goInception 请求结构
type goInceptionRequest struct {
	SQL    string `json:"sql"`
	DbName string `json:"db_name"`
	Backup string `json:"backup,omitempty"` // 是否备份：1-备份，0-不备份
}

// goInceptionResponse goInception 响应结构
type goInceptionResponse struct {
	ErrorCode int                 `json:"error_code"`
	ErrorMsg  string              `json:"error_msg"`
	Data      []goInceptionResult `json:"data"`
}

// goInceptionResult goInception 单个 SQL 结果
type goInceptionResult struct {
	OrderID      int    `json:"order_id"`
	Stage        string `json:"stage"`        // CHECKED, EXECUTED
	ErrorLevel   int    `json:"error_level"`  // 0-正常，1-警告，2-错误
	StageStatus  string `json:"stage_status"` // Audit completed, Execute Successfully
	ErrorMsg     string `json:"error_msg"`
	SQL          string `json:"sql"`
	AffectedRows int    `json:"affected_rows"`
	Sequence     string `json:"sequence"`
	BackupDBName string `json:"backup_dbname"`
	ExecuteTime  string `json:"execute_time"`
	SQLHash      string `json:"sqlhash"`
	BackupTime   string `json:"backup_time"`
	RollbackSQL  string `json:"rollback_sql"`
}

// MySQLExecutor MySQL 执行器（使用 goInception）
type MySQLExecutor struct {
	goInceptionURL string
	connections    map[string]connectionInfo
	config         map[string]interface{}
	httpClient     *http.Client
	validator      *SQLSecurityValidator // SQL 安全验证器
}

// connectionInfo 连接信息
type connectionInfo struct {
	Name     string
	Database string
}

// NewMySQLExecutor 创建 MySQL 执行器
func NewMySQLExecutor(config map[string]interface{}) *MySQLExecutor {
	exec := &MySQLExecutor{
		goInceptionURL: "http://localhost:4000",
		connections:    make(map[string]connectionInfo),
		config:         config,
		httpClient: &http.Client{
			Timeout: 30 * time.Minute,
		},
		// 默认不允许危险操作，启用严格模式
		// 注意：goInception 本身也会进行 SQL 审核，这里是双重保护
		validator: NewSQLSecurityValidator(false, true),
	}

	// 获取 goInception 服务地址
	if url, ok := config["goinception_url"].(string); ok && url != "" {
		exec.goInceptionURL = url
	}

	// 初始化连接信息
	exec.initConnections()

	return exec
}

// initConnections 初始化连接信息
func (e *MySQLExecutor) initConnections() {
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
		database, _ := cfg["database"].(string)

		if name != "" && database != "" {
			e.connections[name] = connectionInfo{
				Name:     name,
				Database: database,
			}
		}
	}
}

// Type 返回执行器类型
func (e *MySQLExecutor) Type() common.TaskType {
	return common.TaskTypeMySQL
}

// GetDatabaseType 返回数据库类型
func (e *MySQLExecutor) GetDatabaseType() string {
	return "mysql"
}

// Execute 执行 SQL（通过 goInception）
func (e *MySQLExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
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

	// 安全验证：在发送给 goInception 之前验证 SQL
	if err := e.validator.ValidateSQL(command); err != nil {
		if logCallback != nil {
			logCallback(taskID, "error", fmt.Sprintf("SQL security validation failed: %v", err))
		}
		return "", fmt.Errorf("security validation failed: %w", err)
	}

	// 记录审计日志
	if logCallback != nil {
		logCallback(taskID, "audit", "SQL passed security validation, sending to goInception")
	}

	// 解析扩展参数
	dbName := e.extractDatabaseName(params)
	// 数据库名可选，如果未提供，使用默认值（goInception 需要 db_name 参数）
	if dbName == "" {
		dbName = "mysql" // goInception 需要 db_name，使用默认值
		if logCallback != nil {
			logCallback(taskID, "info", "No database name specified, using default 'mysql' (database name can be specified in SQL as 'database.table')")
		}
	}

	// 解析 exec_options
	execOpts := e.extractExecOptions(params)

	// 是否备份（默认备份）
	backup := "1"
	if !execOpts.Backup {
		backup = "0"
	}

	// 记录元数据（如果有）
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Executing MySQL SQL via goInception (database: %s, can be overridden in SQL)", dbName))
		if metadata := e.extractMetadata(params); metadata != nil {
			if env, ok := metadata["env"].(string); ok {
				logCallback(taskID, "info", fmt.Sprintf("Environment: %s", env))
			}
			if creator, ok := metadata["creator"].(string); ok {
				logCallback(taskID, "info", fmt.Sprintf("Creator: %s", creator))
			}
		}
	}

	// 创建请求
	req := goInceptionRequest{
		SQL:    command,
		DbName: dbName,
		Backup: backup,
	}

	// 调用 goInception
	result, err := e.callGoInception(req, logCallback, taskID, taskID, startTime, execOpts)
	if err != nil {
		return "", err
	}

	return result, nil
}

// extractDatabaseName 从 params 中提取数据库名
func (e *MySQLExecutor) extractDatabaseName(params map[string]interface{}) string {
	if params == nil {
		return ""
	}

	// 优先使用 target.db 或 target.database
	if target, ok := params["target"].(map[string]interface{}); ok {
		if db, ok := target["db"].(string); ok && db != "" {
			return db
		}
		if db, ok := target["database"].(string); ok && db != "" {
			return db
		}
	}

	// 其次使用 database 参数
	if db, ok := params["database"].(string); ok && db != "" {
		return db
	}

	// 最后使用 connection 配置（向后兼容，但不推荐）
	connName := "default"
	if name, ok := params["connection"].(string); ok {
		connName = name
	}
	if connInfo, exists := e.connections[connName]; exists {
		return connInfo.Database
	}

	return ""
}

// execOptions 执行选项
type execOptions struct {
	TransBatchSize int
	Backup         bool
	SleepMs        int
	TimeoutMs      int
	Concurrency    int
}

// extractExecOptions 从 params 中提取执行选项
func (e *MySQLExecutor) extractExecOptions(params map[string]interface{}) execOptions {
	opts := execOptions{
		TransBatchSize: 200,
		Backup:         true,
		SleepMs:        0,
		TimeoutMs:      600000, // 10分钟
		Concurrency:    1,
	}

	if params == nil {
		return opts
	}

	// 兼容旧的 no_backup 参数
	if noBackup, ok := params["no_backup"].(bool); ok && noBackup {
		opts.Backup = false
	}

	// 解析 exec_options
	if execOpts, ok := params["exec_options"].(map[string]interface{}); ok {
		if batchSize, ok := execOpts["trans_batch_size"].(int); ok {
			opts.TransBatchSize = batchSize
		}
		if backup, ok := execOpts["backup"].(bool); ok {
			opts.Backup = backup
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

// extractMetadata 从 params 中提取元数据
func (e *MySQLExecutor) extractMetadata(params map[string]interface{}) map[string]interface{} {
	if params == nil {
		return nil
	}
	if metadata, ok := params["metadata"].(map[string]interface{}); ok {
		return metadata
	}
	return nil
}

// callGoInception 调用 goInception API
func (e *MySQLExecutor) callGoInception(req goInceptionRequest, logCallback LogCallback, taskID string, runID string, startTime time.Time, execOpts execOptions) (string, error) {
	url := strings.TrimSuffix(e.goInceptionURL, "/") + "/check"

	// 序列化请求
	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Sending request to goInception: %s", url))
	}

	// 创建 HTTP 请求
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := e.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to send request to goInception: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("goInception returned status %d: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var inceptionResp goInceptionResponse
	if err := json.Unmarshal(body, &inceptionResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// 处理响应
	return e.processResponse(&inceptionResp, logCallback, taskID, runID, startTime, execOpts)
}

// processResponse 处理 goInception 响应
func (e *MySQLExecutor) processResponse(resp *goInceptionResponse, logCallback LogCallback, taskID string, runID string, startTime time.Time, execOpts execOptions) (string, error) {
	var textResults []string
	var hasError bool
	var totalRowsAffected int64
	var maxErrorLevel int
	var lastStage string
	var lastErrorMsg string

	// 是否使用 JSON 格式（通过 exec_options 控制，默认文本格式保持兼容）
	useJSON := false
	if execOpts.Concurrency > 0 { // 临时使用这个字段判断，后续可以添加专门的 format 参数
		useJSON = false // 默认保持文本格式兼容
	}

	for _, result := range resp.Data {
		// 记录日志
		if logCallback != nil {
			level := "info"
			if result.ErrorLevel == 1 {
				level = "warn"
			} else if result.ErrorLevel == 2 {
				level = "error"
				hasError = true
			}

			msg := fmt.Sprintf("[%s] %s", result.Stage, result.StageStatus)
			if result.ErrorMsg != "" {
				msg += fmt.Sprintf(": %s", result.ErrorMsg)
			}
			if result.AffectedRows > 0 {
				msg += fmt.Sprintf(" (Affected rows: %d)", result.AffectedRows)
			}
			if result.ExecuteTime != "" {
				msg += fmt.Sprintf(" (Execute time: %s)", result.ExecuteTime)
			}

			logCallback(taskID, level, msg)

			// 如果有回滚 SQL，记录（预留，暂不处理）
			if result.RollbackSQL != "" {
				logCallback(taskID, "info", fmt.Sprintf("Rollback SQL generated: %s", result.RollbackSQL))
			}
		}

		// 累计统计信息
		totalRowsAffected += int64(result.AffectedRows)
		if result.ErrorLevel > maxErrorLevel {
			maxErrorLevel = result.ErrorLevel
		}
		lastStage = result.Stage
		if result.ErrorMsg != "" {
			lastErrorMsg = result.ErrorMsg
		}

		// 构建文本结果（向后兼容）
		resultStr := fmt.Sprintf("Order ID: %d\n", result.OrderID)
		resultStr += fmt.Sprintf("Stage: %s\n", result.Stage)
		resultStr += fmt.Sprintf("Status: %s\n", result.StageStatus)
		if result.ErrorMsg != "" {
			resultStr += fmt.Sprintf("Error: %s\n", result.ErrorMsg)
		}
		if result.AffectedRows > 0 {
			resultStr += fmt.Sprintf("Affected Rows: %d\n", result.AffectedRows)
		}
		if result.ExecuteTime != "" {
			resultStr += fmt.Sprintf("Execute Time: %s\n", result.ExecuteTime)
		}
		if result.BackupDBName != "" {
			resultStr += fmt.Sprintf("Backup DB: %s\n", result.BackupDBName)
		}
		if result.RollbackSQL != "" {
			resultStr += fmt.Sprintf("Rollback SQL: %s\n", result.RollbackSQL)
		}
		resultStr += fmt.Sprintf("SQL: %s\n", result.SQL)

		textResults = append(textResults, resultStr)
	}

	endTime := time.Now()
	duration := endTime.Sub(startTime)

	// 构建结构化结果
	execResult := &ExecutionResult{
		RunID:        runID,
		TaskID:       taskID,
		Success:      !hasError && resp.ErrorCode == 0,
		ErrorLevel:   maxErrorLevel,
		RowsAffected: totalRowsAffected,
		Stage:        lastStage,
		ExecuteTime:  duration.String(),
		ErrorMsg:     lastErrorMsg,
		StartAt:      startTime,
		EndAt:        endTime,
		TextResult:   strings.Join(textResults, "\n\n"),
	}

	// 如果有错误，设置错误信息
	if hasError || resp.ErrorCode != 0 {
		if execResult.ErrorMsg == "" {
			execResult.ErrorMsg = resp.ErrorMsg
			if execResult.ErrorMsg == "" {
				execResult.ErrorMsg = "SQL execution failed"
			}
		}
		execResult.Success = false
		execResult.ErrorLevel = 2
	}

	// 返回结果（当前使用文本格式保持兼容，后续可以通过参数控制）
	return FormatResult(execResult, useJSON)
}

// Cancel 取消执行
func (e *MySQLExecutor) Cancel(taskID string) error {
	// goInception 执行通过 HTTP 请求，无法直接取消
	// 可以通过 context 超时来控制
	return nil
}
