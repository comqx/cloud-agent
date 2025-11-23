package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/gorm"
)

type ProductHandler struct {
	db *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// ListProducts 获取产品列表
func (h *ProductHandler) ListProducts(c *gin.Context) {
	var products []model.Product
	if err := h.db.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": products})
}

// GetProduct 获取产品详情
func (h *ProductHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")
	var product model.Product
	if err := h.db.Where("id = ?", id).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": product})
}

// CreateProduct 创建产品
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var product model.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.ID = uuid.New().String()

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": product})
}

// UpdateProduct 更新产品
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var product model.Product
	if err := h.db.Where("id = ?", id).First(&product).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	var input model.Product
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.Name = input.Name
	product.Description = input.Description

	if err := h.db.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": product})
}

// DeleteProduct 删除产品
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Where("id = ?", id).Delete(&model.Product{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}

// GetProductVersions 获取产品版本列表
func (h *ProductHandler) GetProductVersions(c *gin.Context) {
	productID := c.Param("id")
	var versions []model.ProductVersion
	if err := h.db.Where("product_id = ?", productID).Find(&versions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": versions})
}

// CreateProductVersion 创建产品版本
func (h *ProductHandler) CreateProductVersion(c *gin.Context) {
	productID := c.Param("id")
	var version model.ProductVersion
	if err := c.ShouldBindJSON(&version); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	version.ID = uuid.New().String()
	version.ProductID = productID

	if err := h.db.Create(&version).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": version})
}
