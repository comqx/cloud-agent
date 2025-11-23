package common

import (
	"time"
)

// AgentStatus Agent 状态
type AgentStatus string

const (
	AgentStatusOnline  AgentStatus = "online"
	AgentStatusOffline AgentStatus = "offline"
	AgentStatusError   AgentStatus = "error"
)

// Agent Agent 节点信息
type Agent struct {
	ID          string      `json:"id" gorm:"primaryKey"`
	Name        string      `json:"name" gorm:"not null"`
	Hostname    string      `json:"hostname"`
	IP          string      `json:"ip"`
	Version     string      `json:"version"`
	Env         string      `json:"env" gorm:"index"` // K8s 集群名称
	Status      AgentStatus `json:"status" gorm:"default:'offline'"`
	LastSeen    *time.Time  `json:"last_seen"`
	Metadata    string      `json:"metadata" gorm:"type:text"` // JSON 格式的元数据
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// TaskType 任务类型
type TaskType string

const (
	TaskTypeShell TaskType = "shell"
	// 数据库类型
	TaskTypeMySQL        TaskType = "mysql"
	TaskTypePostgres     TaskType = "postgres"
	TaskTypeRedis        TaskType = "redis"
	TaskTypeMongo        TaskType = "mongo"
	TaskTypeElasticsearch TaskType = "elasticsearch"
	TaskTypeClickHouse   TaskType = "clickhouse"
	TaskTypeDoris        TaskType = "doris"
	// 兼容旧版本
	TaskTypeSQL TaskType = "sql" // 已废弃，使用 mysql
	// 其他类型
	TaskTypeK8s  TaskType = "k8s"
	TaskTypeAPI  TaskType = "api"
	TaskTypeFile TaskType = "file"
)

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusPending TaskStatus = "pending"
	TaskStatusRunning TaskStatus = "running"
	TaskStatusSuccess TaskStatus = "success"
	TaskStatusFailed  TaskStatus = "failed"
	TaskStatusCanceled TaskStatus = "canceled"
)

// Task 任务信息
type Task struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	AgentID     string     `json:"agent_id" gorm:"index;not null"`
	Type        TaskType   `json:"type" gorm:"not null"`
	Status      TaskStatus `json:"status" gorm:"default:'pending'"`
	Command     string     `json:"command" gorm:"type:text"` // 执行的命令或脚本内容
	Params      string     `json:"params" gorm:"type:text"`  // JSON 格式的参数
	FileID      string     `json:"file_id" gorm:"index"`     // 关联的文件ID（如果有）
	Result      string     `json:"result" gorm:"type:text"`   // 执行结果
	Error       string     `json:"error" gorm:"type:text"`   // 错误信息
	StartedAt   *time.Time `json:"started_at"`
	FinishedAt  *time.Time `json:"finished_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Log 日志记录
type Log struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TaskID    string    `json:"task_id" gorm:"index;not null"`
	Level     string    `json:"level"` // info, error, warn, debug
	Message   string    `json:"message" gorm:"type:text"`
	Timestamp time.Time `json:"timestamp"`
}

// File 文件信息
type File struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Path        string    `json:"path" gorm:"not null"` // 存储路径
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	MD5         string    `json:"md5" gorm:"index"` // 文件MD5，用于去重
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TaskFile 任务文件关联表
type TaskFile struct {
	ID     uint   `json:"id" gorm:"primaryKey"`
	TaskID string `json:"task_id" gorm:"index;not null"`
	FileID string `json:"file_id" gorm:"index;not null"`
}

