package model

import (
	"time"

	"gorm.io/gorm"
)

// Environment 环境
type Environment struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Type        string         `gorm:"type:varchar(50);not null" json:"type"` // dev, test, prod
	Description string         `gorm:"type:text" json:"description"`
	Config      string         `gorm:"type:text" json:"config"` // JSON config
	Status      string         `gorm:"type:varchar(50);default:'unknown'" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Product 产品
type Product struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ProductVersion 产品版本
type ProductVersion struct {
	ID        string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ProductID string         `gorm:"type:varchar(36);not null;index" json:"product_id"`
	Version   string         `gorm:"type:varchar(50);not null" json:"version"`
	Artifacts string         `gorm:"type:text" json:"artifacts"` // JSON artifacts list
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
