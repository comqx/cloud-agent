package plugins

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/cloud-agent/internal/agent/security"
	"github.com/cloud-agent/internal/common"
)

// ShellExecutor Shell 命令执行器
type ShellExecutor struct {
	timeout   time.Duration
	validator *security.CommandValidator
	audit     *security.AuditLogger
}

// NewShellExecutor 创建 Shell 执行器
func NewShellExecutor(agentID string, securityConfigPath string) (*ShellExecutor, error) {
	// 加载安全配置
	config, err := security.LoadSecurityConfig(securityConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load security config: %w", err)
	}

	// 创建命令验证器
	validator, err := security.NewCommandValidator(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create command validator: %w", err)
	}

	// 创建审计日志记录器
	audit := security.NewAuditLogger(agentID)

	return &ShellExecutor{
		timeout:   30 * time.Minute, // 默认超时 30 分钟
		validator: validator,
		audit:     audit,
	}, nil
}

// Type 返回执行器类型
func (e *ShellExecutor) Type() common.TaskType {
	return common.TaskTypeShell
}

// Execute 执行 Shell 命令
func (e *ShellExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	if command == "" {
		return "", common.NewError("command is empty")
	}

	// 验证命令是否允许执行
	startTime := time.Now()
	if err := e.validator.ValidateCommand(command); err != nil {
		// 记录被阻止的命令
		e.audit.LogCommandAttempt(taskID, string(common.TaskTypeShell), command, false, err.Error())
		if logCallback != nil {
			logCallback(taskID, "error", fmt.Sprintf("Command blocked by security policy: %v", err))
		}
		return "", fmt.Errorf("security validation failed: %w", err)
	}

	// 记录允许的命令
	e.audit.LogCommandAttempt(taskID, string(common.TaskTypeShell), command, true, "")

	if logCallback != nil {
		logCallback(taskID, "info", "Executing command: "+command)
	}

	// 创建上下文，支持超时和取消
	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	// 根据操作系统选择 shell
	var cmd *exec.Cmd
	if strings.HasPrefix(command, "/") || strings.Contains(command, " ") {
		// 完整命令，直接执行
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	} else {
		// 简单命令
		parts := strings.Fields(command)
		cmd = exec.CommandContext(ctx, parts[0], parts[1:]...)
	}

	// 创建管道以实时读取输出
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start command: %w", err)
	}

	// 实时读取输出
	var output strings.Builder
	go func() {
		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			line := scanner.Text()
			// 过滤空行，避免产生多余的日志
			if strings.TrimSpace(line) == "" {
				continue
			}
			output.WriteString(line + "\n")
			if logCallback != nil {
				logCallback(taskID, "info", line)
			}
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			line := scanner.Text()
			// 过滤空行，避免产生多余的日志
			if strings.TrimSpace(line) == "" {
				continue
			}
			output.WriteString(line + "\n")
			if logCallback != nil {
				logCallback(taskID, "error", line)
			}
		}
	}()

	// 等待命令完成
	err = cmd.Wait()
	result := output.String()
	duration := time.Since(startTime)

	// 记录命令执行结果
	resultStatus := "success"
	if err != nil {
		resultStatus = "failed"
	}
	e.audit.LogCommandResult(taskID, string(common.TaskTypeShell), command, resultStatus, err, duration)

	if err != nil {
		if logCallback != nil {
			logCallback(taskID, "error", "Command failed: "+err.Error())
		}
		return result, fmt.Errorf("command failed: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", "Command completed successfully")
	}

	return result, nil
}

// Cancel 取消执行（Shell 执行器通过 context 自动取消）
func (e *ShellExecutor) Cancel(taskID string) error {
	// Shell 执行器的取消由 Manager 通过 context 处理
	return nil
}
