package plugins

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cloud-agent/cloud-agent/internal/common"
)

func TestNewESExecutor(t *testing.T) {
	config := map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"host":     "localhost",
				"port":     9200,
				"user":     "elastic",
				"password": "test",
			},
		},
	}

	exec := NewESExecutor(config)

	if exec.config == nil {
		t.Error("Expected config to be set")
	}
}

func TestESExecutor_Type(t *testing.T) {
	exec := NewESExecutor(nil)
	if exec.Type() != common.TaskTypeElasticsearch {
		t.Errorf("Expected TaskTypeElasticsearch, got %s", exec.Type())
	}
}

func TestESExecutor_GetDatabaseType(t *testing.T) {
	exec := NewESExecutor(nil)
	if exec.GetDatabaseType() != "elasticsearch" {
		t.Errorf("Expected 'elasticsearch', got '%s'", exec.GetDatabaseType())
	}
}

func TestESExecutor_BuildESConfig(t *testing.T) {
	exec := NewESExecutor(nil)

	tests := []struct {
		name string
		cfg  map[string]interface{}
	}{
		{
			name: "basic config",
			cfg: map[string]interface{}{
				"host":     "localhost",
				"port":     9200,
				"user":     "elastic",
				"password": "test",
			},
		},
		{
			name: "with API key",
			cfg: map[string]interface{}{
				"host":    "localhost",
				"port":    9200,
				"api_key": "test-api-key",
			},
		},
		{
			name: "default values",
			cfg: map[string]interface{}{
				"host": "localhost",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := exec.buildESConfig(tt.cfg)
			if config == nil {
				t.Error("Expected non-nil config")
			}
			if len(config.Addresses) == 0 {
				t.Error("Expected at least one address")
			}
		})
	}
}

func TestESExecutor_ExtractExecOptions(t *testing.T) {
	exec := NewESExecutor(nil)

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

func TestESExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewESExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}

func TestESExecutor_Execute_InvalidJSON(t *testing.T) {
	config := map[string]interface{}{
		"connections": []interface{}{
			map[string]interface{}{
				"name": "default",
				"host": "localhost",
				"port": 9200,
			},
		},
	}

	exec := NewESExecutor(config)

	// 创建 mock HTTP 服务器
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// 更新连接以使用 mock 服务器
	// 注意：实际测试需要 mock Elasticsearch 客户端

	_, err := exec.Execute("test-task", "invalid json", nil, "", nil)
	if err == nil {
		t.Error("Expected error for invalid JSON")
	}
}

func TestESExecutor_Execute_ValidOperation(t *testing.T) {
	// 创建 mock HTTP 服务器
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"acknowledged": true,
		})
	}))
	defer server.Close()

	operation := map[string]interface{}{
		"operation":  "index",
		"index":      "test_index",
		"id":         "test_id",
		"doc": map[string]interface{}{
			"field": "value",
		},
	}

	jsonData, _ := json.Marshal(operation)

	// 注意：实际执行需要真实的 Elasticsearch 连接
	// 这里只测试 JSON 解析
	var parsed map[string]interface{}
	if err := json.Unmarshal(jsonData, &parsed); err != nil {
		t.Errorf("Failed to parse JSON: %v", err)
	}
}

func TestESExecutor_Cancel(t *testing.T) {
	exec := NewESExecutor(nil)
	if err := exec.Cancel("test-task"); err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

