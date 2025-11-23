package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type ReleaseHandler struct {
	db *gorm.DB
}

func NewReleaseHandler(db *gorm.DB) *ReleaseHandler {
	return &ReleaseHandler{db: db}
}

// ListReleases 获取发布列表
func (h *ReleaseHandler) ListReleases(c *gin.Context) {
	var releases []model.Release
	if err := h.db.Find(&releases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": releases})
}

// GetRelease 获取发布详情
func (h *ReleaseHandler) GetRelease(c *gin.Context) {
	id := c.Param("id")
	var release model.Release
	if err := h.db.Where("id = ?", id).First(&release).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Release not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": release})
}

// CreateRelease 创建发布
func (h *ReleaseHandler) CreateRelease(c *gin.Context) {
	var release model.Release
	if err := c.ShouldBindJSON(&release); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	release.ID = uuid.New().String()
	release.Status = "pending"

	if err := h.db.Create(&release).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": release})
}

// UpdateRelease 更新发布
func (h *ReleaseHandler) UpdateRelease(c *gin.Context) {
	id := c.Param("id")
	var release model.Release
	if err := h.db.Where("id = ?", id).First(&release).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Release not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	var input model.Release
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	release.Channel = input.Channel
	release.Status = input.Status

	if err := h.db.Save(&release).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": release})
}

// ApproveRelease 审批发布
func (h *ReleaseHandler) ApproveRelease(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Approved bool   `json:"approved"`
		Comment  string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var release model.Release
	if err := h.db.Where("id = ?", id).First(&release).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Release not found"})
		return
	}

	if input.Approved {
		release.Status = "approved"
		now := time.Now()
		release.ApprovedAt = &now
		// TODO: Set ApproverID from context
	} else {
		release.Status = "rejected"
	}

	if err := h.db.Save(&release).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": release})
}
