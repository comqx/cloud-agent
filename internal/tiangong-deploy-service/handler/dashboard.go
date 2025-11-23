package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	db *gorm.DB
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

type DashboardStats struct {
	Environments EnvironmentStats `json:"environments"`
	Deployments  DeploymentStats  `json:"deployments"`
	Tasks        TaskStats        `json:"tasks"`
	Agents       AgentStats       `json:"agents"`
	Changes      ChangeStats      `json:"changes"`
	Alerts       AlertStats       `json:"alerts"`
}

type EnvironmentStats struct {
	Total   int64 `json:"total"`
	Online  int64 `json:"online"`
	Offline int64 `json:"offline"`
}

type DeploymentStats struct {
	Today       int64   `json:"today"`
	ThisWeek    int64   `json:"this_week"`
	SuccessRate float64 `json:"success_rate"`
	Success     int64   `json:"success"`
	Failed      int64   `json:"failed"`
	Running     int64   `json:"running"`
}

type TaskStats struct {
	Today       int64            `json:"today"`
	SuccessRate float64          `json:"success_rate"`
	ByType      map[string]int64 `json:"by_type"`
}

type AgentStats struct {
	Total  int64 `json:"total"`
	Online int64 `json:"online"`
	Health int64 `json:"health"`
}

type ChangeStats struct {
	PendingApproval int64   `json:"pending_approval"`
	ThisWeek        int64   `json:"this_week"`
	SuccessRate     float64 `json:"success_rate"`
}

type AlertStats struct {
	Total    int64 `json:"total"`
	Critical int64 `json:"critical"`
	Warning  int64 `json:"warning"`
}

// GetStats 获取仪表盘统计数据
func (h *DashboardHandler) GetStats(c *gin.Context) {
	stats := DashboardStats{}

	// Environment Stats
	h.db.Model(&model.Environment{}).Count(&stats.Environments.Total)
	h.db.Model(&model.Environment{}).Where("status = ?", "active").Count(&stats.Environments.Online)
	stats.Environments.Offline = stats.Environments.Total - stats.Environments.Online

	// Agent Stats
	h.db.Model(&model.Agent{}).Count(&stats.Agents.Total)
	h.db.Model(&model.Agent{}).Where("status = ?", "online").Count(&stats.Agents.Online)
	stats.Agents.Health = stats.Agents.Online

	// Deployment Stats
	today := time.Now().Truncate(24 * time.Hour)
	weekAgo := time.Now().AddDate(0, 0, -7)

	h.db.Model(&model.Deployment{}).Where("created_at >= ?", today).Count(&stats.Deployments.Today)
	h.db.Model(&model.Deployment{}).Where("created_at >= ?", weekAgo).Count(&stats.Deployments.ThisWeek)
	h.db.Model(&model.Deployment{}).Where("status = ?", "success").Count(&stats.Deployments.Success)
	h.db.Model(&model.Deployment{}).Where("status = ?", "failed").Count(&stats.Deployments.Failed)
	h.db.Model(&model.Deployment{}).Where("status = ?", "running").Count(&stats.Deployments.Running)

	var totalDeployments int64
	h.db.Model(&model.Deployment{}).Count(&totalDeployments)
	if totalDeployments > 0 {
		stats.Deployments.SuccessRate = float64(stats.Deployments.Success) / float64(totalDeployments) * 100
	}

	// Task Stats
	h.db.Model(&model.Task{}).Where("created_at >= ?", today).Count(&stats.Tasks.Today)

	var totalTasks int64
	var successTasks int64
	h.db.Model(&model.Task{}).Count(&totalTasks)
	h.db.Model(&model.Task{}).Where("status = ?", "success").Count(&successTasks)
	if totalTasks > 0 {
		stats.Tasks.SuccessRate = float64(successTasks) / float64(totalTasks) * 100
	}

	// Task by type
	stats.Tasks.ByType = make(map[string]int64)
	var taskTypes []struct {
		Type  string
		Count int64
	}
	h.db.Model(&model.Task{}).Select("type, count(*) as count").Group("type").Scan(&taskTypes)
	for _, tt := range taskTypes {
		stats.Tasks.ByType[tt.Type] = tt.Count
	}

	// Change Stats
	h.db.Model(&model.Change{}).Where("status = ?", "pending").Count(&stats.Changes.PendingApproval)
	h.db.Model(&model.Change{}).Where("created_at >= ?", weekAgo).Count(&stats.Changes.ThisWeek)

	var totalChanges int64
	var completedChanges int64
	h.db.Model(&model.Change{}).Where("status IN ?", []string{"completed", "rolled_back"}).Count(&totalChanges)
	h.db.Model(&model.Change{}).Where("status = ?", "completed").Count(&completedChanges)
	if totalChanges > 0 {
		stats.Changes.SuccessRate = float64(completedChanges) / float64(totalChanges) * 100
	}

	// Alert Stats (placeholder - not implemented yet)
	stats.Alerts.Total = 0
	stats.Alerts.Critical = 0
	stats.Alerts.Warning = 0

	c.JSON(http.StatusOK, gin.H{"data": stats})
}
