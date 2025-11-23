package server

import (
	"log"
	"net/http"
	"os"

	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/agent"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/storage"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/task"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Server Cloud 服务器
type Server struct {
	router      *gin.Engine
	db          *storage.Database
	agentMgr    *agent.Manager
	taskMgr     *task.Manager
	upgrader    websocket.Upgrader
	fileStorage string
}

// NewServer 创建新服务器
func NewServer(db *storage.Database, fileStorage string) *Server {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 允许所有来源，生产环境应该限制
		},
	}

	s := &Server{
		router:      gin.Default(),
		db:          db,
		upgrader:    upgrader,
		fileStorage: fileStorage,
	}

	// 初始化管理器
	s.agentMgr = agent.NewManager(db, s.handleAgentMessage)
	s.taskMgr = task.NewManager(db, s.agentMgr)

	// 确保文件存储目录存在
	if err := os.MkdirAll(fileStorage, 0755); err != nil {
		log.Fatalf("Failed to create file storage directory: %v", err)
	}

	s.setupRoutes()

	return s
}

// setupRoutes 设置路由
func (s *Server) setupRoutes() {
	// API 路由
	api := s.router.Group("/api/v1")
	{
		// Agent 相关
		api.GET("/agents", s.listAgents)
		api.GET("/agents/:id", s.getAgent)
		api.GET("/agents/:id/status", s.getAgentStatus)

		// 任务相关
		api.POST("/tasks", s.createTask)
		api.GET("/tasks", s.listTasks)
		api.GET("/tasks/:id", s.getTask)
		api.GET("/tasks/:id/logs", s.getTaskLogs)
		api.POST("/tasks/:id/cancel", s.cancelTask)

		// 文件相关
		api.POST("/files", s.uploadFile)
		api.GET("/files", s.listFiles)
		api.GET("/files/:id", s.getFile)
		api.GET("/files/:id/download", s.downloadFile)
		api.POST("/files/:id/distribute", s.distributeFile)
	}

	// WebSocket 路由
	s.router.GET("/ws", s.handleWebSocket)

	// 静态文件服务（用于 Cloud UI）
	s.router.Static("/static", "./cloud-ui/dist")
	s.router.StaticFile("/", "./cloud-ui/dist/index.html")
}

// Run 启动服务器
func (s *Server) Run(addr string) error {
	log.Printf("Cloud server starting on %s", addr)
	return s.router.Run(addr)
}

// handleAgentMessage 处理来自 Agent 的消息
func (s *Server) handleAgentMessage(agentID string, msgType string, data interface{}) {
	// 这里可以处理来自 Agent 的消息
	// 例如：任务完成通知、日志推送等
}
