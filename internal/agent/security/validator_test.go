package security

import (
	"testing"
)

// TestBlacklistAlwaysChecked 验证 Bug 2 修复：
// 即使白名单未启用 (enabled=false)，黑名单也必须生效
func TestBlacklistAlwaysChecked(t *testing.T) {
	config := &SecurityConfig{
		CommandWhitelistEnabled: false, // 白名单未启用
		BlockedPatterns: []CommandPattern{
			{Pattern: ".*rm\\s+(-[a-z]*r[a-z]*f[a-z]*|--recursive.*--force)\\s+/.*", Reason: "禁止递归强制删除"},
			{Pattern: ".*(shutdown|poweroff|halt|reboot).*", Reason: "禁止关机重启"},
			{Pattern: ".*(sudo|su)\\s+.*", Reason: "禁止权限提升"},
		},
	}

	v, err := NewCommandValidator(config)
	if err != nil {
		t.Fatalf("NewCommandValidator failed: %v", err)
	}

	tests := []struct {
		name      string
		command   string
		wantBlock bool
	}{
		{"rm -rf / should be blocked", "rm -rf /", true},
		{"sudo ls should be blocked", "sudo ls", true},
		{"shutdown should be blocked", "shutdown -h now", true},
		{"reboot should be blocked", "reboot", true},
		{"ls should be allowed", "ls -la", false},
		{"cat should be allowed", "cat /etc/hosts", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateCommand(tt.command)
			if tt.wantBlock && err == nil {
				t.Errorf("ValidateCommand(%q) = nil, want error (should be blocked)", tt.command)
			}
			if !tt.wantBlock && err != nil {
				t.Errorf("ValidateCommand(%q) = %v, want nil (should be allowed)", tt.command, err)
			}
		})
	}
}

// TestWhitelistEnabled 验证白名单启用时的正常行为
func TestWhitelistEnabled(t *testing.T) {
	config := &SecurityConfig{
		CommandWhitelistEnabled: true,
		AllowedCommands: []CommandPattern{
			{Pattern: "^ls\\s*.*", Description: "列出文件"},
			{Pattern: "^cat\\s+.*", Description: "读取文件"},
			{Pattern: "^(hostname|uptime|date|whoami|pwd)$", Description: "基本系统信息"},
		},
		BlockedPatterns: []CommandPattern{
			{Pattern: ".*(sudo|su)\\s+.*", Reason: "禁止权限提升"},
		},
	}

	v, err := NewCommandValidator(config)
	if err != nil {
		t.Fatalf("NewCommandValidator failed: %v", err)
	}

	tests := []struct {
		name      string
		command   string
		wantBlock bool
	}{
		{"ls allowed by whitelist", "ls -la", false},
		{"cat allowed by whitelist", "cat /etc/hosts", false},
		{"hostname allowed by whitelist", "hostname", false},
		{"rm not in whitelist", "rm -f somefile", true},
		{"wget not in whitelist", "wget http://example.com", true},
		{"sudo blocked by blacklist even if whitelisted", "sudo ls", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateCommand(tt.command)
			if tt.wantBlock && err == nil {
				t.Errorf("ValidateCommand(%q) = nil, want error", tt.command)
			}
			if !tt.wantBlock && err != nil {
				t.Errorf("ValidateCommand(%q) = %v, want nil", tt.command, err)
			}
		})
	}
}

// TestBlacklistPriorityOverWhitelist 验证黑名单优先级高于白名单
func TestBlacklistPriorityOverWhitelist(t *testing.T) {
	config := &SecurityConfig{
		CommandWhitelistEnabled: true,
		AllowedCommands: []CommandPattern{
			// 故意在白名单中允许 sudo 开头的命令
			{Pattern: "^sudo\\s+.*", Description: "sudo命令"},
		},
		BlockedPatterns: []CommandPattern{
			{Pattern: ".*(sudo|su)\\s+.*", Reason: "禁止权限提升"},
		},
	}

	v, err := NewCommandValidator(config)
	if err != nil {
		t.Fatalf("NewCommandValidator failed: %v", err)
	}

	// 即使白名单允许 sudo，黑名单也应该阻止它
	err = v.ValidateCommand("sudo rm -rf /")
	if err == nil {
		t.Error("ValidateCommand(\"sudo rm -rf /\") = nil, want error (blacklist should override whitelist)")
	}
}

// TestEmptyConfig 验证 Bug 3 相关场景：空配置时的行为
func TestEmptyConfig(t *testing.T) {
	config := &SecurityConfig{
		CommandWhitelistEnabled: false,
		// 无白名单，无黑名单
	}

	v, err := NewCommandValidator(config)
	if err != nil {
		t.Fatalf("NewCommandValidator failed: %v", err)
	}

	// 空配置时所有命令都应该被允许（因为没有任何规则）
	err = v.ValidateCommand("rm -rf /")
	if err != nil {
		t.Errorf("ValidateCommand with empty config = %v, want nil", err)
	}
}

// TestLoadSecurityConfig_EmptyPath 验证 Bug 1/3：空路径时应返回默认配置并有警告
func TestLoadSecurityConfig_EmptyPath(t *testing.T) {
	config, err := LoadSecurityConfig("")
	if err != nil {
		t.Fatalf("LoadSecurityConfig(\"\") returned error: %v", err)
	}
	if config.CommandWhitelistEnabled {
		t.Error("Expected CommandWhitelistEnabled=false for empty path")
	}
}

// TestLoadSecurityConfig_NonExistentPath 验证不存在路径时返回默认配置
func TestLoadSecurityConfig_NonExistentPath(t *testing.T) {
	config, err := LoadSecurityConfig("/nonexistent/path/security.yaml")
	if err != nil {
		t.Fatalf("LoadSecurityConfig returned error: %v", err)
	}
	if config.CommandWhitelistEnabled {
		t.Error("Expected CommandWhitelistEnabled=false for nonexistent path")
	}
}
