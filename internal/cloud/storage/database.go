package storage

import (
	"fmt"
	"time"

	"github.com/cloud-agent/cloud-agent/internal/common"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Database 数据库封装
type Database struct {
	db *gorm.DB
}

// NewDatabase 创建数据库连接
func NewDatabase(dbPath string) (*Database, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	database := &Database{db: db}

	// 自动迁移
	if err := database.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return database, nil
}

// migrate 数据库迁移
func (d *Database) migrate() error {
	return d.db.AutoMigrate(
		&common.Agent{},
		&common.Task{},
		&common.Log{},
		&common.File{},
		&common.TaskFile{},
	)
}

// GetDB 获取 GORM 数据库实例
func (d *Database) GetDB() *gorm.DB {
	return d.db
}

// Close 关闭数据库连接
func (d *Database) Close() error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Agent 相关操作

// CreateAgent 创建 Agent
func (d *Database) CreateAgent(agent *common.Agent) error {
	now := time.Now()
	agent.CreatedAt = now
	agent.UpdatedAt = now
	return d.db.Create(agent).Error
}

// GetAgent 获取 Agent
func (d *Database) GetAgent(agentID string) (*common.Agent, error) {
	var agent common.Agent
	err := d.db.Where("id = ?", agentID).First(&agent).Error
	if err != nil {
		return nil, err
	}
	return &agent, nil
}

// GetAgentByEnvHostname 根据 env 和 hostname 获取 Agent
func (d *Database) GetAgentByEnvHostname(env, hostname string) (*common.Agent, error) {
	var agent common.Agent
	err := d.db.Where("env = ? AND hostname = ?", env, hostname).First(&agent).Error
	if err != nil {
		return nil, err
	}
	return &agent, nil
}

// UpdateAgent 更新 Agent
func (d *Database) UpdateAgent(agent *common.Agent) error {
	agent.UpdatedAt = time.Now()
	return d.db.Save(agent).Error
}

// ListAgents 列出所有 Agent
func (d *Database) ListAgents() ([]*common.Agent, error) {
	var agents []*common.Agent
	err := d.db.Find(&agents).Error
	return agents, err
}

// UpdateAgentStatus 更新 Agent 状态
func (d *Database) UpdateAgentStatus(agentID string, status common.AgentStatus) error {
	now := time.Now()
	return d.db.Model(&common.Agent{}).
		Where("id = ?", agentID).
		Updates(map[string]interface{}{
			"status":     status,
			"last_seen":  now,
			"updated_at": now,
		}).Error
}

// Task 相关操作

// CreateTask 创建任务
func (d *Database) CreateTask(task *common.Task) error {
	now := time.Now()
	task.CreatedAt = now
	task.UpdatedAt = now
	return d.db.Create(task).Error
}

// GetTask 获取任务
func (d *Database) GetTask(taskID string) (*common.Task, error) {
	var task common.Task
	err := d.db.Where("id = ?", taskID).First(&task).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

// UpdateTask 更新任务
func (d *Database) UpdateTask(task *common.Task) error {
	task.UpdatedAt = time.Now()
	return d.db.Save(task).Error
}

// ListTasks 列出任务
func (d *Database) ListTasks(agentID string, limit, offset int) ([]*common.Task, error) {
	var tasks []*common.Task
	query := d.db
	if agentID != "" {
		query = query.Where("agent_id = ?", agentID)
	}
	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&tasks).Error
	return tasks, err
}

// UpdateTaskStatus 更新任务状态
func (d *Database) UpdateTaskStatus(taskID string, status common.TaskStatus) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if status == common.TaskStatusRunning {
		now := time.Now()
		updates["started_at"] = now
	} else if status == common.TaskStatusSuccess || status == common.TaskStatusFailed {
		now := time.Now()
		updates["finished_at"] = now
	}

	return d.db.Model(&common.Task{}).
		Where("id = ?", taskID).
		Updates(updates).Error
}

// Log 相关操作

// CreateLog 创建日志
func (d *Database) CreateLog(log *common.Log) error {
	return d.db.Create(log).Error
}

// GetTaskLogs 获取任务日志
func (d *Database) GetTaskLogs(taskID string, limit int) ([]*common.Log, error) {
	var logs []*common.Log
	err := d.db.Where("task_id = ?", taskID).
		Order("timestamp ASC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

// File 相关操作

// CreateFile 创建文件记录
func (d *Database) CreateFile(file *common.File) error {
	now := time.Now()
	file.CreatedAt = now
	file.UpdatedAt = now
	return d.db.Create(file).Error
}

// GetFile 获取文件
func (d *Database) GetFile(fileID string) (*common.File, error) {
	var file common.File
	err := d.db.Where("id = ?", fileID).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// GetFileByMD5 根据 MD5 获取文件
func (d *Database) GetFileByMD5(md5 string) (*common.File, error) {
	var file common.File
	err := d.db.Where("md5 = ?", md5).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}

// ListFiles 列出文件
func (d *Database) ListFiles(limit, offset int) ([]*common.File, error) {
	var files []*common.File
	err := d.db.Order("created_at DESC").Limit(limit).Offset(offset).Find(&files).Error
	return files, err
}

