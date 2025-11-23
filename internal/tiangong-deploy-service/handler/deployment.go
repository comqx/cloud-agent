package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/client"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type DeploymentHandler struct {
	db          *gorm.DB
	cloudClient *client.CloudClient
}

func NewDeploymentHandler(db *gorm.DB, cloudClient *client.CloudClient) *DeploymentHandler {
	return &DeploymentHandler{
		db:          db,
		cloudClient: cloudClient,
	}
}

// ListDeployments 获取部署列表
func (h *DeploymentHandler) ListDeployments(c *gin.Context) {
	var deployments []model.Deployment
	if err := h.db.Find(&deployments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": deployments})
}

// GetDeployment 获取部署详情
func (h *DeploymentHandler) GetDeployment(c *gin.Context) {
	id := c.Param("id")
	var deployment model.Deployment
	if err := h.db.Where("id = ?", id).First(&deployment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": deployment})
}

// CreateDeployment 创建部署计划
func (h *DeploymentHandler) CreateDeployment(c *gin.Context) {
	var deployment model.Deployment
	if err := c.ShouldBindJSON(&deployment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deployment.ID = uuid.New().String()
	deployment.Status = "pending"

	if err := h.db.Create(&deployment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": deployment})
}

// ExecuteDeployment 执行部署
func (h *DeploymentHandler) ExecuteDeployment(c *gin.Context) {
	id := c.Param("id")
	var deployment model.Deployment
	if err := h.db.Where("id = ?", id).First(&deployment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found"})
		return
	}

	if deployment.Status != "pending" && deployment.Status != "failed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment is not in pending or failed state"})
		return
	}

	// Parse Plan to get Task details
	// Assuming Plan is a JSON string containing task details
	// For simplicity, let's assume Plan has "command" and "type"
	var plan struct {
		Type    string                 `json:"type"`
		Command string                 `json:"command"`
		Params  map[string]interface{} `json:"params"`
	}
	if err := json.Unmarshal([]byte(deployment.Plan), &plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deployment plan"})
		return
	}

	// Get Agent ID from Environment (Mock logic for now)
	// In reality, we should query Environment -> Agent mapping
	// For now, let's assume EnvironmentID is AgentID or we can get it from Environment config
	var env model.Environment
	if err := h.db.Where("id = ?", deployment.EnvironmentID).First(&env).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get environment"})
		return
	}
	// Simplified: assuming Environment Config has agent_id
	// In a real scenario, we might need a more complex resolution
	agentID := "agent-123" // Placeholder

	// Call Cloud Service to create task
	taskID, err := h.cloudClient.CreateTask(&client.CreateTaskRequest{
		AgentID: agentID,
		Type:    plan.Type,
		Command: plan.Command,
		Params:  plan.Params,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cloud task: " + err.Error()})
		return
	}

	// Update Deployment
	deployment.Status = "running"
	deployment.TaskID = taskID
	if err := h.db.Save(&deployment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": deployment})
}

// RollbackDeployment 回滚部署
func (h *DeploymentHandler) RollbackDeployment(c *gin.Context) {
	// TODO: Implement rollback logic
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
