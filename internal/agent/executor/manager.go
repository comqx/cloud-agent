package executor

import (
	"context"
	"sync"

	"github.com/cloud-agent/internal/agent/plugins"
	"github.com/cloud-agent/internal/common"
)

// Manager 执行器管理器
type Manager struct {
	executors          map[common.TaskType]plugins.Executor
	running            map[string]context.CancelFunc
	mu                 sync.RWMutex
	maxConcurrency     int                               // 全局最大并发数
	typeConcurrency    map[common.TaskType]int           // 按类型的最大并发数
	semaphore          chan struct{}                     // 全局并发控制信号量
	typeSemaphores     map[common.TaskType]chan struct{} // 按类型的并发控制信号量
	agentID            string                            // Agent ID
	securityConfigPath string                            // 安全配置文件路径
}

// ManagerConfig 管理器配置
type ManagerConfig struct {
	MaxConcurrency  int                     // 全局最大并发数，0 表示不限制
	TypeConcurrency map[common.TaskType]int // 按类型的最大并发数
}

// NewManager 创建执行器管理器
func NewManager(agentID string) *Manager {
	return NewManagerWithConfigAndLimits(agentID, "", "", nil)
}

// NewManagerWithLimits 创建带限流配置的执行器管理器
func NewManagerWithLimits(agentID string, config *ManagerConfig) *Manager {
	return NewManagerWithConfigAndLimits(agentID, "", "", config)
}

// NewManagerWithConfigAndLimits 从配置文件创建执行器管理器，并支持限流配置
func NewManagerWithConfigAndLimits(agentID, configPath, securityConfigPath string, limits *ManagerConfig) *Manager {
	m := &Manager{
		executors:          make(map[common.TaskType]plugins.Executor),
		running:            make(map[string]context.CancelFunc),
		typeConcurrency:    make(map[common.TaskType]int),
		typeSemaphores:     make(map[common.TaskType]chan struct{}),
		agentID:            agentID,
		securityConfigPath: securityConfigPath,
	}

	// 设置并发限制
	if limits != nil {
		m.maxConcurrency = limits.MaxConcurrency
		if m.maxConcurrency > 0 {
			m.semaphore = make(chan struct{}, m.maxConcurrency)
		}

		for taskType, limit := range limits.TypeConcurrency {
			m.typeConcurrency[taskType] = limit
			if limit > 0 {
				m.typeSemaphores[taskType] = make(chan struct{}, limit)
			}
		}
	}

	// 如果提供了配置文件路径，加载配置
	if configPath != "" {
		config, err := LoadPluginConfig(configPath)
		if err == nil {
			// 加载插件
			LoadPluginsFromConfig(config, m)
		}
	} else {
		// 注册默认执行器
		if shellExec, err := plugins.NewShellExecutor(m.agentID, m.securityConfigPath); err == nil {
			m.RegisterExecutor(shellExec)
		}
		m.RegisterExecutor(plugins.NewFileExecutor(nil))
		m.RegisterExecutor(plugins.NewAPIExecutor(nil))
		if helmExec, err := plugins.NewHelmExecutor(nil); err == nil {
			m.RegisterExecutor(helmExec)
		}
	}

	return m
}

// NewManagerWithConfig 从配置文件创建执行器管理器（保持向后兼容）
func NewManagerWithConfig(agentID, configPath, securityConfigPath string) (*Manager, error) {
	m := NewManagerWithConfigAndLimits(agentID, configPath, securityConfigPath, nil)
	return m, nil
}

// RegisterExecutor 注册执行器
func (m *Manager) RegisterExecutor(exec plugins.Executor) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.executors[exec.Type()] = exec
}

// Execute 执行任务（带并发控制）
func (m *Manager) Execute(taskID string, taskType common.TaskType, command string, params map[string]interface{}, fileID string, logCallback plugins.LogCallback) (string, error) {
	m.mu.RLock()
	exec, exists := m.executors[taskType]
	m.mu.RUnlock()

	if !exists {
		return "", common.NewErrorf("executor not found for type: %s", taskType)
	}

	// 全局并发控制
	if m.semaphore != nil {
		m.semaphore <- struct{}{}        // 获取信号量
		defer func() { <-m.semaphore }() // 释放信号量
	}

	// 按类型的并发控制
	typeSem, hasTypeLimit := m.typeSemaphores[taskType]
	if hasTypeLimit {
		typeSem <- struct{}{}        // 获取类型信号量
		defer func() { <-typeSem }() // 释放类型信号量
	}

	// 创建取消上下文
	_, cancel := context.WithCancel(context.Background())
	m.mu.Lock()
	m.running[taskID] = cancel
	m.mu.Unlock()

	// 执行任务
	result, err := exec.Execute(taskID, command, params, fileID, logCallback)

	// 清理
	m.mu.Lock()
	delete(m.running, taskID)
	m.mu.Unlock()
	cancel()

	return result, err
}

// Cancel 取消任务
func (m *Manager) Cancel(taskID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cancel, exists := m.running[taskID]
	if !exists {
		return common.NewError("task not running")
	}

	cancel()
	delete(m.running, taskID)
	return nil
}
