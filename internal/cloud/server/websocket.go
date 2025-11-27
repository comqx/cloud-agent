package server

import (
	"encoding/json"
	"log"

	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
	"github.com/gin-gonic/gin"
)

// handleWebSocket 处理 WebSocket 连接
func (s *Server) handleWebSocket(c *gin.Context) {
	// 在升级之前，获取协议信息（ws 或 wss）
	protocol := "ws"
	if c.Request.TLS != nil {
		protocol = "wss"
	}

	// 在升级之前，确保请求体已被读取（防止 Gin 在升级后读取）
	if c.Request.Body != nil {
		c.Request.Body.Close()
		c.Request.Body = nil
	}

	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// 升级后立即返回，避免 Gin 继续处理请求
	// 注意：不能在升级后访问 c.Request 或 c.Writer

	wsConn := common.NewWSConnection(conn)
	wsConn.SetProtocol(protocol) // 设置协议信息
	wsConn.Start()

	// 读取消息（从 readPump 的 channel 读取）
	go func() {
		for {
			msg, err := wsConn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				break
			}

			s.handleMessage(wsConn, msg)
		}
		wsConn.Close()
	}()
}

// handleMessage 处理 WebSocket 消息
func (s *Server) handleMessage(wsConn *common.WSConnection, msg *common.Message) {
	switch msg.Type {
	case common.MessageTypeAgentRegister:
		s.handleAgentRegister(wsConn, msg)
	case common.MessageTypeAgentHeartbeat:
		s.handleAgentHeartbeat(wsConn, msg)
	case common.MessageTypeTaskLog:
		s.handleTaskLog(wsConn, msg)
	case common.MessageTypeTaskComplete:
		s.handleTaskComplete(wsConn, msg)
	case common.MessageTypeTaskSubscribeLogs:
		s.handleTaskSubscribeLogs(wsConn, msg)
	default:
		wsConn.WriteMessage(common.NewErrorMessage(
			common.NewError("unknown message type: "+string(msg.Type)),
			msg.RequestID,
		))
	}
}

// handleAgentRegister 处理 Agent 注册
func (s *Server) handleAgentRegister(wsConn *common.WSConnection, msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var registerData common.AgentRegisterData
	if err := json.Unmarshal(dataBytes, &registerData); err != nil {
		wsConn.WriteMessage(common.NewErrorMessage(err, msg.RequestID))
		return
	}

	// 获取协议信息
	protocol := wsConn.GetProtocol()

	// 注册 Agent（传递协议信息）
	actualAgentID, err := s.agentMgr.RegisterAgent(registerData.AgentID, wsConn, &registerData, protocol)
	if err != nil {
		wsConn.WriteMessage(common.NewErrorMessage(err, msg.RequestID))
		return
	}

	// 发送注册成功响应
	response := common.NewMessage(common.MessageTypeAgentStatus, map[string]interface{}{
		"status":   "registered",
		"agent_id": actualAgentID,
	})
	response.RequestID = msg.RequestID
	wsConn.WriteMessage(response)
}

// handleAgentHeartbeat 处理 Agent 心跳
func (s *Server) handleAgentHeartbeat(wsConn *common.WSConnection, msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var heartbeatData map[string]interface{}
	if err := json.Unmarshal(dataBytes, &heartbeatData); err != nil {
		return
	}

	agentID, ok := heartbeatData["agent_id"].(string)
	if !ok {
		return
	}

	s.agentMgr.UpdateHeartbeat(agentID)
}

// handleTaskLog 处理任务日志
func (s *Server) handleTaskLog(wsConn *common.WSConnection, msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var logData common.TaskLogData
	if err := json.Unmarshal(dataBytes, &logData); err != nil {
		return
	}

	// 保存日志到数据库
	s.taskMgr.SaveLog(&logData)
}

// handleTaskComplete 处理任务完成
func (s *Server) handleTaskComplete(wsConn *common.WSConnection, msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var completeData common.TaskCompleteData
	if err := json.Unmarshal(dataBytes, &completeData); err != nil {
		return
	}

	// 更新任务状态
	s.taskMgr.CompleteTask(&completeData)
}

// handleTaskSubscribeLogs 处理任务日志订阅
func (s *Server) handleTaskSubscribeLogs(wsConn *common.WSConnection, msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var subscribeData map[string]interface{}
	if err := json.Unmarshal(dataBytes, &subscribeData); err != nil {
		wsConn.WriteMessage(common.NewErrorMessage(err, msg.RequestID))
		return
	}

	taskID, ok := subscribeData["task_id"].(string)
	if !ok {
		wsConn.WriteMessage(common.NewErrorMessage(
			common.NewError("task_id is required"),
			msg.RequestID,
		))
		return
	}

	// 订阅日志
	s.taskMgr.SubscribeLogs(taskID, wsConn)

	// 发送历史日志
	logs, err := s.db.GetTaskLogs(taskID, 1000)
	if err == nil {
		for _, log := range logs {
			logData := common.TaskLogData{
				TaskID:    log.TaskID,
				Level:     log.Level,
				Message:   log.Message,
				Timestamp: log.Timestamp.Unix(),
			}
			wsConn.WriteMessage(common.NewMessage(common.MessageTypeTaskLog, logData))
		}
	}

	// 发送订阅成功响应
	response := common.NewMessage(common.MessageTypeTaskSubscribeLogs, map[string]interface{}{
		"task_id": taskID,
		"status":  "subscribed",
	})
	response.RequestID = msg.RequestID
	wsConn.WriteMessage(response)
}
