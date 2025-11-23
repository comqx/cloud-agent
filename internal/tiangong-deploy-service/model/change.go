package model

import (
	"time"

	"gorm.io/gorm"
)

// Change 变更单
type Change struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Title       string         `gorm:"type:varchar(200);not null" json:"title"`
	Type        string         `gorm:"type:varchar(50);not null" json:"type"` // standard, emergency, normal
	Status      string         `gorm:"type:varchar(50);default:'pending'" json:"status"`
	ApplicantID string         `gorm:"type:varchar(36)" json:"applicant_id"`
	ApproverID  string         `gorm:"type:varchar(36)" json:"approver_id"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// AuditLog 审计日志
type AuditLog struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	UserID    string    `gorm:"type:varchar(36);index" json:"user_id"`
	Action    string    `gorm:"type:varchar(100);not null" json:"action"`
	Resource  string    `gorm:"type:varchar(100)" json:"resource"`
	Details   string    `gorm:"type:text" json:"details"` // JSON details
	Timestamp time.Time `json:"timestamp"`
}
