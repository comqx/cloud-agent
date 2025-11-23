package model

import (
	"time"
)

// Agent 代理节点 (Shared Table)
type Agent struct {
	ID        string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name      string     `gorm:"type:varchar(100);not null" json:"name"`
	Hostname  string     `gorm:"type:varchar(100);not null" json:"hostname"`
	IP        string     `gorm:"type:varchar(50);not null" json:"ip"`
	Version   string     `gorm:"type:varchar(50)" json:"version"`
	Env       string     `gorm:"type:varchar(50);index" json:"env"` // K8s cluster name
	Status    string     `gorm:"type:varchar(20);default:'offline'" json:"status"`
	LastSeen  *time.Time `json:"last_seen"`
	Metadata  string     `gorm:"type:text" json:"metadata"` // JSON metadata
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// Task 任务 (Shared Table)
type Task struct {
	ID         string     `gorm:"primaryKey;type:varchar(36)" json:"id"`
	AgentID    string     `gorm:"type:varchar(36);not null;index" json:"agent_id"`
	Type       string     `gorm:"type:varchar(50);not null" json:"type"` // shell, file, etc.
	Command    string     `gorm:"type:text" json:"command"`
	Params     string     `gorm:"type:text" json:"params"` // JSON params
	FileID     string     `gorm:"type:varchar(36);index" json:"file_id"`
	Status     string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Result     string     `gorm:"type:text" json:"result"`
	Error      string     `gorm:"type:text" json:"error"`
	StartedAt  *time.Time `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// Log 任务日志 (Shared Table)
type Log struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TaskID    string    `gorm:"type:varchar(36);not null;index" json:"task_id"`
	Level     string    `gorm:"type:varchar(10)" json:"level"` // info, error, warn, debug
	Message   string    `gorm:"type:text" json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// File 文件 (Shared Table)
type File struct {
	ID          string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Path        string    `gorm:"type:varchar(512);not null" json:"path"` // Storage path
	Size        int64     `gorm:"type:bigint" json:"size"`
	ContentType string    `gorm:"type:varchar(100)" json:"content_type"`
	MD5         string    `gorm:"type:varchar(64);index" json:"md5"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
