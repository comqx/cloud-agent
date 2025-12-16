package plugins

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
)

// APIExecutor HTTP API 执行器
type APIExecutor struct {
	timeout   time.Duration
	verifySSL bool
}

// NewAPIExecutor 创建 API 执行器
func NewAPIExecutor(config map[string]interface{}) *APIExecutor {
	exec := &APIExecutor{
		timeout:   30 * time.Second,
		verifySSL: true,
	}

	if timeout, ok := config["timeout"].(int); ok {
		exec.timeout = time.Duration(timeout) * time.Second
	}
	if verifySSL, ok := config["verify_ssl"].(bool); ok {
		exec.verifySSL = verifySSL
	}

	return exec
}

// Type 返回执行器类型
func (e *APIExecutor) Type() common.TaskType {
	return common.TaskTypeAPI
}

// Execute 执行 HTTP 请求
func (e *APIExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// command 应该是 HTTP 方法，params 包含 URL、headers、body 等
	if command == "" {
		command = "GET" // 默认 GET
	}

	// 从 params 获取请求信息
	urlStr, ok := params["url"].(string)
	if !ok {
		return "", common.NewError("url is required in params")
	}

	// 创建 HTTP 请求
	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	var body io.Reader
	if bodyStr, ok := params["body"].(string); ok && bodyStr != "" {
		body = strings.NewReader(bodyStr)
	} else if bodyMap, ok := params["body"].(map[string]interface{}); ok {
		bodyBytes, _ := json.Marshal(bodyMap)
		body = bytes.NewReader(bodyBytes)
	}

	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(command), urlStr, body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// 设置 headers
	if headers, ok := params["headers"].(map[string]interface{}); ok {
		for k, v := range headers {
			if str, ok := v.(string); ok {
				req.Header.Set(k, str)
			}
		}
	}

	// 如果没有 Content-Type，根据 body 类型设置
	if req.Header.Get("Content-Type") == "" && body != nil {
		if _, ok := params["body"].(map[string]interface{}); ok {
			req.Header.Set("Content-Type", "application/json")
		} else {
			req.Header.Set("Content-Type", "text/plain")
		}
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Making %s request to: %s", command, urlStr))
	}

	// 执行请求
	client := &http.Client{
		Timeout: e.timeout,
	}

	resp, err := client.Do(req)
	if err != nil {
		if logCallback != nil {
			logCallback(taskID, "error", fmt.Sprintf("Request failed: %v", err))
		}
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// 构建响应信息
	result := fmt.Sprintf("Status: %s %s\n", resp.Status, resp.Proto)
	result += "Headers:\n"
	for k, v := range resp.Header {
		result += fmt.Sprintf("  %s: %s\n", k, strings.Join(v, ", "))
	}
	result += fmt.Sprintf("\nBody:\n%s", string(respBody))

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Response status: %s", resp.Status))
		if len(respBody) > 0 {
			// 逐行输出响应体
			scanner := bufio.NewScanner(bytes.NewReader(respBody))
			for scanner.Scan() {
				logCallback(taskID, "info", scanner.Text())
			}
		}
	}

	// 检查状态码
	if resp.StatusCode >= 400 {
		return result, fmt.Errorf("HTTP error: %s", resp.Status)
	}

	return result, nil
}

// Cancel 取消执行
func (e *APIExecutor) Cancel(taskID string) error {
	// API 执行通过 context 自动取消
	return nil
}
