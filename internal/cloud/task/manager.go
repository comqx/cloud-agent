package task

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/agent"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/storage"
	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
)

// Manager 任务管理器
type Manager struct {
	db       *storage.Database
	agentMgr *agent.Manager
	// 日志订阅：taskID -> []*common.WSConnection
	logSubscribers map[string][]*common.WSConnection
	mu             sync.RWMutex
}

// NewManager 创建任务管理器
func NewManager(db *storage.Database, agentMgr *agent.Manager) *Manager {
	return &Manager{
		db:             db,
		agentMgr:       agentMgr,
		logSubscribers: make(map[string][]*common.WSConnection),
	}
}

// CreateTask 创建任务
// 如果提供了 fileID，会自动将文件路径信息添加到 params 中
func (m *Manager) CreateTask(agentID string, taskType common.TaskType, command string, params map[string]interface{}, fileID string) (*common.Task, error) {
	// Check if Agent is online
	_, exists := m.agentMgr.GetConnection(agentID)
	if !exists {
		return nil, common.NewError("agent not online")
	}

	taskID := uuid.New().String()

	// If fileID is provided, get file information and add to params BEFORE serialization
	if fileID != "" {
		file, err := m.db.GetFile(fileID)
		if err == nil {
			// Ensure params is not nil
			if params == nil {
				params = make(map[string]interface{})
			}
			// Add file path and file name information
			params["file_path"] = file.Path
			params["file_name"] = file.Name
		}
	}

	// Serialize parameters
	paramsJSON := ""
	if params != nil {
		paramsBytes, _ := json.Marshal(params)
		paramsJSON = string(paramsBytes)
	}

	task := &common.Task{
		ID:      taskID,
		AgentID: agentID,
		Type:    taskType,
		Status:  common.TaskStatusPending,
		Command: command,
		Params:  paramsJSON,
		FileID:  fileID,
	}

	if err := m.db.CreateTask(task); err != nil {
		return nil, err
	}

	// 发送任务到 Agent
	taskData := common.TaskCreateData{
		TaskID:  taskID,
		Type:    taskType,
		Command: command,
		FileID:  fileID,
	}
	if params != nil {
		taskData.Params = params
	}

	msg := common.NewMessage(common.MessageTypeTaskCreate, taskData)
	if err := m.agentMgr.SendMessage(agentID, msg); err != nil {
		// 如果发送失败，更新任务状态
		m.db.UpdateTaskStatus(taskID, common.TaskStatusFailed)
		return nil, fmt.Errorf("failed to send task to agent: %w", err)
	}

	// 更新任务状态为运行中
	m.db.UpdateTaskStatus(taskID, common.TaskStatusRunning)

	return task, nil
}

// CompleteTask 完成任务
func (m *Manager) CompleteTask(data *common.TaskCompleteData) error {
	task, err := m.db.GetTask(data.TaskID)
	if err != nil {
		return err
	}

	task.Status = data.Status
	task.Result = data.Result
	task.Error = data.Error

	return m.db.UpdateTask(task)
}

// CancelTask 取消任务
func (m *Manager) CancelTask(taskID string) error {
	task, err := m.db.GetTask(taskID)
	if err != nil {
		return err
	}

	if task.Status != common.TaskStatusPending && task.Status != common.TaskStatusRunning {
		return common.NewError("task cannot be canceled")
	}

	// 发送取消消息到 Agent
	msg := common.NewMessage(common.MessageTypeTaskCancel, map[string]interface{}{
		"task_id": taskID,
	})
	if err := m.agentMgr.SendMessage(task.AgentID, msg); err != nil {
		// 即使发送失败，也更新状态
	}

	return m.db.UpdateTaskStatus(taskID, common.TaskStatusCanceled)
}

// SaveLog 保存日志
func (m *Manager) SaveLog(logData *common.TaskLogData) error {
	log := &common.Log{
		TaskID:    logData.TaskID,
		Level:     logData.Level,
		Message:   logData.Message,
		Timestamp: time.Unix(logData.Timestamp, 0),
	}

	// 保存到数据库
	if err := m.db.CreateLog(log); err != nil {
		return err
	}

	// 推送给所有订阅者
	m.broadcastLog(logData)

	return nil
}

// SubscribeLogs 订阅任务日志
func (m *Manager) SubscribeLogs(taskID string, conn *common.WSConnection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.logSubscribers[taskID] == nil {
		m.logSubscribers[taskID] = make([]*common.WSConnection, 0)
	}
	m.logSubscribers[taskID] = append(m.logSubscribers[taskID], conn)
}

// UnsubscribeLogs 取消订阅任务日志
func (m *Manager) UnsubscribeLogs(taskID string, conn *common.WSConnection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	subscribers := m.logSubscribers[taskID]
	if subscribers == nil {
		return
	}

	// 移除连接
	newSubscribers := make([]*common.WSConnection, 0, len(subscribers))
	for _, c := range subscribers {
		if c != conn {
			newSubscribers = append(newSubscribers, c)
		}
	}

	if len(newSubscribers) == 0 {
		delete(m.logSubscribers, taskID)
	} else {
		m.logSubscribers[taskID] = newSubscribers
	}
}

// broadcastLog 广播日志给所有订阅者
func (m *Manager) broadcastLog(logData *common.TaskLogData) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	subscribers := m.logSubscribers[logData.TaskID]
	if subscribers == nil {
		return
	}

	msg := common.NewMessage(common.MessageTypeTaskLog, logData)

	// 发送给所有订阅者，移除已关闭的连接
	validSubscribers := make([]*common.WSConnection, 0, len(subscribers))
	for _, conn := range subscribers {
		if conn.IsClosed() {
			continue
		}
		if err := conn.WriteMessage(msg); err != nil {
			continue
		}
		validSubscribers = append(validSubscribers, conn)
	}

	// 更新订阅者列表
	if len(validSubscribers) != len(subscribers) {
		m.mu.RUnlock()
		m.mu.Lock()
		if len(validSubscribers) == 0 {
			delete(m.logSubscribers, logData.TaskID)
		} else {
			m.logSubscribers[logData.TaskID] = validSubscribers
		}
		m.mu.Unlock()
		m.mu.RLock()
	}
}

// UploadFile 上传文件
func (m *Manager) UploadFile(fileHeader *multipart.FileHeader, storagePath string) (*common.File, error) {
	// 打开上传的文件
	src, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	// 计算 MD5
	hash := md5.New()
	if _, err := io.Copy(hash, src); err != nil {
		return nil, err
	}
	md5Sum := hex.EncodeToString(hash.Sum(nil))

	// 检查文件是否已存在
	existingFile, err := m.db.GetFileByMD5(md5Sum)
	if err == nil {
		// 文件已存在，返回现有记录
		return existingFile, nil
	}

	// 重置文件指针
	src.Seek(0, 0)

	// 生成文件ID，但使用原始文件名存储
	fileID := uuid.New().String()
	// 使用原始文件名，但需要清理文件名中的路径分隔符等不安全字符
	originalFileName := fileHeader.Filename
	// 清理文件名：移除路径分隔符，防止路径遍历攻击
	originalFileName = strings.ReplaceAll(originalFileName, "/", "_")
	originalFileName = strings.ReplaceAll(originalFileName, "\\", "_")
	originalFileName = strings.ReplaceAll(originalFileName, "..", "_")

	// 如果文件名已存在，添加文件ID前缀避免冲突
	filePath := filepath.Join(storagePath, originalFileName)
	if _, err := os.Stat(filePath); err == nil {
		// 文件已存在，使用 fileID-原文件名 格式
		ext := filepath.Ext(originalFileName)
		nameWithoutExt := strings.TrimSuffix(originalFileName, ext)
		originalFileName = fmt.Sprintf("%s-%s%s", nameWithoutExt, fileID[:8], ext)
		filePath = filepath.Join(storagePath, originalFileName)
	}

	// 创建目标文件
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	// 复制文件内容
	if _, err := io.Copy(dst, src); err != nil {
		return nil, err
	}

	// 获取文件信息
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	// 创建文件记录
	file := &common.File{
		ID:          fileID,
		Name:        fileHeader.Filename,
		Path:        filePath,
		Size:        fileInfo.Size(),
		ContentType: fileHeader.Header.Get("Content-Type"),
		MD5:         md5Sum,
	}

	if err := m.db.CreateFile(file); err != nil {
		os.Remove(filePath) // 删除文件
		return nil, err
	}

	return file, nil
}

// DistributeFile 分发文件到 Agent
func (m *Manager) DistributeFile(fileID string, agentIDs []string, targetPath string) error {
	file, err := m.db.GetFile(fileID)
	if err != nil {
		return err
	}

	// 为每个 Agent 创建文件分发任务
	for _, agentID := range agentIDs {
		// 检查 Agent 是否在线
		_, exists := m.agentMgr.GetConnection(agentID)
		if !exists {
			continue
		}

		// 创建文件分发任务
		params := map[string]interface{}{
			"operation":   "distribute",
			"file_id":     fileID,
			"file_path":   file.Path,
			"file_name":   file.Name, // 传递原始文件名
			"target_path": targetPath,
		}

		_, err := m.CreateTask(agentID, common.TaskTypeFile, "", params, fileID)
		if err != nil {
			// 记录错误但继续处理其他 Agent
			continue
		}
	}

	return nil
}
