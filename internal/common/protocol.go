package common

// MessageType WebSocket 消息类型
type MessageType string

const (
	// Agent 相关消息
	MessageTypeAgentRegister  MessageType = "agent.register"
	MessageTypeAgentHeartbeat MessageType = "agent.heartbeat"
	MessageTypeAgentStatus    MessageType = "agent.status"

	// 任务相关消息
	MessageTypeTaskCreate        MessageType = "task.create"
	MessageTypeTaskStart         MessageType = "task.start"
	MessageTypeTaskLog           MessageType = "task.log"
	MessageTypeTaskComplete      MessageType = "task.complete"
	MessageTypeTaskCancel        MessageType = "task.cancel"
	MessageTypeTaskSubscribeLogs MessageType = "task.subscribe_logs"

	// 文件相关消息
	MessageTypeFileUpload     MessageType = "file.upload"
	MessageTypeFileDownload   MessageType = "file.download"
	MessageTypeFileDistribute MessageType = "file.distribute"

	// 错误消息
	MessageTypeError MessageType = "error"
)

// Message WebSocket 消息结构
type Message struct {
	Type      MessageType `json:"type"`
	ID        string      `json:"id,omitempty"`         // 消息ID，用于请求-响应匹配
	RequestID string      `json:"request_id,omitempty"` // 请求ID，用于关联响应
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

// AgentRegisterData Agent 注册数据
type AgentRegisterData struct {
	AgentID  string            `json:"agent_id"`
	Name     string            `json:"name"`
	Hostname string            `json:"hostname"`
	IP       string            `json:"ip"`
	Version  string            `json:"version"`
	Env      string            `json:"env,omitempty"` // K8s 集群名称
	Metadata map[string]string `json:"metadata,omitempty"`
}

// TaskCreateData 任务创建数据
type TaskCreateData struct {
	TaskID  string                 `json:"task_id"`
	Type    TaskType               `json:"type"`
	Command string                 `json:"command"`
	Params  map[string]interface{} `json:"params,omitempty"`
	FileID  string                 `json:"file_id,omitempty"`
}

// TaskLogData 任务日志数据
type TaskLogData struct {
	TaskID    string `json:"task_id"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

// TaskCompleteData 任务完成数据
type TaskCompleteData struct {
	TaskID    string     `json:"task_id"`
	Status    TaskStatus `json:"status"`
	Result    string     `json:"result,omitempty"`
	Error     string     `json:"error,omitempty"`
	Timestamp int64      `json:"timestamp"`
}

// FileDistributeData 文件分发数据
type FileDistributeData struct {
	FileID   string   `json:"file_id"`
	AgentIDs []string `json:"agent_ids"`
	Path     string   `json:"path,omitempty"` // 目标路径
}
