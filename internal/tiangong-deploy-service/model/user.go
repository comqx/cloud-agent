package model

import (
	"time"

	"gorm.io/gorm"
)

// User 用户
type User struct {
	ID        string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username  string         `gorm:"type:varchar(50);not null;uniqueIndex" json:"username"`
	Password  string         `gorm:"type:varchar(100);not null" json:"-"` // Hash
	Email     string         `gorm:"type:varchar(100)" json:"email"`
	RoleID    string         `gorm:"type:varchar(36)" json:"role_id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserGroup 用户组
type UserGroup struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string         `gorm:"type:varchar(50);not null;uniqueIndex" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Role 角色
type Role struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string         `gorm:"type:varchar(50);not null;uniqueIndex" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Permissions string         `gorm:"type:text" json:"permissions"` // JSON permissions list
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
