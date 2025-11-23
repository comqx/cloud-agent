package plugins

import (
	"testing"

	"github.com/tiangong-deploy/tiangong-deploy/internal/common"
)

func TestNewClickHouseExecutor(t *testing.T) {
	config := map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"host":     "localhost",
				"port":     9000,
				"database": "default",
				"user":     "default",
				"password": "",
			},
		},
	}

	exec := NewClickHouseExecutor(config)

	if exec.config == nil {
		t.Error("Expected config to be set")
	}

	// 注意：实际连接测试需要真实的 ClickHouse，这里只测试初始化
}

func TestClickHouseExecutor_Type(t *testing.T) {
	exec := NewClickHouseExecutor(nil)
	if exec.Type() != common.TaskTypeClickHouse {
		t.Errorf("Expected TaskTypeClickHouse, got %s", exec.Type())
	}
}

func TestClickHouseExecutor_GetDatabaseType(t *testing.T) {
	exec := NewClickHouseExecutor(nil)
	if exec.GetDatabaseType() != "clickhouse" {
		t.Errorf("Expected 'clickhouse', got '%s'", exec.GetDatabaseType())
	}
}

func TestClickHouseExecutor_BuildConnectionOptions(t *testing.T) {
	exec := NewClickHouseExecutor(nil)

	tests := []struct {
		name string
		cfg  map[string]interface{}
	}{
		{
			name: "basic connection",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     9000,
				"database": "test_db",
				"user":     "default",
				"password": "test",
			},
		},
		{
			name: "default values",
			cfg: map[string]interface{}{
				"database": "test_db",
			},
		},
		{
			name: "with HTTP protocol",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     8123,
				"protocol": "http",
				"database": "test_db",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			options := exec.buildConnectionOptions(tt.cfg)
			if options == nil {
				t.Error("Expected non-nil options")
			}
			if len(options.Addr) == 0 {
				t.Error("Expected at least one address")
			}
		})
	}
}

func TestClickHouseExecutor_ExtractExecOptions(t *testing.T) {
	exec := NewClickHouseExecutor(nil)

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

func TestClickHouseExecutor_SplitStatements(t *testing.T) {
	exec := NewClickHouseExecutor(nil)

	tests := []struct {
		name     string
		sql      string
		expected int
	}{
		{
			name:     "single statement",
			sql:      "SELECT 1",
			expected: 1,
		},
		{
			name:     "multiple statements",
			sql:      "SELECT 1; SELECT 2; SELECT 3",
			expected: 3,
		},
		{
			name:     "with empty statements",
			sql:      "SELECT 1;; SELECT 2;",
			expected: 2,
		},
		{
			name:     "empty string",
			sql:      "",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := exec.splitStatements(tt.sql)
			if len(result) != tt.expected {
				t.Errorf("Expected %d statements, got %d", tt.expected, len(result))
			}
		})
	}
}

func TestClickHouseExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewClickHouseExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}

func TestClickHouseExecutor_Execute_NoConnection(t *testing.T) {
	exec := NewClickHouseExecutor(nil)

	_, err := exec.Execute("test-task", "SELECT 1", map[string]interface{}{
		"connection": "nonexistent",
	}, "", nil)

	if err == nil {
		t.Error("Expected error for nonexistent connection")
	}
}

func TestClickHouseExecutor_Cancel(t *testing.T) {
	exec := NewClickHouseExecutor(nil)
	if err := exec.Cancel("test-task"); err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

