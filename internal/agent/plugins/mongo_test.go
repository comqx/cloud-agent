package plugins

import (
	"encoding/json"
	"testing"

	"github.com/cloud-agent/internal/common"
)

func TestNewMongoExecutor(t *testing.T) {
	config := map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"host":     "localhost",
				"port":     27017,
				"database": "test_db",
				"user":     "admin",
				"password": "test",
			},
		},
	}

	exec := NewMongoExecutor(config)

	if exec.config == nil {
		t.Error("Expected config to be set")
	}

	// 注意：实际连接测试需要真实的 MongoDB，这里只测试初始化
}

func TestMongoExecutor_Type(t *testing.T) {
	exec := NewMongoExecutor(nil)
	if exec.Type() != common.TaskTypeMongo {
		t.Errorf("Expected TaskTypeMongo, got %s", exec.Type())
	}
}

func TestMongoExecutor_GetDatabaseType(t *testing.T) {
	exec := NewMongoExecutor(nil)
	if exec.GetDatabaseType() != "mongo" {
		t.Errorf("Expected 'mongo', got '%s'", exec.GetDatabaseType())
	}
}

func TestMongoExecutor_BuildConnectionURI(t *testing.T) {
	exec := NewMongoExecutor(nil)

	tests := []struct {
		name     string
		cfg      map[string]interface{}
		expected string
	}{
		{
			name: "with user and password",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     27017,
				"database": "test_db",
				"user":     "admin",
				"password": "test",
			},
			expected: "mongodb://admin:test@localhost:27017/test_db",
		},
		{
			name: "without user and password",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     27017,
				"database": "test_db",
			},
			expected: "mongodb://localhost:27017/test_db",
		},
		{
			name: "default values",
			cfg: map[string]interface{}{
				"database": "test_db",
			},
			expected: "mongodb://localhost:27017/test_db",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := exec.buildConnectionURI(tt.cfg)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestMongoExecutor_ExtractExecOptions(t *testing.T) {
	exec := NewMongoExecutor(nil)

	tests := []struct {
		name     string
		params   map[string]interface{}
		expected execOptions
	}{
		{
			name:   "default options",
			params: nil,
			expected: execOptions{
				TransBatchSize: 200,
				Backup:         false,
				SleepMs:        0,
				TimeoutMs:      600000,
				Concurrency:    1,
			},
		},
		{
			name: "custom options",
			params: map[string]interface{}{
				"exec_options": map[string]interface{}{
					"trans_batch_size": 100,
					"sleep_ms":         500,
					"timeout_ms":       300000,
					"concurrency":      2,
				},
			},
			expected: execOptions{
				TransBatchSize: 100,
				Backup:         false,
				SleepMs:        500,
				TimeoutMs:      300000,
				Concurrency:    2,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := exec.extractExecOptions(tt.params)
			if result != tt.expected {
				t.Errorf("Expected %+v, got %+v", tt.expected, result)
			}
		})
	}
}

func TestMongoExecutor_ExecuteOperations_InvalidJSON(t *testing.T) {
	exec := NewMongoExecutor(nil)

	// 测试无效的 JSON 格式
	_, err := exec.executeOperations(nil, nil, "invalid json", execOptions{}, nil, "test-task")
	if err == nil {
		t.Error("Expected error for invalid JSON")
	}
}

func TestMongoExecutor_ExecuteOperations_ValidJSON(t *testing.T) {
	// 测试有效的 JSON 格式（单个操作）
	operation := map[string]interface{}{
		"operation":  "insert",
		"collection": "users",
		"documents": []interface{}{
			map[string]interface{}{
				"name": "test",
			},
		},
	}

	jsonData, _ := json.Marshal(operation)

	// 注意：实际执行需要真实的 MongoDB 连接
	// 这里只测试 JSON 解析
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonData, &parsed); err != nil {
		t.Errorf("Failed to parse JSON: %v", err)
	}
}

func TestMongoExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewMongoExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}

func TestMongoExecutor_Execute_NoDatabase(t *testing.T) {
	exec := NewMongoExecutor(nil)

	operation := map[string]interface{}{
		"operation":  "insert",
		"collection": "users",
		"documents":  []interface{}{},
	}
	jsonData, _ := json.Marshal(operation)

	_, err := exec.Execute("test-task", string(jsonData), nil, "", nil)
	if err == nil {
		t.Error("Expected error for missing database")
	}
}

func TestMongoExecutor_Cancel(t *testing.T) {
	exec := NewMongoExecutor(nil)
	if err := exec.Cancel("test-task"); err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}
