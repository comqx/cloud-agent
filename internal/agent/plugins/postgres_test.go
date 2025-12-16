package plugins

import (
	"testing"

	"github.com/cloud-agent/internal/common"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestNewPostgresExecutor(t *testing.T) {
	config := map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"host":     "localhost",
				"port":     5432,
				"database": "test_db",
				"user":     "postgres",
				"password": "test",
			},
		},
	}

	exec := NewPostgresExecutor(config)

	if exec.config == nil {
		t.Error("Expected config to be set")
	}

	// 注意：实际连接测试需要真实的数据库，这里只测试初始化
}

func TestPostgresExecutor_Type(t *testing.T) {
	exec := NewPostgresExecutor(nil)
	if exec.Type() != common.TaskTypePostgres {
		t.Errorf("Expected TaskTypePostgres, got %s", exec.Type())
	}
}

func TestPostgresExecutor_GetDatabaseType(t *testing.T) {
	exec := NewPostgresExecutor(nil)
	if exec.GetDatabaseType() != "postgres" {
		t.Errorf("Expected 'postgres', got '%s'", exec.GetDatabaseType())
	}
}

func TestPostgresExecutor_BuildConnectionString(t *testing.T) {
	exec := NewPostgresExecutor(nil)

	tests := []struct {
		name     string
		cfg      map[string]interface{}
		expected string
	}{
		{
			name: "basic connection",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     5432,
				"database": "test_db",
				"user":     "postgres",
				"password": "test",
			},
			expected: "postgres://postgres:test@localhost:5432/test_db?sslmode=disable",
		},
		{
			name: "with sslmode",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     5432,
				"database": "test_db",
				"user":     "postgres",
				"password": "test",
				"sslmode":  "require",
			},
			expected: "postgres://postgres:test@localhost:5432/test_db?sslmode=require",
		},
		{
			name: "default values",
			cfg: map[string]interface{}{
				"database": "test_db",
			},
			expected: "postgres://postgres:@localhost:5432/test_db?sslmode=disable",
		},
		{
			name: "with username field",
			cfg: map[string]interface{}{
				"database": "test_db",
				"username": "testuser",
			},
			expected: "postgres://testuser:@localhost:5432/test_db?sslmode=disable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := exec.buildConnectionString(tt.cfg)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestPostgresExecutor_ExtractExecOptions(t *testing.T) {
	exec := NewPostgresExecutor(nil)

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

func TestPostgresExecutor_SplitStatements(t *testing.T) {
	exec := NewPostgresExecutor(nil)

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

func TestPostgresExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewPostgresExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}

func TestPostgresExecutor_Execute_NoConnection(t *testing.T) {
	exec := NewPostgresExecutor(nil)

	_, err := exec.Execute("test-task", "SELECT 1", map[string]interface{}{
		"connection": "nonexistent",
	}, "", nil)

	if err == nil {
		t.Error("Expected error for nonexistent connection")
	}
}

func TestPostgresExecutor_Cancel(t *testing.T) {
	exec := NewPostgresExecutor(nil)
	if err := exec.Cancel("test-task"); err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

// 注意：实际的数据库执行测试需要真实的 PostgreSQL 数据库
// 可以使用 testcontainers 或 mock 数据库连接进行集成测试
