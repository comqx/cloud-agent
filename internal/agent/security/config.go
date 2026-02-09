package security

import (
	"fmt"
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

// SecurityConfig 安全配置
type SecurityConfig struct {
	// 是否启用命令白名单
	CommandWhitelistEnabled bool `yaml:"command_whitelist_enabled"`

	// 允许的命令列表
	AllowedCommands []CommandPattern `yaml:"allowed_commands"`

	// 禁止的命令模式
	BlockedPatterns []CommandPattern `yaml:"blocked_patterns"`
}

// LoadSecurityConfig 从文件加载安全配置
func LoadSecurityConfig(path string) (*SecurityConfig, error) {
	if path == "" {
		log.Println("[WARN] Security config path is empty, all commands will be allowed — this is insecure!")
		return &SecurityConfig{
			CommandWhitelistEnabled: false,
		}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		// 如果配置文件不存在，返回默认配置（禁用白名单）
		if os.IsNotExist(err) {
			log.Printf("[WARN] Security config file not found at %q, all commands will be allowed — this is insecure!", path)
			return &SecurityConfig{
				CommandWhitelistEnabled: false,
			}, nil
		}
		return nil, fmt.Errorf("failed to read security config: %w", err)
	}

	log.Printf("[INFO] Loaded security config from %s", path)

	var config SecurityConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse security config: %w", err)
	}

	return &config, nil
}
