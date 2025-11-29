package security

import (
	"fmt"
	"regexp"
	"sync"
)

// CommandPattern 命令模式
type CommandPattern struct {
	Pattern     string `yaml:"pattern"`
	Description string `yaml:"description"`
	Reason      string `yaml:"reason,omitempty"` // 用于黑名单
}

// CommandValidator 命令验证器
type CommandValidator struct {
	enabled         bool
	allowedPatterns []*regexp.Regexp
	blockedPatterns []*regexp.Regexp
	mu              sync.RWMutex
}

// NewCommandValidator 创建命令验证器
func NewCommandValidator(config *SecurityConfig) (*CommandValidator, error) {
	v := &CommandValidator{
		enabled: config.CommandWhitelistEnabled,
	}

	// 编译允许的命令模式
	for _, pattern := range config.AllowedCommands {
		re, err := regexp.Compile(pattern.Pattern)
		if err != nil {
			return nil, fmt.Errorf("invalid allowed pattern %q: %w", pattern.Pattern, err)
		}
		v.allowedPatterns = append(v.allowedPatterns, re)
	}

	// 编译禁止的命令模式
	for _, pattern := range config.BlockedPatterns {
		re, err := regexp.Compile(pattern.Pattern)
		if err != nil {
			return nil, fmt.Errorf("invalid blocked pattern %q: %w", pattern.Pattern, err)
		}
		v.blockedPatterns = append(v.blockedPatterns, re)
	}

	return v, nil
}

// ValidateCommand 验证命令是否允许执行
func (v *CommandValidator) ValidateCommand(cmd string) error {
	if !v.enabled {
		return nil // 未启用白名单，允许所有命令
	}

	v.mu.RLock()
	defer v.mu.RUnlock()

	// 1. 检查黑名单（优先级最高）
	for _, pattern := range v.blockedPatterns {
		if pattern.MatchString(cmd) {
			return fmt.Errorf("command blocked by security policy: %q matches blocked pattern %q", cmd, pattern.String())
		}
	}

	// 2. 检查白名单
	if len(v.allowedPatterns) > 0 {
		for _, pattern := range v.allowedPatterns {
			if pattern.MatchString(cmd) {
				return nil // 匹配白名单，允许执行
			}
		}
		// 没有匹配任何白名单模式
		return fmt.Errorf("command not in whitelist: %q", cmd)
	}

	// 没有配置白名单，允许执行（但已通过黑名单检查）
	return nil
}

// IsEnabled 返回验证器是否启用
func (v *CommandValidator) IsEnabled() bool {
	v.mu.RLock()
	defer v.mu.RUnlock()
	return v.enabled
}
