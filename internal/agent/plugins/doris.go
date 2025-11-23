package plugins

import (
	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
)

// DorisExecutor Doris 执行器
// Doris 支持 MySQL 协议，可以复用 MySQLExecutor
// 这里创建一个包装器，使用 MySQLExecutor 的实现
type DorisExecutor struct {
	*MySQLExecutor
}

// NewDorisExecutor 创建 Doris 执行器
func NewDorisExecutor(config map[string]interface{}) *DorisExecutor {
	// Doris 使用 MySQL 协议，复用 MySQLExecutor
	// 但需要特殊配置，比如超时时间更长（Doris 查询可能较慢）
	mysqlExec := NewMySQLExecutor(config)

	// 如果配置中没有指定 goinception_url，Doris 可以直接连接
	// 但为了统一，建议也使用 goInception（如果支持）
	// 或者直接使用 MySQL 驱动连接

	return &DorisExecutor{
		MySQLExecutor: mysqlExec,
	}
}

// Type 返回执行器类型
func (e *DorisExecutor) Type() common.TaskType {
	return common.TaskTypeDoris
}

// GetDatabaseType 返回数据库类型
func (e *DorisExecutor) GetDatabaseType() string {
	return "doris"
}

// Execute 执行 SQL（复用 MySQLExecutor，但可以添加 Doris 特定逻辑）
func (e *DorisExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// Doris 查询可能较慢，增加默认超时时间
	if params == nil {
		params = make(map[string]interface{})
	}

	// 如果没有设置超时，设置较长的超时时间（Doris 查询通常较慢）
	if execOpts, ok := params["exec_options"].(map[string]interface{}); ok {
		if _, hasTimeout := execOpts["timeout_ms"]; !hasTimeout {
			execOpts["timeout_ms"] = 1800000 // 30分钟（Doris 查询可能很长）
		}
	} else {
		params["exec_options"] = map[string]interface{}{
			"timeout_ms": 1800000, // 30分钟
		}
	}

	// 调用 MySQLExecutor 执行
	return e.MySQLExecutor.Execute(taskID, command, params, fileID, logCallback)
}

