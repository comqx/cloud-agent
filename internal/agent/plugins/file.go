package plugins

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/cloud-agent/cloud-agent/internal/common"
)

// FileExecutor 文件操作执行器
type FileExecutor struct {
	basePath string
	timeout  time.Duration
}

// NewFileExecutor 创建文件执行器
func NewFileExecutor(config map[string]interface{}) *FileExecutor {
	// 默认路径：agent 同级目录下的 tmp 目录
	defaultPath := "./tmp"
	if wd, err := os.Getwd(); err == nil {
		defaultPath = filepath.Join(wd, "tmp")
	}

	exec := &FileExecutor{
		basePath: defaultPath,
		timeout:  10 * time.Minute,
	}

	if basePath, ok := config["base_path"].(string); ok && basePath != "" {
		exec.basePath = basePath
	}

	// 确保基础路径存在
	os.MkdirAll(exec.basePath, 0755)

	return exec
}

// Type 返回执行器类型
func (e *FileExecutor) Type() common.TaskType {
	return common.TaskTypeFile
}

// Execute 执行文件操作
func (e *FileExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// 从 params 获取操作类型和目标路径
	operation, _ := params["operation"].(string)
	if operation == "" {
		operation = "copy" // 默认操作
	}

	targetPath, _ := params["target_path"].(string)
	// 如果 targetPath 为空，使用默认路径（基础路径）
	if targetPath == "" {
		targetPath = e.basePath
	} else {
		// 确保目标路径在基础路径内（安全限制）
		if !strings.HasPrefix(targetPath, e.basePath) {
			targetPath = filepath.Join(e.basePath, targetPath)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	switch operation {
	case "copy", "distribute":
		return e.copyFile(ctx, fileID, targetPath, params, logCallback, taskID)
	case "delete":
		return e.deleteFile(ctx, targetPath, logCallback, taskID)
	case "create":
		return e.createFile(ctx, targetPath, params, logCallback, taskID)
	default:
		return "", common.NewErrorf("unknown file operation: %s", operation)
	}
}

// copyFile 复制文件
func (e *FileExecutor) copyFile(ctx context.Context, fileID string, targetPath string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Copying file %s to %s", fileID, targetPath))
	}

	// 从 params 获取源文件路径
	// 实际实现中，应该从 Cloud 下载文件
	// 这里简化处理，假设文件已经在本地
	sourcePath, ok := params["file_path"].(string)
	if !ok || sourcePath == "" {
		return "", common.NewError("file_path is required for copy operation")
	}

	// 获取文件名：优先使用传递的原始文件名，否则从路径提取
	sourceFileName := ""
	if fileName, ok := params["file_name"].(string); ok && fileName != "" {
		sourceFileName = fileName
		// 清理文件名中的路径分隔符
		sourceFileName = strings.ReplaceAll(sourceFileName, "/", "_")
		sourceFileName = strings.ReplaceAll(sourceFileName, "\\", "_")
		sourceFileName = strings.ReplaceAll(sourceFileName, "..", "_")
	}
	if sourceFileName == "" {
		// 如果没有传递文件名，从路径提取
		sourceFileName = filepath.Base(sourcePath)
	}

	// 检查 targetPath 是否是目录
	targetInfo, err := os.Stat(targetPath)
	if err == nil && targetInfo.IsDir() {
		// targetPath 是目录，在目录下使用源文件名
		targetPath = filepath.Join(targetPath, sourceFileName)
	} else if err != nil {
		// 路径不存在，检查父目录是否存在
		parentDir := filepath.Dir(targetPath)
		if parentInfo, err := os.Stat(parentDir); err == nil && parentInfo.IsDir() {
			// 父目录存在，targetPath 应该是文件路径
		} else {
			// 父目录不存在，targetPath 应该是文件路径，需要创建父目录
			if err := os.MkdirAll(parentDir, 0755); err != nil {
				return "", fmt.Errorf("failed to create target directory: %w", err)
			}
		}
	}

	// 确保目标目录存在
	targetDir := filepath.Dir(targetPath)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create target directory: %w", err)
	}

	// 打开源文件
	src, err := os.Open(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	// 创建目标文件
	dst, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to create target file: %w", err)
	}
	defer dst.Close()

	// 复制文件内容
	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to copy file: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("File copied successfully to %s", targetPath))
	}

	return fmt.Sprintf("File copied to %s", targetPath), nil
}

// deleteFile 删除文件
func (e *FileExecutor) deleteFile(ctx context.Context, targetPath string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Deleting file: %s", targetPath))
	}

	if err := os.Remove(targetPath); err != nil {
		return "", fmt.Errorf("failed to delete file: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", "File deleted successfully")
	}

	return fmt.Sprintf("File deleted: %s", targetPath), nil
}

// createFile 创建文件
func (e *FileExecutor) createFile(ctx context.Context, targetPath string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Creating file: %s", targetPath))
	}

	// 获取文件内容
	content, _ := params["content"].(string)

	// 确保目标目录存在
	targetDir := filepath.Dir(targetPath)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create target directory: %w", err)
	}

	// 创建文件
	file, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// 写入内容
	if content != "" {
		if _, err := file.WriteString(content); err != nil {
			return "", fmt.Errorf("failed to write file: %w", err)
		}
	}

	if logCallback != nil {
		logCallback(taskID, "info", "File created successfully")
	}

	return fmt.Sprintf("File created: %s", targetPath), nil
}

// Cancel 取消执行
func (e *FileExecutor) Cancel(taskID string) error {
	// 文件操作通过 context 自动取消
	return nil
}
