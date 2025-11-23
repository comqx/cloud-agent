package server

import (
	"github.com/gin-gonic/gin"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/client"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/handler"
	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/model"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Server struct {
	engine      *gin.Engine
	db          *gorm.DB
	cloudClient *client.CloudClient
}

func NewServer(dsn string) (*Server, error) {
	// Connect to Database
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto Migrate
	if err := db.AutoMigrate(
		&model.Environment{},
		&model.Product{},
		&model.ProductVersion{},
		&model.User{},
		&model.UserGroup{},
		&model.Role{},
		&model.Release{},
		&model.Deployment{},
		&model.Change{},
		&model.AuditLog{},
	); err != nil {
		return nil, err
	}

	// Initialize Cloud Client
	// TODO: Make Cloud URL configurable
	cloudClient := client.NewCloudClient("http://localhost:8080")

	// Initialize Gin
	r := gin.Default()

	s := &Server{
		engine:      r,
		db:          db,
		cloudClient: cloudClient,
	}

	s.setupRoutes()

	return s, nil
}

func (s *Server) Run(addr string) error {
	return s.engine.Run(addr)
}

func (s *Server) setupRoutes() {
	// Handlers
	envHandler := handler.NewEnvironmentHandler(s.db)
	productHandler := handler.NewProductHandler(s.db)
	userHandler := handler.NewUserHandler(s.db)
	releaseHandler := handler.NewReleaseHandler(s.db)
	deploymentHandler := handler.NewDeploymentHandler(s.db, s.cloudClient)
	changeHandler := handler.NewChangeHandler(s.db)
	dashboardHandler := handler.NewDashboardHandler(s.db)

	api := s.engine.Group("/api/v1")
	{
		// Health Check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Dashboard Routes
		api.GET("/dashboard/stats", dashboardHandler.GetStats)

		// Environment Routes
		api.GET("/environments", envHandler.ListEnvironments)
		api.GET("/environments/:id", envHandler.GetEnvironment)
		api.POST("/environments", envHandler.CreateEnvironment)
		api.PUT("/environments/:id", envHandler.UpdateEnvironment)
		api.DELETE("/environments/:id", envHandler.DeleteEnvironment)

		// Product Routes
		api.GET("/products", productHandler.ListProducts)
		api.GET("/products/:id", productHandler.GetProduct)
		api.POST("/products", productHandler.CreateProduct)
		api.PUT("/products/:id", productHandler.UpdateProduct)
		api.DELETE("/products/:id", productHandler.DeleteProduct)

		// Product Version Routes
		api.GET("/products/:id/versions", productHandler.GetProductVersions)
		api.POST("/products/:id/versions", productHandler.CreateProductVersion)

		// User Routes
		api.GET("/users", userHandler.ListUsers)
		api.POST("/users", userHandler.CreateUser)

		// Role Routes
		api.GET("/roles", userHandler.ListRoles)
		api.POST("/roles", userHandler.CreateRole)

		// Release Routes
		api.GET("/releases", releaseHandler.ListReleases)
		api.GET("/releases/:id", releaseHandler.GetRelease)
		api.POST("/releases", releaseHandler.CreateRelease)
		api.PUT("/releases/:id", releaseHandler.UpdateRelease)
		api.POST("/releases/:id/approve", releaseHandler.ApproveRelease)

		// Deployment Routes
		api.GET("/deployments", deploymentHandler.ListDeployments)
		api.GET("/deployments/:id", deploymentHandler.GetDeployment)
		api.POST("/deployments", deploymentHandler.CreateDeployment)
		api.POST("/deployments/:id/execute", deploymentHandler.ExecuteDeployment)

		// Change Routes
		api.GET("/changes", changeHandler.ListChanges)
		api.POST("/changes", changeHandler.CreateChange)

		// Audit Log Routes
		api.GET("/audit-logs", changeHandler.ListAuditLogs)
		api.POST("/audit-logs", changeHandler.CreateAuditLog)

		// Cloud Resource Routes (Read-Only)
		cloudHandler := handler.NewCloudResourceHandler(s.db)

		// Agents
		api.GET("/agents", cloudHandler.ListAgents)
		api.GET("/agents/:id", cloudHandler.GetAgent)
		api.GET("/agents/:id/status", cloudHandler.GetAgentStatus)

		// Tasks
		api.GET("/tasks", cloudHandler.ListTasks)
		api.GET("/tasks/:id", cloudHandler.GetTask)
		api.GET("/tasks/:id/logs", cloudHandler.GetTaskLogs)

		// Files
		api.GET("/files", cloudHandler.ListFiles)
		api.GET("/files/:id", cloudHandler.GetFile)
	}
}
