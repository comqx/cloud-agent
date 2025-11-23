package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type CloudResourceHandler struct {
	db *gorm.DB
}

func NewCloudResourceHandler(db *gorm.DB) *CloudResourceHandler {
	return &CloudResourceHandler{db: db}
}

// ListAgents 获取 Agent 列表
func (h *CloudResourceHandler) ListAgents(c *gin.Context) {
	var agents []model.Agent
	if err := h.db.Find(&agents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": agents})
}

// GetAgent 获取 Agent 详情
func (h *CloudResourceHandler) GetAgent(c *gin.Context) {
	id := c.Param("id")
	var agent model.Agent
	if err := h.db.Where("id = ?", id).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": agent})
}

// GetAgentStatus 获取 Agent 状态
func (h *CloudResourceHandler) GetAgentStatus(c *gin.Context) {
	id := c.Param("id")
	var agent model.Agent
	if err := h.db.Select("status").Where("id = ?", id).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": agent.Status}})
}

// ListTasks 获取任务列表
func (h *CloudResourceHandler) ListTasks(c *gin.Context) {
	var tasks []model.Task
	// Support filtering by agent_id
	query := h.db
	if agentID := c.Query("agent_id"); agentID != "" {
		query = query.Where("agent_id = ?", agentID)
	}

	if err := query.Order("created_at desc").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tasks})
}

// GetTask 获取任务详情
func (h *CloudResourceHandler) GetTask(c *gin.Context) {
	id := c.Param("id")
	var task model.Task
	if err := h.db.Where("id = ?", id).First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": task})
}

// GetTaskLogs 获取任务日志
func (h *CloudResourceHandler) GetTaskLogs(c *gin.Context) {
	id := c.Param("id")
	var logs []model.Log
	if err := h.db.Where("task_id = ?", id).Order("created_at asc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

// ListFiles 获取文件列表
func (h *CloudResourceHandler) ListFiles(c *gin.Context) {
	var files []model.File
	if err := h.db.Order("created_at desc").Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": files})
}

// GetFile 获取文件详情
func (h *CloudResourceHandler) GetFile(c *gin.Context) {
	id := c.Param("id")
	var file model.File
	if err := h.db.Where("id = ?", id).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": file})
}
