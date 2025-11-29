package security

import (
	"encoding/json"
	"log"
	"time"
)

// AuditLog 审计日志
type AuditLog struct {
	Timestamp  time.Time `json:"timestamp"`
	AgentID    string    `json:"agent_id"`
	TaskID     string    `json:"task_id"`
	TaskType   string    `json:"task_type"`
	Command    string    `json:"command"`
	Allowed    bool      `json:"allowed"`
	Reason     string    `json:"reason,omitempty"`
	Result     string    `json:"result,omitempty"` // success/failed
	Error      string    `json:"error,omitempty"`
	DurationMs int64     `json:"duration_ms,omitempty"`
}

// AuditLogger 审计日志记录器
type AuditLogger struct {
	agentID string
}

// NewAuditLogger 创建审计日志记录器
func NewAuditLogger(agentID string) *AuditLogger {
	return &AuditLogger{
		agentID: agentID,
	}
}

// LogCommandAttempt 记录命令执行尝试
func (l *AuditLogger) LogCommandAttempt(taskID, taskType, command string, allowed bool, reason string) {
	auditLog := &AuditLog{
		Timestamp: time.Now(),
		AgentID:   l.agentID,
		TaskID:    taskID,
		TaskType:  taskType,
		Command:   command,
		Allowed:   allowed,
		Reason:    reason,
	}
	l.writeLog(auditLog)
}

// LogCommandResult 记录命令执行结果
func (l *AuditLogger) LogCommandResult(taskID, taskType, command, result string, err error, duration time.Duration) {
	auditLog := &AuditLog{
		Timestamp:  time.Now(),
		AgentID:    l.agentID,
		TaskID:     taskID,
		TaskType:   taskType,
		Command:    command,
		Allowed:    true,
		Result:     result,
		DurationMs: duration.Milliseconds(),
	}
	if err != nil {
		auditLog.Error = err.Error()
	}
	l.writeLog(auditLog)
}

// writeLog 写入审计日志
func (l *AuditLogger) writeLog(auditLog *AuditLog) {
	data, err := json.Marshal(auditLog)
	if err != nil {
		log.Printf("[AUDIT] Failed to marshal audit log: %v", err)
		return
	}
	log.Printf("[AUDIT] %s", string(data))
}
