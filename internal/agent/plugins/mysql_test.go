package plugins

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cloud-agent/internal/common"
)

func TestNewMySQLExecutor(t *testing.T) {
	config := map[string]interface{}{
		"goinception_url": "http://test:4000",
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewMySQLExecutor(config)

	if exec.goInceptionURL != "http://test:4000" {
		t.Errorf("Expected goInceptionURL to be 'http://test:4000', got '%s'", exec.goInceptionURL)
	}

	if len(exec.connections) != 1 {
		t.Errorf("Expected 1 connection, got %d", len(exec.connections))
	}

	if exec.connections["default"].Database != "test_db" {
		t.Errorf("Expected database 'test_db', got '%s'", exec.connections["default"].Database)
	}
}

func TestMySQLExecutor_Type(t *testing.T) {
	exec := NewMySQLExecutor(nil)
	if exec.Type() != common.TaskTypeMySQL {
		t.Errorf("Expected TaskTypeMySQL, got %s", exec.Type())
	}
}

func TestMySQLExecutor_GetDatabaseType(t *testing.T) {
	exec := NewMySQLExecutor(nil)
	if exec.GetDatabaseType() != "mysql" {
		t.Errorf("Expected 'mysql', got '%s'", exec.GetDatabaseType())
	}
}

func TestMySQLExecutor_ExtractDatabaseName(t *testing.T) {
	exec := NewMySQLExecutor(map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "config_db",
			},
		},
	})

	tests := []struct {
		name     string
		params   map[string]interface{}
		expected string
	}{
		{
			name: "from target.db",
			params: map[string]interface{}{
				"target": map[string]interface{}{
					"db": "target_db",
				},
			},
			expected: "target_db",
		},
		{
			name: "from database param",
			params: map[string]interface{}{
				"database": "param_db",
			},
			expected: "param_db",
		},
		{
			name: "from connection config",
			params: map[string]interface{}{
				"connection": "default",
			},
			expected: "config_db",
		},
		{
			name:     "empty params",
			params:   nil,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := exec.extractDatabaseName(tt.params)
			if result != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, result)
			}
		})
	}
}

func TestMySQLExecutor_ExtractExecOptions(t *testing.T) {
	exec := NewMySQLExecutor(nil)

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
				Backup:         true,
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
					"backup":           false,
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
		{
			name: "legacy no_backup param",
			params: map[string]interface{}{
				"no_backup": true,
			},
			expected: execOptions{
				TransBatchSize: 200,
				Backup:         false,
				SleepMs:        0,
				TimeoutMs:      600000,
				Concurrency:    1,
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

func TestMySQLExecutor_Execute_Success(t *testing.T) {
	// 创建 mock HTTP 服务器
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Expected POST, got %s", r.Method)
		}

		var req goInceptionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("Failed to decode request: %v", err)
		}

		response := goInceptionResponse{
			ErrorCode: 0,
			ErrorMsg:  "",
			Data: []goInceptionResult{
				{
					OrderID:      1,
					Stage:        "EXECUTED",
					ErrorLevel:   0,
					StageStatus:  "Execute Successfully",
					AffectedRows: 2,
					ExecuteTime:  "0.001s",
					SQL:          req.SQL,
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := map[string]interface{}{
		"goinception_url": server.URL,
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewMySQLExecutor(config)
	exec.goInceptionURL = server.URL

	var logMessages []string
	logCallback := func(taskID, level, message string) {
		logMessages = append(logMessages, message)
	}

	result, err := exec.Execute("test-task", "SELECT * FROM users", map[string]interface{}{
		"database": "test_db",
	}, "", logCallback)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if result == "" {
		t.Error("Expected non-empty result")
	}

	if len(logMessages) == 0 {
		t.Error("Expected log messages")
	}
}

func TestMySQLExecutor_Execute_Error(t *testing.T) {
	// 创建 mock HTTP 服务器返回错误
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := goInceptionResponse{
			ErrorCode: 1,
			ErrorMsg:  "SQL syntax error",
			Data: []goInceptionResult{
				{
					OrderID:     1,
					Stage:       "CHECKED",
					ErrorLevel:  2,
					StageStatus: "Audit failed",
					ErrorMsg:    "SQL syntax error",
					SQL:         "SELECT * FROM",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	config := map[string]interface{}{
		"goinception_url": server.URL,
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewMySQLExecutor(config)
	exec.goInceptionURL = server.URL

	result, err := exec.Execute("test-task", "SELECT * FROM", map[string]interface{}{
		"database": "test_db",
	}, "", nil)

	// 注意：根据当前实现，processResponse 在错误时仍然返回结果字符串和 nil error
	// 错误信息包含在结果字符串中
	// 如果需要返回 error，需要修改 processResponse 的实现

	// 验证结果字符串包含错误信息
	if result == "" {
		t.Error("Expected error result message")
	}

	// 验证结果中包含错误信息
	if !strings.Contains(result, "SQL syntax error") && !strings.Contains(result, "ERROR") {
		t.Error("Expected result to contain error information")
	}

	// 当前实现不返回 error，只返回包含错误信息的结果字符串
	_ = err
}

func TestMySQLExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewMySQLExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}

func TestMySQLExecutor_Execute_NoDatabase(t *testing.T) {
	exec := NewMySQLExecutor(nil)

	_, err := exec.Execute("test-task", "SELECT 1", nil, "", nil)
	if err == nil {
		t.Error("Expected error for missing database")
	}
}

func TestMySQLExecutor_Cancel(t *testing.T) {
	exec := NewMySQLExecutor(nil)
	// Cancel 应该不返回错误（goInception 通过 HTTP，无法直接取消）
	if err := exec.Cancel("test-task"); err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}
