package models

import (
	"time"
)

// AgentStatus Agent 状态
type AgentStatus string

const (
	AgentStatusOnline  AgentStatus = "online"
	AgentStatusOffline AgentStatus = "offline"
	AgentStatusUnknown AgentStatus = "unknown"
)

// Agent Agent 节点信息
type Agent struct {
	ID          string      `json:"id" gorm:"primaryKey"`
	Name        string      `json:"name" gorm:"not null"`
	Hostname    string      `json:"hostname"`
	IP          string      `json:"ip"`
	Version     string      `json:"version"`
	Status      AgentStatus `json:"status" gorm:"type:varchar(20);default:'unknown'"`
	LastSeen    *time.Time  `json:"last_seen"`
	Tags        []string    `json:"tags" gorm:"serializer:json"` // Agent 标签
	Metadata    string      `json:"metadata" gorm:"type:text"`   // JSON 格式的元数据
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// TableName 指定表名
func (Agent) TableName() string {
	return "agents"
}

