package plugins

import (
	"fmt"

	"github.com/cloud-agent/internal/common"
)

// DatabaseExecutor 数据库执行器接口
type DatabaseExecutor interface {
	Executor
	GetDatabaseType() string
}

// NewDatabaseExecutor 根据数据库类型创建执行器
func NewDatabaseExecutor(dbType string, config map[string]interface{}) (DatabaseExecutor, error) {
	switch dbType {
	case "mysql":
		return NewMySQLExecutor(config), nil
	case "postgres", "postgresql":
		return NewPostgresExecutor(config), nil
	case "redis":
		return NewRedisExecutor(config), nil
	case "mongo", "mongodb":
		return NewMongoExecutor(config), nil
	default:
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}
}

// PostgresExecutor 和 MongoExecutor 已在独立文件中实现
// postgres.go 和 mongo.go

// RedisExecutor Redis 执行器
type RedisExecutor struct {
	config map[string]interface{}
}

// NewRedisExecutor 创建 Redis 执行器
func NewRedisExecutor(config map[string]interface{}) *RedisExecutor {
	return &RedisExecutor{
		config: config,
	}
}

// Type 返回执行器类型
func (e *RedisExecutor) Type() common.TaskType {
	return common.TaskTypeRedis
}

// GetDatabaseType 返回数据库类型
func (e *RedisExecutor) GetDatabaseType() string {
	return "redis"
}

// Execute 执行 Redis 脚本
func (e *RedisExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// TODO: 实现 Redis 执行逻辑
	return "", common.NewError("Redis executor not implemented yet")
}

// Cancel 取消执行
func (e *RedisExecutor) Cancel(taskID string) error {
	return nil
}
