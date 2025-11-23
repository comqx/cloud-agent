package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type ChangeHandler struct {
	db *gorm.DB
}

func NewChangeHandler(db *gorm.DB) *ChangeHandler {
	return &ChangeHandler{db: db}
}

// ListChanges 获取变更列表
func (h *ChangeHandler) ListChanges(c *gin.Context) {
	var changes []model.Change
	if err := h.db.Find(&changes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": changes})
}

// CreateChange 创建变更
func (h *ChangeHandler) CreateChange(c *gin.Context) {
	var change model.Change
	if err := c.ShouldBindJSON(&change); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	change.ID = uuid.New().String()
	change.Status = "pending"

	if err := h.db.Create(&change).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": change})
}

// ListAuditLogs 获取审计日志
func (h *ChangeHandler) ListAuditLogs(c *gin.Context) {
	var logs []model.AuditLog
	if err := h.db.Order("timestamp desc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

// CreateAuditLog 记录审计日志 (Internal helper or API)
func (h *ChangeHandler) CreateAuditLog(c *gin.Context) {
	var log model.AuditLog
	if err := c.ShouldBindJSON(&log); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.ID = uuid.New().String()
	log.Timestamp = time.Now()

	if err := h.db.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": log})
}
