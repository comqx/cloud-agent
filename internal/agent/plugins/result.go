package plugins

import (
	"encoding/json"
	"fmt"
	"time"
)

// ExecutionResult 执行结果结构（支持 JSON 格式，保持文本格式兼容）
type ExecutionResult struct {
	RunID        string    `json:"run_id,omitempty"`        // 执行ID（预留）
	TaskID       string    `json:"task_id"`                 // 任务ID
	Success      bool      `json:"success"`                 // 是否成功
	ErrorLevel   int       `json:"error_level"`             // 0-正常，1-警告，2-错误
	RowsAffected int64     `json:"rows_affected,omitempty"` // 影响行数
	Stage        string    `json:"stage,omitempty"`          // 执行阶段（CHECKED, EXECUTED）
	RollbackSQL  string    `json:"rollback_sql,omitempty"`  // 回滚SQL（预留，goInception 已支持但暂不处理）
	BackupDBName string    `json:"backup_dbname,omitempty"` // 备份数据库名（goInception）
	ExecuteTime  string    `json:"execute_time,omitempty"`  // 执行耗时
	ErrorMsg     string    `json:"error_msg,omitempty"`     // 错误信息
	StartAt      time.Time `json:"start_at,omitempty"`      // 开始时间
	EndAt        time.Time `json:"end_at,omitempty"`        // 结束时间
	TextResult   string    `json:"text_result,omitempty"`    // 文本格式结果（向后兼容）
}

// ToJSON 转换为 JSON 字符串
func (r *ExecutionResult) ToJSON() (string, error) {
	data, err := json.Marshal(r)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ToText 转换为文本格式（向后兼容）
func (r *ExecutionResult) ToText() string {
	if r.TextResult != "" {
		return r.TextResult
	}
	
	// 如果没有文本结果，生成一个简单的文本格式
	result := ""
	if r.ErrorMsg != "" {
		result += "Error: " + r.ErrorMsg + "\n"
	}
	if r.RowsAffected > 0 {
		result += fmt.Sprintf("Affected Rows: %d\n", r.RowsAffected)
	}
	if r.ExecuteTime != "" {
		result += "Execute Time: " + r.ExecuteTime + "\n"
	}
	if r.Stage != "" {
		result += "Stage: " + r.Stage + "\n"
	}
	return result
}

// FormatResult 格式化结果（支持 JSON 和文本格式）
func FormatResult(result *ExecutionResult, useJSON bool) (string, error) {
	if useJSON {
		return result.ToJSON()
	}
	return result.ToText(), nil
}

