package model

import (
	"time"

	"gorm.io/gorm"
)

// Release 发布
type Release struct {
	ID               string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProductVersionID string         `gorm:"type:varchar(36);not null;index" json:"product_version_id"`
	Channel          string         `gorm:"type:varchar(50);not null" json:"channel"` // RELEASE, CANARY, STABLE
	Status           string         `gorm:"type:varchar(50);default:'pending'" json:"status"`
	ApproverID       string         `gorm:"type:varchar(36)" json:"approver_id"`
	ApprovedAt       *time.Time     `json:"approved_at"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// Deployment 部署
type Deployment struct {
	ID            string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ReleaseID     string         `gorm:"type:varchar(36);not null;index" json:"release_id"`
	EnvironmentID string         `gorm:"type:varchar(36);not null;index" json:"environment_id"`
	Status        string         `gorm:"type:varchar(50);default:'pending'" json:"status"` // pending, running, success, failed
	Plan          string         `gorm:"type:text" json:"plan"`                            // JSON deployment plan
	TaskID        string         `gorm:"type:varchar(36)" json:"task_id"`                  // Associated Cloud Task ID
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
