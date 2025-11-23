package agent

import (
	"sync"
	"time"

	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/storage"
)

// Manager Agent 管理器
type Manager struct {
	db          *storage.Database
	connections map[string]*common.WSConnection // agentID -> connection
	agents      map[string]*common.Agent       // agentID -> agent
	mu          sync.RWMutex
	messageHandler func(agentID string, msgType string, data interface{})
}

// NewManager 创建 Agent 管理器
func NewManager(db *storage.Database, messageHandler func(agentID string, msgType string, data interface{})) *Manager {
	return &Manager{
		db:          db,
		connections: make(map[string]*common.WSConnection),
		agents:      make(map[string]*common.Agent),
		messageHandler: messageHandler,
	}
}

// RegisterAgent 注册 Agent，返回实际的 agentID
func (m *Manager) RegisterAgent(agentID string, conn *common.WSConnection, data *common.AgentRegisterData) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 根据 env-主机名查找或创建 Agent（保证唯一性）
	var agent *common.Agent
	var err error
	
	// 使用 env（可能为空字符串）
	env := data.Env
	
	// 先尝试根据 env-主机名查找
	agent, err = m.db.GetAgentByEnvHostname(env, data.Hostname)
	if err != nil {
		// 不存在，创建新 Agent（使用 env-主机名作为 ID）
		if env == "" {
			agentID = data.Hostname
		} else {
			agentID = env + "-" + data.Hostname
		}
		agent = &common.Agent{
			ID:        agentID,
			Name:      data.Name,
			Hostname:  data.Hostname,
			IP:        data.IP,
			Version:   data.Version,
			Env:       env,
			Status:    common.AgentStatusOnline,
			LastSeen:  &[]time.Time{time.Now()}[0],
		}
		if err := m.db.CreateAgent(agent); err != nil {
			return "", err
		}
	} else {
		// 已存在，更新现有 Agent
		agentID = agent.ID // 使用数据库中的 ID
		agent.Name = data.Name
		agent.Hostname = data.Hostname
		agent.IP = data.IP
		agent.Version = data.Version
		agent.Env = env
		agent.Status = common.AgentStatusOnline
		now := time.Now()
		agent.LastSeen = &now
		if err := m.db.UpdateAgent(agent); err != nil {
			return "", err
		}
	}

	// 如果已有连接，先关闭
	if oldConn, exists := m.connections[agentID]; exists {
		oldConn.Close()
	}

	m.connections[agentID] = conn
	m.agents[agentID] = agent

	return agentID, nil
}

// UnregisterAgent 注销 Agent
func (m *Manager) UnregisterAgent(agentID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conn, exists := m.connections[agentID]; exists {
		conn.Close()
		delete(m.connections, agentID)
	}

	if agent, exists := m.agents[agentID]; exists {
		agent.Status = common.AgentStatusOffline
		m.db.UpdateAgent(agent)
		delete(m.agents, agentID)
	}
}

// GetConnection 获取 Agent 连接
func (m *Manager) GetConnection(agentID string) (*common.WSConnection, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	conn, exists := m.connections[agentID]
	return conn, exists
}

// GetAgentStatus 获取 Agent 状态
func (m *Manager) GetAgentStatus(agentID string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if agent, exists := m.agents[agentID]; exists {
		return string(agent.Status)
	}
	return string(common.AgentStatusOffline)
}

// UpdateHeartbeat 更新心跳
func (m *Manager) UpdateHeartbeat(agentID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if agent, exists := m.agents[agentID]; exists {
		now := time.Now()
		agent.LastSeen = &now
		agent.Status = common.AgentStatusOnline
		m.db.UpdateAgentStatus(agentID, common.AgentStatusOnline)
	}
}

// SendMessage 向 Agent 发送消息
func (m *Manager) SendMessage(agentID string, msg *common.Message) error {
	conn, exists := m.GetConnection(agentID)
	if !exists {
		return common.NewError("agent not connected")
	}

	if conn.IsClosed() {
		m.UnregisterAgent(agentID)
		return common.NewError("agent connection closed")
	}

	return conn.WriteMessage(msg)
}

// ListAgents 列出所有 Agent（从数据库查询，并根据连接状态更新）
func (m *Manager) ListAgents() ([]*common.Agent, error) {
	// 从数据库查询所有 agents
	dbAgents, err := m.db.ListAgents()
	if err != nil {
		return nil, err
	}

	m.mu.RLock()
	// 创建连接状态映射
	connectedAgents := make(map[string]bool)
	for agentID := range m.connections {
		connectedAgents[agentID] = true
	}
	m.mu.RUnlock()

	// 更新状态并返回
	now := time.Now()
	for _, agent := range dbAgents {
		if connectedAgents[agent.ID] {
			// 有连接，状态为在线
			agent.Status = common.AgentStatusOnline
		} else {
			// 无连接，检查最后活跃时间
			if agent.LastSeen != nil {
				// 如果超过 2 分钟没有心跳，标记为离线
				if now.Sub(*agent.LastSeen) > 2*time.Minute {
					agent.Status = common.AgentStatusOffline
				} else {
					agent.Status = common.AgentStatusOnline
				}
			} else {
				agent.Status = common.AgentStatusOffline
			}
		}
	}

	return dbAgents, nil
}

