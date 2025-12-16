package plugins

import (
	"testing"

	"github.com/cloud-agent/internal/common"
)

func TestNewDorisExecutor(t *testing.T) {
	config := map[string]interface{}{
		"goinception_url": "http://localhost:4000",
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewDorisExecutor(config)

	if exec.MySQLExecutor == nil {
		t.Error("Expected MySQLExecutor to be initialized")
	}

	if exec.Type() != common.TaskTypeDoris {
		t.Errorf("Expected TaskTypeDoris, got %s", exec.Type())
	}
}

func TestDorisExecutor_Type(t *testing.T) {
	exec := NewDorisExecutor(nil)
	if exec.Type() != common.TaskTypeDoris {
		t.Errorf("Expected TaskTypeDoris, got %s", exec.Type())
	}
}

func TestDorisExecutor_GetDatabaseType(t *testing.T) {
	exec := NewDorisExecutor(nil)
	if exec.GetDatabaseType() != "doris" {
		t.Errorf("Expected 'doris', got '%s'", exec.GetDatabaseType())
	}
}

func TestDorisExecutor_Execute_ExtendedTimeout(t *testing.T) {
	config := map[string]interface{}{
		"goinception_url": "http://localhost:4000",
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewDorisExecutor(config)

	// 测试默认超时时间是否被设置为 30 分钟
	params := map[string]interface{}{}

	// Execute 方法会修改 params，添加超时配置
	// 这里我们直接测试 Execute 方法是否会设置超时
	_, err := exec.Execute("test-task", "SELECT 1", params, "", nil)

	// 检查 params 中是否设置了超时
	if execOpts, ok := params["exec_options"].(map[string]interface{}); ok {
		if timeout, ok := execOpts["timeout_ms"].(int); ok {
			if timeout != 1800000 { // 30 分钟
				t.Errorf("Expected timeout 1800000ms (30 minutes), got %d", timeout)
			}
		} else {
			t.Error("Expected timeout_ms to be set in exec_options")
		}
	} else {
		t.Error("Expected exec_options to be set")
	}

	// 注意：实际执行测试需要真实的 goInception 服务
	// 这里只测试参数设置
	_ = err
}

func TestDorisExecutor_Execute_PreservesCustomTimeout(t *testing.T) {
	config := map[string]interface{}{
		"goinception_url": "http://localhost:4000",
		"connections": []interface{}{
			map[string]interface{}{
				"name":     "default",
				"database": "test_db",
			},
		},
	}

	exec := NewDorisExecutor(config)

	// 测试自定义超时时间是否被保留
	params := map[string]interface{}{
		"exec_options": map[string]interface{}{
			"timeout_ms": 600000, // 10 分钟
		},
	}

	_, err := exec.Execute("test-task", "SELECT 1", params, "", nil)

	// 检查自定义超时时间是否被保留
	if execOpts, ok := params["exec_options"].(map[string]interface{}); ok {
		if timeout, ok := execOpts["timeout_ms"].(int); ok {
			if timeout != 600000 {
				t.Errorf("Expected custom timeout 600000ms to be preserved, got %d", timeout)
			}
		}
	}

	// 注意：实际执行测试需要真实的 goInception 服务
	_ = err
}

func TestDorisExecutor_Execute_EmptyCommand(t *testing.T) {
	exec := NewDorisExecutor(nil)

	_, err := exec.Execute("test-task", "", nil, "", nil)
	if err == nil {
		t.Error("Expected error for empty command")
	}
}
