package server

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
)

// listAgents 列出所有 Agent
func (s *Server) listAgents(c *gin.Context) {
	agents, err := s.agentMgr.ListAgents()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, agents)
}

// getAgent 获取 Agent 信息
func (s *Server) getAgent(c *gin.Context) {
	agentID := c.Param("id")
	agent, err := s.db.GetAgent(agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}
	c.JSON(http.StatusOK, agent)
}

// getAgentStatus 获取 Agent 状态
func (s *Server) getAgentStatus(c *gin.Context) {
	agentID := c.Param("id")
	status := s.agentMgr.GetAgentStatus(agentID)
	c.JSON(http.StatusOK, gin.H{"status": status})
}

// deleteAgent 删除 Agent
func (s *Server) deleteAgent(c *gin.Context) {
	agentID := c.Param("id")
	if err := s.agentMgr.DeleteAgent(agentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "agent deleted"})
}

// createTask 创建任务
func (s *Server) createTask(c *gin.Context) {
	var req struct {
		AgentID string                 `json:"agent_id" binding:"required"`
		Type    common.TaskType        `json:"type" binding:"required"`
		Command string                 `json:"command"`
		Params  map[string]interface{} `json:"params"`
		FileID  string                 `json:"file_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := s.taskMgr.CreateTask(req.AgentID, req.Type, req.Command, req.Params, req.FileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// listTasks 列出任务
func (s *Server) listTasks(c *gin.Context) {
	agentID := c.Query("agent_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	tasks, err := s.db.ListTasks(agentID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// getTask 获取任务信息
func (s *Server) getTask(c *gin.Context) {
	taskID := c.Param("id")
	task, err := s.db.GetTask(taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}
	c.JSON(http.StatusOK, task)
}

// getTaskLogs 获取任务日志
func (s *Server) getTaskLogs(c *gin.Context) {
	taskID := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "1000"))

	logs, err := s.db.GetTaskLogs(taskID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// cancelTask 取消任务
func (s *Server) cancelTask(c *gin.Context) {
	taskID := c.Param("id")
	if err := s.taskMgr.CancelTask(taskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "task canceled"})
}

// uploadFile 上传文件
func (s *Server) uploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fileInfo, err := s.taskMgr.UploadFile(file, s.fileStorage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, fileInfo)
}

// listFiles 列出文件
func (s *Server) listFiles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	files, err := s.db.ListFiles(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, files)
}

// getFile 获取文件信息
func (s *Server) getFile(c *gin.Context) {
	fileID := c.Param("id")
	file, err := s.db.GetFile(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	c.JSON(http.StatusOK, file)
}

// downloadFile 下载文件
func (s *Server) downloadFile(c *gin.Context) {
	fileID := c.Param("id")
	file, err := s.db.GetFile(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	c.File(file.Path)
}

// distributeFile 分发文件到 Agent
func (s *Server) distributeFile(c *gin.Context) {
	fileID := c.Param("id")
	var req struct {
		AgentIDs []string `json:"agent_ids" binding:"required"`
		Path     string   `json:"path"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := s.taskMgr.DistributeFile(fileID, req.AgentIDs, req.Path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "file distribution started"})
}
