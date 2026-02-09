package agent

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/cloud-agent/internal/agent/client"
	"github.com/cloud-agent/internal/agent/executor"
	"github.com/cloud-agent/internal/common"
)

// Agent Agent 主程序
type Agent struct {
	client   *client.Client
	executor *executor.Manager
}

// NewAgent 创建 Agent
func NewAgent(cloudURL, agentID, agentName string) *Agent {
	cl := client.NewClient(cloudURL, agentID, agentName)

	// 尝试从配置文件加载执行器，如果配置文件不存在则使用默认执行器
	var execMgr *executor.Manager
	configPath := os.Getenv("AGENT_PLUGINS_CONFIG")
	if configPath == "" {
		// 尝试使用默认配置文件路径
		configPath = "configs/agent-plugins.yaml"
		// 如果默认路径不存在，尝试当前目录
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			configPath = "./configs/agent-plugins.yaml"
			if _, err := os.Stat(configPath); os.IsNotExist(err) {
				// 尝试工作目录下的配置文件
				wd, _ := os.Getwd()
				configPath = filepath.Join(wd, "configs", "agent-plugins.yaml")
			}
		}
	}

	// 获取安全配置文件路径
	securityConfigPath := os.Getenv("AGENT_SECURITY_CONFIG")
	if securityConfigPath == "" {
		securityConfigPath = "configs/agent-security.yaml"
		if _, err := os.Stat(securityConfigPath); os.IsNotExist(err) {
			securityConfigPath = "./configs/agent-security.yaml"
			if _, err := os.Stat(securityConfigPath); os.IsNotExist(err) {
				wd, _ := os.Getwd()
				securityConfigPath = filepath.Join(wd, "configs", "agent-security.yaml")
			}
		}
	}

	// 尝试加载配置文件
	if execMgrWithConfig, err := executor.NewManagerWithConfig(agentID, configPath, securityConfigPath); err == nil {
		execMgr = execMgrWithConfig
		log.Printf("Loaded executor plugins from config: %s", configPath)
	} else {
		// 插件配置文件不存在或加载失败，使用默认执行器，但保留安全配置
		execMgr, _ = executor.NewManagerWithConfigAndLimits(agentID, "", securityConfigPath, nil)
		log.Printf("Using default executors with security config (plugin config not found or invalid: %s)", configPath)
	}

	// 打印所有已注册的执行器
	registeredTypes := execMgr.GetRegisteredExecutors()
	log.Printf("Final registered executors: %v", registeredTypes)

	return &Agent{
		client:   cl,
		executor: execMgr,
	}
}

// Start 启动 Agent
func (a *Agent) Start() error {
	// 连接到 Cloud
	if err := a.client.Connect(); err != nil {
		return err
	}

	// 处理消息
	go a.handleMessages()

	log.Println("Agent started and ready to receive tasks")
	return nil
}

// handleMessages 处理来自 Cloud 的消息
func (a *Agent) handleMessages() {
	for msg := range a.client.GetMessageChan() {
		switch msg.Type {
		case common.MessageTypeTaskCreate:
			a.handleTaskCreate(msg)
		case common.MessageTypeTaskCancel:
			a.handleTaskCancel(msg)
		case common.MessageTypeAgentStatus:
			// 忽略状态消息，或者记录日志
			log.Printf("Received agent status update: %v", msg.Data)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

// handleTaskCreate 处理任务创建
func (a *Agent) handleTaskCreate(msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var taskData common.TaskCreateData
	if err := json.Unmarshal(dataBytes, &taskData); err != nil {
		log.Printf("Failed to parse task data: %v", err)
		return
	}

	log.Printf("Received task: %s, type: %s", taskData.TaskID, taskData.Type)

	// 执行任务
	go a.executeTask(&taskData)
}

// executeTask 执行任务
func (a *Agent) executeTask(taskData *common.TaskCreateData) {
	// 发送任务开始日志
	a.sendLog(taskData.TaskID, "info", "Task started")

	// 创建日志回调
	logCallback := func(taskID string, level string, message string) {
		a.sendLog(taskID, level, message)
	}

	// 执行任务
	result, err := a.executor.Execute(taskData.TaskID, taskData.Type, taskData.Command, taskData.Params, taskData.FileID, logCallback)

	// 发送任务完成消息
	status := common.TaskStatusSuccess
	errorMsg := ""
	if err != nil {
		status = common.TaskStatusFailed
		errorMsg = err.Error()
		a.sendLog(taskData.TaskID, "error", "Task failed: "+errorMsg)
	} else {
		a.sendLog(taskData.TaskID, "info", "Task completed successfully")
	}

	completeData := common.TaskCompleteData{
		TaskID:    taskData.TaskID,
		Status:    status,
		Result:    result,
		Error:     errorMsg,
		Timestamp: time.Now().Unix(),
	}

	msg := common.NewMessage(common.MessageTypeTaskComplete, completeData)
	if err := a.client.SendMessage(msg); err != nil {
		log.Printf("Failed to send task complete message: %v", err)
	}
}

// handleTaskCancel 处理任务取消
func (a *Agent) handleTaskCancel(msg *common.Message) {
	dataBytes, _ := json.Marshal(msg.Data)
	var cancelData map[string]interface{}
	if err := json.Unmarshal(dataBytes, &cancelData); err != nil {
		return
	}

	taskID, ok := cancelData["task_id"].(string)
	if !ok {
		return
	}

	// 取消任务执行
	a.executor.Cancel(taskID)
	a.sendLog(taskID, "info", "Task canceled")
}

// sendLog 发送日志
func (a *Agent) sendLog(taskID, level, message string) {
	logData := common.TaskLogData{
		TaskID:    taskID,
		Level:     level,
		Message:   message,
		Timestamp: time.Now().Unix(),
	}

	msg := common.NewMessage(common.MessageTypeTaskLog, logData)
	if err := a.client.SendMessage(msg); err != nil {
		log.Printf("Failed to send log: %v", err)
	}
}

// Stop 停止 Agent
func (a *Agent) Stop() error {
	return a.client.Close()
}
