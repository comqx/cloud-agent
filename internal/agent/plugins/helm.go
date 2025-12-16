package plugins

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// HelmExecutor Helm 执行器
type HelmExecutor struct {
	settings  *cli.EnvSettings
	namespace string
}

// HelmParams Helm 操作参数
type HelmParams struct {
	Operation    string                 `json:"operation"`      // install, upgrade, list, delete, get-values
	ReleaseName  string                 `json:"release_name"`   // Helm release 名称
	Namespace    string                 `json:"namespace"`      // 命名空间
	ChartFileID  string                 `json:"chart_file_id"`  // Chart 文件 ID（上传的 .tgz 文件）
	ValuesFileID string                 `json:"values_file_id"` // 自定义 values 文件 ID
	Repository   *HelmRepository        `json:"repository"`     // Helm 仓库配置
	Chart        string                 `json:"chart"`          // Chart 名称（从仓库安装时使用）
	Version      string                 `json:"version"`        // Chart 版本
	Values       map[string]interface{} `json:"values"`         // 内联 values 覆盖
	Flags        *HelmFlags             `json:"flags"`          // Helm 标志
}

// HelmRepository Helm 仓库配置
type HelmRepository struct {
	URL      string `json:"url"`      // 仓库 URL
	Name     string `json:"name"`     // 仓库名称
	Username string `json:"username"` // 用户名（私有仓库）
	Password string `json:"password"` // 密码（私有仓库）
}

// HelmFlags Helm 操作标志
type HelmFlags struct {
	CreateNamespace bool   `json:"create_namespace"` // 创建命名空间
	Wait            bool   `json:"wait"`             // 等待资源就绪
	Timeout         string `json:"timeout"`          // 超时时间（例如 "5m"）
	Force           bool   `json:"force"`            // 强制操作
	DryRun          bool   `json:"dry_run"`          // 模拟运行
}

// NewHelmExecutor 创建 Helm 执行器
func NewHelmExecutor(config map[string]interface{}) (*HelmExecutor, error) {
	settings := cli.New()

	// 尝试使用 in-cluster 配置
	if _, err := rest.InClusterConfig(); err == nil {
		// 在集群内运行，使用默认配置
		settings.KubeConfig = ""
	} else {
		// 在集群外运行，尝试使用 kubeconfig
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = clientcmd.RecommendedHomeFile
		}
		settings.KubeConfig = kubeconfig
	}

	return &HelmExecutor{
		settings:  settings,
		namespace: "default",
	}, nil
}

// Type 返回执行器类型
func (e *HelmExecutor) Type() common.TaskType {
	return common.TaskTypeHelm
}

// Execute 执行 Helm 操作
func (e *HelmExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// 解析参数
	var helmParams HelmParams
	if len(params) > 0 {
		paramsBytes, _ := json.Marshal(params)
		if err := json.Unmarshal(paramsBytes, &helmParams); err != nil {
			return "", fmt.Errorf("failed to parse helm params: %w", err)
		}
	}

	// 设置命名空间
	namespace := helmParams.Namespace
	if namespace == "" {
		namespace = "default"
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Starting Helm operation: %s", helmParams.Operation))
	}

	// 根据操作类型执行
	switch helmParams.Operation {
	case "install":
		return e.helmInstall(taskID, &helmParams, namespace, logCallback)
	case "upgrade":
		return e.helmUpgrade(taskID, &helmParams, namespace, logCallback)
	case "list":
		return e.helmList(taskID, namespace, logCallback)
	case "delete", "uninstall":
		return e.helmDelete(taskID, &helmParams, namespace, logCallback)
	case "get-values":
		return e.helmGetValues(taskID, &helmParams, namespace, logCallback)
	default:
		return "", fmt.Errorf("unsupported helm operation: %s", helmParams.Operation)
	}
}

// helmInstall 安装 Helm chart
func (e *HelmExecutor) helmInstall(taskID string, params *HelmParams, namespace string, logCallback LogCallback) (string, error) {
	if params.ReleaseName == "" {
		return "", fmt.Errorf("release_name is required for install operation")
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(e.settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf(format, v...))
		}
	}); err != nil {
		return "", fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	client := action.NewInstall(actionConfig)
	client.ReleaseName = params.ReleaseName
	client.Namespace = namespace

	// 设置标志
	if params.Flags != nil {
		client.CreateNamespace = params.Flags.CreateNamespace
		client.Wait = params.Flags.Wait
		if params.Flags.Timeout != "" {
			timeout, err := time.ParseDuration(params.Flags.Timeout)
			if err != nil {
				return "", fmt.Errorf("invalid timeout format: %w", err)
			}
			client.Timeout = timeout
		}
		client.DryRun = params.Flags.DryRun
	}

	// 获取 chart
	chartPath, err := e.getChart(taskID, params, logCallback)
	if err != nil {
		return "", fmt.Errorf("failed to get chart: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Loading chart from: %s", chartPath))
	}

	chart, err := loader.Load(chartPath)
	if err != nil {
		return "", fmt.Errorf("failed to load chart: %w", err)
	}

	// 合并 values
	values, err := e.mergeValues(taskID, params, logCallback)
	if err != nil {
		return "", fmt.Errorf("failed to merge values: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Installing release: %s in namespace: %s", params.ReleaseName, namespace))
	}

	// 执行安装
	release, err := client.Run(chart, values)
	if err != nil {
		return "", fmt.Errorf("helm install failed: %w", err)
	}

	result := fmt.Sprintf("Successfully installed release: %s, version: %d, status: %s", release.Name, release.Version, release.Info.Status)
	if logCallback != nil {
		logCallback(taskID, "info", result)
	}

	return result, nil
}

// helmUpgrade 升级 Helm release
func (e *HelmExecutor) helmUpgrade(taskID string, params *HelmParams, namespace string, logCallback LogCallback) (string, error) {
	if params.ReleaseName == "" {
		return "", fmt.Errorf("release_name is required for upgrade operation")
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(e.settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf(format, v...))
		}
	}); err != nil {
		return "", fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	client := action.NewUpgrade(actionConfig)
	client.Namespace = namespace

	// 设置标志
	if params.Flags != nil {
		client.Wait = params.Flags.Wait
		if params.Flags.Timeout != "" {
			timeout, err := time.ParseDuration(params.Flags.Timeout)
			if err != nil {
				return "", fmt.Errorf("invalid timeout format: %w", err)
			}
			client.Timeout = timeout
		}
		client.Force = params.Flags.Force
		client.DryRun = params.Flags.DryRun
	}

	// 获取 chart
	chartPath, err := e.getChart(taskID, params, logCallback)
	if err != nil {
		return "", fmt.Errorf("failed to get chart: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Loading chart from: %s", chartPath))
	}

	chart, err := loader.Load(chartPath)
	if err != nil {
		return "", fmt.Errorf("failed to load chart: %w", err)
	}

	// 合并 values
	values, err := e.mergeValues(taskID, params, logCallback)
	if err != nil {
		return "", fmt.Errorf("failed to merge values: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Upgrading release: %s in namespace: %s", params.ReleaseName, namespace))
	}

	// 执行升级
	release, err := client.Run(params.ReleaseName, chart, values)
	if err != nil {
		return "", fmt.Errorf("helm upgrade failed: %w", err)
	}

	result := fmt.Sprintf("Successfully upgraded release: %s, version: %d, status: %s", release.Name, release.Version, release.Info.Status)
	if logCallback != nil {
		logCallback(taskID, "info", result)
	}

	return result, nil
}

// helmList 列出 Helm releases
func (e *HelmExecutor) helmList(taskID string, namespace string, logCallback LogCallback) (string, error) {
	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(e.settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf(format, v...))
		}
	}); err != nil {
		return "", fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	client := action.NewList(actionConfig)
	client.All = true

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Listing releases in namespace: %s", namespace))
	}

	releases, err := client.Run()
	if err != nil {
		return "", fmt.Errorf("helm list failed: %w", err)
	}

	if len(releases) == 0 {
		result := fmt.Sprintf("No releases found in namespace: %s", namespace)
		if logCallback != nil {
			logCallback(taskID, "info", result)
		}
		return result, nil
	}

	var result strings.Builder
	result.WriteString(fmt.Sprintf("Found %d releases in namespace %s:\n", len(releases), namespace))
	for _, rel := range releases {
		result.WriteString(fmt.Sprintf("- %s (version: %d, status: %s, chart: %s, updated: %s)\n",
			rel.Name, rel.Version, rel.Info.Status, rel.Chart.Metadata.Name, rel.Info.LastDeployed.Format(time.RFC3339)))
	}

	if logCallback != nil {
		logCallback(taskID, "info", result.String())
	}

	return result.String(), nil
}

// helmDelete 删除 Helm release
func (e *HelmExecutor) helmDelete(taskID string, params *HelmParams, namespace string, logCallback LogCallback) (string, error) {
	if params.ReleaseName == "" {
		return "", fmt.Errorf("release_name is required for delete operation")
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(e.settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf(format, v...))
		}
	}); err != nil {
		return "", fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	client := action.NewUninstall(actionConfig)

	// 设置标志
	if params.Flags != nil {
		if params.Flags.Timeout != "" {
			timeout, err := time.ParseDuration(params.Flags.Timeout)
			if err != nil {
				return "", fmt.Errorf("invalid timeout format: %w", err)
			}
			client.Timeout = timeout
		}
		client.DryRun = params.Flags.DryRun
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Deleting release: %s from namespace: %s", params.ReleaseName, namespace))
	}

	response, err := client.Run(params.ReleaseName)
	if err != nil {
		return "", fmt.Errorf("helm delete failed: %w", err)
	}

	result := fmt.Sprintf("Successfully deleted release: %s, info: %s", params.ReleaseName, response.Info)
	if logCallback != nil {
		logCallback(taskID, "info", result)
	}

	return result, nil
}

// helmGetValues 获取 release 的 values
func (e *HelmExecutor) helmGetValues(taskID string, params *HelmParams, namespace string, logCallback LogCallback) (string, error) {
	if params.ReleaseName == "" {
		return "", fmt.Errorf("release_name is required for get-values operation")
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(e.settings.RESTClientGetter(), namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf(format, v...))
		}
	}); err != nil {
		return "", fmt.Errorf("failed to initialize helm action config: %w", err)
	}

	client := action.NewGetValues(actionConfig)
	client.AllValues = true

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Getting values for release: %s in namespace: %s", params.ReleaseName, namespace))
	}

	values, err := client.Run(params.ReleaseName)
	if err != nil {
		return "", fmt.Errorf("helm get values failed: %w", err)
	}

	valuesJSON, err := json.MarshalIndent(values, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal values: %w", err)
	}

	result := fmt.Sprintf("Values for release %s:\n%s", params.ReleaseName, string(valuesJSON))
	if logCallback != nil {
		logCallback(taskID, "info", result)
	}

	return result, nil
}

// getChart 获取 chart（从文件或仓库）
func (e *HelmExecutor) getChart(taskID string, params *HelmParams, logCallback LogCallback) (string, error) {
	// 如果提供了 chart 文件 ID，从文件存储下载
	if params.ChartFileID != "" {
		// TODO: 实现从文件存储下载 chart 文件
		// 这里需要调用文件 API 下载文件到临时目录
		// 暂时返回错误，等待文件存储集成
		return "", fmt.Errorf("chart file download not implemented yet, chart_file_id: %s", params.ChartFileID)
	}

	// 如果提供了仓库配置，从仓库安装
	if params.Repository != nil && params.Chart != "" {
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf("Adding repository: %s (%s)", params.Repository.Name, params.Repository.URL))
		}

		// 添加仓库
		if err := e.addRepository(params.Repository); err != nil {
			return "", fmt.Errorf("failed to add repository: %w", err)
		}

		// 下载 chart
		chartPath, err := e.downloadChart(taskID, params, logCallback)
		if err != nil {
			return "", fmt.Errorf("failed to download chart: %w", err)
		}

		return chartPath, nil
	}

	return "", fmt.Errorf("either chart_file_id or repository configuration is required")
}

// addRepository 添加 Helm 仓库
func (e *HelmExecutor) addRepository(repository *HelmRepository) error {
	repoFile := e.settings.RepositoryConfig

	// 创建仓库配置目录
	if err := os.MkdirAll(filepath.Dir(repoFile), os.ModePerm); err != nil {
		return fmt.Errorf("failed to create repository config directory: %w", err)
	}

	// 加载现有仓库配置
	repoConfig := repo.NewFile()
	if _, err := os.Stat(repoFile); err == nil {
		repoConfig, err = repo.LoadFile(repoFile)
		if err != nil {
			return fmt.Errorf("failed to load repository config: %w", err)
		}
	}

	// 检查仓库是否已存在
	if repoConfig.Has(repository.Name) {
		// 仓库已存在，更新 URL
		repoConfig.Update(&repo.Entry{
			Name: repository.Name,
			URL:  repository.URL,
		})
	} else {
		// 添加新仓库
		repoConfig.Add(&repo.Entry{
			Name:     repository.Name,
			URL:      repository.URL,
			Username: repository.Username,
			Password: repository.Password,
		})
	}

	// 保存仓库配置
	if err := repoConfig.WriteFile(repoFile, 0644); err != nil {
		return fmt.Errorf("failed to write repository config: %w", err)
	}

	// 更新仓库索引
	r, err := repo.NewChartRepository(&repo.Entry{
		Name:     repository.Name,
		URL:      repository.URL,
		Username: repository.Username,
		Password: repository.Password,
	}, getter.All(e.settings))
	if err != nil {
		return fmt.Errorf("failed to create chart repository: %w", err)
	}

	if _, err := r.DownloadIndexFile(); err != nil {
		return fmt.Errorf("failed to download repository index: %w", err)
	}

	return nil
}

// downloadChart 从仓库下载 chart
func (e *HelmExecutor) downloadChart(taskID string, params *HelmParams, logCallback LogCallback) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Downloading chart: %s", params.Chart))
	}

	// 创建临时目录
	tmpDir, err := os.MkdirTemp("", "helm-chart-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	// 使用 Helm pull 下载 chart
	client := action.NewPullWithOpts(action.WithConfig(new(action.Configuration)))
	client.Settings = e.settings
	client.DestDir = tmpDir
	client.Version = params.Version

	chartURL := params.Chart
	output, err := client.Run(chartURL)
	if err != nil {
		return "", fmt.Errorf("failed to pull chart: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Chart downloaded to: %s", output))
	}

	return output, nil
}

// mergeValues 合并 values
func (e *HelmExecutor) mergeValues(taskID string, params *HelmParams, logCallback LogCallback) (map[string]interface{}, error) {
	values := make(map[string]interface{})

	// 如果提供了 values 文件 ID，从文件存储下载并合并
	if params.ValuesFileID != "" {
		// TODO: 实现从文件存储下载 values 文件
		// 这里需要调用文件 API 下载文件并解析 YAML
		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf("Values file download not implemented yet, values_file_id: %s", params.ValuesFileID))
		}
	}

	// 合并内联 values
	if params.Values != nil {
		for k, v := range params.Values {
			values[k] = v
		}
	}

	return values, nil
}

// Cancel 取消执行
func (e *HelmExecutor) Cancel(taskID string) error {
	// Helm 操作的取消由 Manager 通过 context 处理
	return nil
}
