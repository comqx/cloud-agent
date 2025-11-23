package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type EnvironmentHandler struct {
	db *gorm.DB
}

func NewEnvironmentHandler(db *gorm.DB) *EnvironmentHandler {
	return &EnvironmentHandler{db: db}
}

// ListEnvironments 获取环境列表
func (h *EnvironmentHandler) ListEnvironments(c *gin.Context) {
	var envs []model.Environment
	if err := h.db.Find(&envs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": envs})
}

// GetEnvironment 获取环境详情
func (h *EnvironmentHandler) GetEnvironment(c *gin.Context) {
	id := c.Param("id")
	var env model.Environment
	if err := h.db.Where("id = ?", id).First(&env).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": env})
}

// CreateEnvironment 创建环境
func (h *EnvironmentHandler) CreateEnvironment(c *gin.Context) {
	var env model.Environment
	if err := c.ShouldBindJSON(&env); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	env.ID = uuid.New().String()
	env.Status = "active" // Default status

	if err := h.db.Create(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": env})
}

// UpdateEnvironment 更新环境
func (h *EnvironmentHandler) UpdateEnvironment(c *gin.Context) {
	id := c.Param("id")
	var env model.Environment
	if err := h.db.Where("id = ?", id).First(&env).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Environment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	var input model.Environment
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	env.Name = input.Name
	env.Type = input.Type
	env.Description = input.Description
	env.Config = input.Config
	// Status is usually updated via other means, but allow it here for now

	if err := h.db.Save(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": env})
}

// DeleteEnvironment 删除环境
func (h *EnvironmentHandler) DeleteEnvironment(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Where("id = ?", id).Delete(&model.Environment{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Environment deleted"})
}
