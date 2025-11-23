package executor

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/cloud-agent/cloud-agent/internal/agent/plugins"
	"github.com/cloud-agent/cloud-agent/internal/common"
	"gopkg.in/yaml.v3"
)

// PluginConfig 插件配置
type PluginConfig struct {
	Plugins []PluginDefinition `yaml:"plugins"`
}

// PluginDefinition 插件定义
type PluginDefinition struct {
	Type    string                 `yaml:"type"`
	Enabled bool                   `yaml:"enabled"`
	Config  map[string]interface{} `yaml:"config"`
}

// LoadPluginConfig 加载插件配置
func LoadPluginConfig(configPath string) (*PluginConfig, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			// 配置文件不存在，返回默认配置
			return &PluginConfig{
				Plugins: []PluginDefinition{
					{
						Type:    string(common.TaskTypeShell),
						Enabled: true,
						Config:  make(map[string]interface{}),
					},
				},
			}, nil
		}
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config PluginConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

// SavePluginConfig 保存插件配置
func SavePluginConfig(config *PluginConfig, configPath string) error {
	// 确保目录存在
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// LoadPluginsFromConfig 从配置加载插件
func LoadPluginsFromConfig(config *PluginConfig, manager *Manager) error {
	for _, pluginDef := range config.Plugins {
		if !pluginDef.Enabled {
			continue
		}

		taskType := common.TaskType(pluginDef.Type)
		var exec plugins.Executor
		var err error

		switch taskType {
		case common.TaskTypeShell:
			exec = plugins.NewShellExecutor()
		case common.TaskTypeMySQL:
			exec = plugins.NewMySQLExecutor(pluginDef.Config)
		case common.TaskTypeSQL:
			// 兼容旧版本，映射到 MySQL
			exec = plugins.NewMySQLExecutor(pluginDef.Config)
		case common.TaskTypePostgres:
			exec = plugins.NewPostgresExecutor(pluginDef.Config)
		case common.TaskTypeRedis:
			exec, err = plugins.NewDatabaseExecutor("redis", pluginDef.Config)
			if err != nil {
				return err
			}
		case common.TaskTypeMongo:
			exec = plugins.NewMongoExecutor(pluginDef.Config)
		case common.TaskTypeElasticsearch:
			exec = plugins.NewESExecutor(pluginDef.Config)
		case common.TaskTypeClickHouse:
			exec = plugins.NewClickHouseExecutor(pluginDef.Config)
		case common.TaskTypeDoris:
			exec = plugins.NewDorisExecutor(pluginDef.Config)
		case common.TaskTypeK8s:
			exec = plugins.NewK8sExecutor(pluginDef.Config)
		case common.TaskTypeAPI:
			exec = plugins.NewAPIExecutor(pluginDef.Config)
		case common.TaskTypeFile:
			exec = plugins.NewFileExecutor(pluginDef.Config)
		default:
			return fmt.Errorf("unknown plugin type: %s", pluginDef.Type)
		}

		manager.RegisterExecutor(exec)
	}

	return nil
}
