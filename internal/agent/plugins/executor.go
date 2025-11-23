package plugins

import (
	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
)

// LogCallback 日志回调函数
type LogCallback func(taskID string, level string, message string)

// Executor 执行器接口
type Executor interface {
	Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error)
	Cancel(taskID string) error
	Type() common.TaskType
}

