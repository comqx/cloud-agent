package plugins

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/retry"
	sigsyaml "sigs.k8s.io/yaml"
)

// K8sExecutor Kubernetes 执行器（使用 client-go）
type K8sExecutor struct {
	clientset     kubernetes.Interface
	dynamicClient dynamic.Interface
	restMapper    meta.RESTMapper
	namespace     string
	timeout       time.Duration
}

// NewK8sExecutor 创建 K8s 执行器
func NewK8sExecutor(config map[string]interface{}) *K8sExecutor {
	exec := &K8sExecutor{
		namespace: "default",
		timeout:   30 * time.Minute,
	}

	if namespace, ok := config["namespace"].(string); ok {
		exec.namespace = namespace
	}

	normalizeHost := func(host string) string {
		host = strings.TrimSpace(host)
		host = strings.Trim(host, "`\"'")
		host = strings.TrimSpace(host)
		return host
	}

	const defaultKubeletConfig = "/etc/kubernetes/kubelet.conf"
	const defaultCloudAgentSATokenFile = "/tmp/.cloud-agent/sa/token"
	const defaultCloudAgentSACAFile = "/tmp/.cloud-agent/sa/ca.crt"

	apiServer, _ := config["api_server"].(string)
	apiServer = normalizeHost(apiServer)

	if apiServer == "" {
		kubeletConfigPath := defaultKubeletConfig
		if v, ok := config["kubelet_config"].(string); ok && strings.TrimSpace(v) != "" {
			kubeletConfigPath = strings.TrimSpace(v)
		}
		if kubeletConfigPath != "" {
			server, err := kubeconfigServer(kubeletConfigPath)
			if err != nil {
				log.Printf("[K8s] Failed to read api server from kubelet_config %s: %v", kubeletConfigPath, err)
			} else {
				apiServer = normalizeHost(server)
			}
		}
	}

	if apiServer == "" {
		log.Printf("[K8s] api_server is required for ServiceAccount token auth")
		return exec
	}

	tokenFile := defaultCloudAgentSATokenFile
	if v, ok := config["token_file"].(string); ok && strings.TrimSpace(v) != "" {
		tokenFile = strings.TrimSpace(v)
	}
	caFile := defaultCloudAgentSACAFile
	if v, ok := config["ca_file"].(string); ok && strings.TrimSpace(v) != "" {
		caFile = strings.TrimSpace(v)
	}

	if _, statErr := os.Stat(tokenFile); statErr != nil {
		log.Printf("[K8s] ServiceAccount token file not accessible %s: %v", tokenFile, statErr)
		return exec
	}

	caBytes, readErr := os.ReadFile(caFile)
	if readErr != nil {
		log.Printf("[K8s] Failed to read ServiceAccount CA file %s: %v", caFile, readErr)
		return exec
	}

	restConfig := &rest.Config{
		Host:            apiServer,
		BearerTokenFile: tokenFile,
		TLSClientConfig: rest.TLSClientConfig{
			CAData: caBytes,
		},
		Timeout: exec.timeout,
	}

	// 创建 clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err == nil {
		exec.clientset = clientset
	} else {
		log.Printf("[K8s] Failed to create clientset: %v", err)
	}

	// 创建 dynamic client
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err == nil {
		exec.dynamicClient = dynamicClient
	} else {
		log.Printf("[K8s] Failed to create dynamic client: %v", err)
	}

	// 创建 REST mapper（使用 discovery client 动态发现 API 资源）
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
	if err == nil {
		// 使用缓存的 discovery client 和 REST mapper
		cachedDiscovery := memory.NewMemCacheClient(discoveryClient)
		exec.restMapper = restmapper.NewDeferredDiscoveryRESTMapper(cachedDiscovery)
	} else {
		log.Printf("[K8s] Failed to create discovery client: %v", err)
		// 如果创建失败，使用空的 REST mapper（会在运行时尝试重新创建）
		exec.restMapper = meta.NewDefaultRESTMapper([]schema.GroupVersion{})
	}

	return exec
}

func kubeconfigServer(path string) (string, error) {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	cfg, err := clientcmd.Load(bytes)
	if err != nil {
		return "", err
	}

	if cfg.CurrentContext != "" {
		if ctx, ok := cfg.Contexts[cfg.CurrentContext]; ok && ctx != nil && ctx.Cluster != "" {
			if cluster, ok := cfg.Clusters[ctx.Cluster]; ok && cluster != nil && cluster.Server != "" {
				return cluster.Server, nil
			}
		}
	}

	for _, cluster := range cfg.Clusters {
		if cluster != nil && cluster.Server != "" {
			return cluster.Server, nil
		}
	}

	return "", fmt.Errorf("server not found in kubeconfig")
}

// Type 返回执行器类型
func (e *K8sExecutor) Type() common.TaskType {
	return common.TaskTypeK8s
}

// Execute 执行 K8s 操作
func (e *K8sExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	// 获取操作类型，默认为 apply（create 或 update）
	operation := "apply"
	if op, ok := params["operation"].(string); ok && op != "" {
		operation = strings.ToLower(op)
	}

	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	// logs 操作特殊处理：不需要 YAML/JSON 内容
	if operation == "logs" {
		return e.getLogs(ctx, command, params, logCallback, taskID)
	}

	// events 操作特殊处理：不需要 YAML/JSON 内容
	if operation == "events" {
		return e.getEvents(ctx, command, params, logCallback, taskID)
	}

	if command == "" {
		return "", common.NewError("k8s YAML or JSON content is required")
	}

	// 判断是 YAML 还是 JSON 格式
	format := e.detectFormat(command)
	if format == "unknown" {
		// 尝试作为资源引用（Kind/Name）处理
		// 适用于 get, delete 等不需要完整 YAML/JSON 内容的操作
		// 对于不支持的操作，processResourceRef 会返回相应的错误信息
		return e.processResourceRef(ctx, command, operation, params, logCallback, taskID)
	}

	// 执行操作
	return e.processContent(ctx, command, format, operation, params, logCallback, taskID)
}

// detectFormat 检测内容格式（YAML 或 JSON）
func (e *K8sExecutor) detectFormat(content string) string {
	content = strings.TrimSpace(content)

	// 检查是否是 JSON 格式（以 { 开头）
	if strings.HasPrefix(content, "{") {
		// 验证是否是有效的 JSON 且包含 Kubernetes 资源字段
		var obj map[string]interface{}
		if err := json.Unmarshal([]byte(content), &obj); err == nil {
			if _, hasApiVersion := obj["apiVersion"]; hasApiVersion {
				if _, hasKind := obj["kind"]; hasKind {
					return "json"
				}
			}
		}
	}

	// 检查是否是 YAML 格式
	hasApiVersion := strings.HasPrefix(content, "apiVersion:") || strings.Contains(content, "\napiVersion:")
	hasKind := strings.Contains(content, "kind:") || strings.Contains(content, "\nkind:")
	if hasApiVersion && hasKind {
		return "yaml"
	}

	return "unknown"
}

// processContent 处理内容（YAML 或 JSON）
func (e *K8sExecutor) processContent(ctx context.Context, content string, format string, operation string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if e.dynamicClient == nil {
		return "", common.NewError("kubernetes client not initialized")
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Processing %s with operation: %s", strings.ToUpper(format), operation))
	} else {
		log.Printf("[K8s] [%s] Processing %s with operation: %s", taskID, strings.ToUpper(format), operation)
	}

	// 分割内容（支持多资源，使用 --- 分隔）
	manifests := strings.Split(content, "---")
	var results []string

	for i, manifest := range manifests {
		manifest = strings.TrimSpace(manifest)
		if manifest == "" {
			continue
		}

		if logCallback != nil {
			logCallback(taskID, "info", fmt.Sprintf("Processing manifest %d/%d", i+1, len(manifests)))
		} else {
			log.Printf("[K8s] [%s] Processing manifest %d/%d", taskID, i+1, len(manifests))
		}

		result, err := e.processManifest(ctx, manifest, format, operation, params, logCallback, taskID)
		if err != nil {
			return strings.Join(results, "\n\n"), fmt.Errorf("failed to process manifest %d: %w", i+1, err)
		}
		results = append(results, result)
	}

	return strings.Join(results, "\n\n"), nil
}

// processManifest 处理单个 manifest
func (e *K8sExecutor) processManifest(ctx context.Context, manifest string, format string, operation string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	obj := &unstructured.Unstructured{}
	var gvk schema.GroupVersionKind

	// 根据格式解析内容
	if format == "json" {
		// 解析 JSON
		var objMap map[string]interface{}
		if err := json.Unmarshal([]byte(manifest), &objMap); err != nil {
			return "", fmt.Errorf("failed to decode JSON: %w", err)
		}
		obj.Object = objMap

		// 获取 GVK
		apiVersion, _ := objMap["apiVersion"].(string)
		kind, _ := objMap["kind"].(string)
		if apiVersion == "" || kind == "" {
			return "", fmt.Errorf("JSON must contain apiVersion and kind fields")
		}
		// 解析 GroupVersion
		parts := strings.Split(apiVersion, "/")
		if len(parts) == 2 {
			gvk = schema.GroupVersionKind{
				Group:   parts[0],
				Version: parts[1],
				Kind:    kind,
			}
		} else {
			gvk = schema.GroupVersionKind{
				Version: apiVersion,
				Kind:    kind,
			}
		}
	} else {
		// 解析 YAML
		decoder := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme)
		_, gvkPtr, err := decoder.Decode([]byte(manifest), nil, obj)
		if err != nil {
			return "", fmt.Errorf("failed to decode YAML: %w", err)
		}
		if gvkPtr != nil {
			gvk = *gvkPtr
		}
	}

	// 确定命名空间（优先使用 params 中的 namespace，然后是 YAML 中的，最后是默认值）
	namespace := e.namespace
	if ns, ok := params["namespace"].(string); ok && ns != "" {
		namespace = ns
	} else if obj.GetNamespace() != "" {
		namespace = obj.GetNamespace()
	}
	if namespace == "" {
		namespace = "default"
	}

	// 获取 GVR（GroupVersionResource）
	var gvr schema.GroupVersionResource
	var isNamespaced bool

	// 尝试使用 REST mapper 获取映射
	if e.restMapper != nil {
		mapping, err := e.restMapper.RESTMapping(gvk.GroupKind(), gvk.Version)
		if err == nil {
			gvr = mapping.Resource
			isNamespaced = mapping.Scope.Name() == meta.RESTScopeNameNamespace
		} else {
			// REST mapper 失败，尝试从 GVK 直接构建 GVR
			gvr = schema.GroupVersionResource{
				Group:    gvk.Group,
				Version:  gvk.Version,
				Resource: e.pluralizeKind(gvk.Kind),
			}
			// 默认假设是命名空间资源（除了 ClusterRole, ClusterRoleBinding, Namespace 等）
			isNamespaced = !e.isClusterScopedResource(gvk.Kind)
		}
	} else {
		// REST mapper 未初始化，从 GVK 直接构建 GVR
		gvr = schema.GroupVersionResource{
			Group:    gvk.Group,
			Version:  gvk.Version,
			Resource: e.pluralizeKind(gvk.Kind),
		}
		isNamespaced = !e.isClusterScopedResource(gvk.Kind)
	}

	// 获取资源接口
	var dr dynamic.ResourceInterface
	if isNamespaced {
		dr = e.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = e.dynamicClient.Resource(gvr)
	}

	resourceName := obj.GetName()
	if resourceName == "" {
		return "", fmt.Errorf("resource name is required")
	}

	// 根据操作类型执行不同的操作
	switch operation {
	case "create":
		return e.createResource(ctx, dr, obj, gvk, namespace, logCallback, taskID)
	case "update":
		return e.updateResource(ctx, dr, obj, gvk, namespace, logCallback, taskID)
	case "delete":
		return e.deleteResource(ctx, dr, obj, gvk, namespace, logCallback, taskID)
	case "patch":
		return e.patchResource(ctx, dr, obj, gvk, namespace, params, logCallback, taskID)
	case "apply":
		// apply 操作：如果存在则更新，不存在则创建
		return e.applyResource(ctx, dr, obj, gvk, namespace, logCallback, taskID)
	case "get":
		return e.getResourceFromDynamic(ctx, dr, obj.GetName(), params, logCallback, taskID)
	default:
		return "", fmt.Errorf("unsupported operation: %s (supported: create, update, delete, patch, apply, get, logs)", operation)
	}
}

// processResourceRef 处理资源引用（Kind/Name 格式）
func (e *K8sExecutor) processResourceRef(ctx context.Context, command string, operation string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if e.dynamicClient == nil {
		return "", common.NewError("kubernetes client not initialized")
	}

	// 解析 Kind/Name
	parts := strings.Split(command, "/")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid resource format: expected Kind/Name (e.g. Pod/my-pod)")
	}
	kind := parts[0]
	name := parts[1]

	// 解析 GVK
	gvk, err := e.resolveGVK(kind, params)
	if err != nil {
		return "", err
	}

	// 解析 GVR
	gvr, isNamespaced, err := e.resolveGVRFromGVK(gvk)
	if err != nil {
		return "", err
	}

	// 确定命名空间
	namespace := e.namespace
	if ns, ok := params["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	// 获取资源接口
	var dr dynamic.ResourceInterface
	if isNamespaced {
		dr = e.dynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		dr = e.dynamicClient.Resource(gvr)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Processing %s %s/%s in namespace %s", operation, kind, name, namespace))
	} else {
		log.Printf("[K8s] [%s] Processing %s %s/%s in namespace %s", taskID, operation, kind, name, namespace)
	}

	switch operation {
	case "get":
		return e.getResourceFromDynamic(ctx, dr, name, params, logCallback, taskID)
	case "delete":
		// 构造一个临时的 Unstructured 对象用于删除
		obj := &unstructured.Unstructured{}
		obj.SetName(name)
		return e.deleteResource(ctx, dr, obj, gvk, namespace, logCallback, taskID)
	case "describe":
		return e.describeResource(ctx, dr, name, gvk, namespace, params, logCallback, taskID)
	default:
		return "", fmt.Errorf("unsupported operation for resource reference: %s (supported: get, delete, describe)", operation)
	}
}

// resolveGVK 解析 GVK
func (e *K8sExecutor) resolveGVK(kind string, params map[string]interface{}) (schema.GroupVersionKind, error) {
	// 1. 检查 params 中的 api_version
	if apiVersion, ok := params["api_version"].(string); ok && apiVersion != "" {
		parts := strings.Split(apiVersion, "/")
		if len(parts) == 2 {
			return schema.GroupVersionKind{Group: parts[0], Version: parts[1], Kind: kind}, nil
		}
		return schema.GroupVersionKind{Version: apiVersion, Kind: kind}, nil
	}

	// 2. 常用资源映射
	kindLower := strings.ToLower(kind)
	switch kindLower {
	case "pod", "pods", "po":
		return schema.GroupVersionKind{Version: "v1", Kind: "Pod"}, nil
	case "service", "services", "svc":
		return schema.GroupVersionKind{Version: "v1", Kind: "Service"}, nil
	case "configmap", "configmaps", "cm":
		return schema.GroupVersionKind{Version: "v1", Kind: "ConfigMap"}, nil
	case "secret", "secrets":
		return schema.GroupVersionKind{Version: "v1", Kind: "Secret"}, nil
	case "namespace", "namespaces", "ns":
		return schema.GroupVersionKind{Version: "v1", Kind: "Namespace"}, nil
	case "node", "nodes", "no":
		return schema.GroupVersionKind{Version: "v1", Kind: "Node"}, nil
	case "persistentvolume", "persistentvolumes", "pv":
		return schema.GroupVersionKind{Version: "v1", Kind: "PersistentVolume"}, nil
	case "persistentvolumeclaim", "persistentvolumeclaims", "pvc":
		return schema.GroupVersionKind{Version: "v1", Kind: "PersistentVolumeClaim"}, nil
	case "serviceaccount", "serviceaccounts", "sa":
		return schema.GroupVersionKind{Version: "v1", Kind: "ServiceAccount"}, nil
	case "deployment", "deployments", "deploy":
		return schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"}, nil
	case "statefulset", "statefulsets", "sts":
		return schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "StatefulSet"}, nil
	case "daemonset", "daemonsets", "ds":
		return schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "DaemonSet"}, nil
	case "replicaset", "replicasets", "rs":
		return schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "ReplicaSet"}, nil
	case "job", "jobs":
		return schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "Job"}, nil
	case "cronjob", "cronjobs", "cj":
		return schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "CronJob"}, nil
	case "ingress", "ingresses", "ing":
		return schema.GroupVersionKind{Group: "networking.k8s.io", Version: "v1", Kind: "Ingress"}, nil
	}

	return schema.GroupVersionKind{}, fmt.Errorf("cannot resolve GVK for kind '%s', please specify 'api_version' in params", kind)
}

// resolveGVRFromGVK 解析 GVR
func (e *K8sExecutor) resolveGVRFromGVK(gvk schema.GroupVersionKind) (schema.GroupVersionResource, bool, error) {
	if e.restMapper != nil {
		mapping, err := e.restMapper.RESTMapping(gvk.GroupKind(), gvk.Version)
		if err == nil {
			return mapping.Resource, mapping.Scope.Name() == meta.RESTScopeNameNamespace, nil
		}
	}

	// 回退：直接构建
	gvr := schema.GroupVersionResource{
		Group:    gvk.Group,
		Version:  gvk.Version,
		Resource: e.pluralizeKind(gvk.Kind),
	}
	isNamespaced := !e.isClusterScopedResource(gvk.Kind)
	return gvr, isNamespaced, nil
}

// getResourceFromDynamic 获取资源
func (e *K8sExecutor) getResourceFromDynamic(ctx context.Context, dr dynamic.ResourceInterface, name string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	result, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get resource: %w", err)
	}

	if shouldClearManagedFields(result.GetKind()) {
		clearManagedFields(result.Object)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully retrieved %s", name))
	} else {
		log.Printf("[K8s] [%s] Successfully retrieved %s", taskID, name)
	}

	// 格式化输出
	output := "json"
	if o, ok := params["output"].(string); ok {
		output = strings.ToLower(o)
	}

	if output == "yaml" {
		yamlData, err := sigsyaml.Marshal(result.Object)
		if err != nil {
			return "", fmt.Errorf("failed to marshal result to YAML: %w", err)
		}
		return string(yamlData), nil
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

func clearManagedFields(obj map[string]interface{}) {
	metadata, ok := obj["metadata"].(map[string]interface{})
	if !ok || metadata == nil {
		return
	}
	metadata["managedFields"] = []interface{}{}
}

func shouldClearManagedFields(kind string) bool {
	return strings.EqualFold(kind, "Pod") || strings.EqualFold(kind, "Node")
}

// getLogs 获取 Pod 日志
func (e *K8sExecutor) getLogs(ctx context.Context, command string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if e.clientset == nil {
		return "", common.NewError("kubernetes client not initialized")
	}

	// 解析 Pod 信息
	// command 格式: "Pod/pod-name" 或 "pod-name"
	podName := command
	if strings.Contains(command, "/") {
		parts := strings.SplitN(command, "/", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Pod") {
			podName = parts[1]
		}
	}

	if podName == "" {
		return "", common.NewError("pod name is required for logs operation (format: \"Pod/pod-name\" or \"pod-name\")")
	}

	// 获取命名空间
	namespace := e.namespace
	if ns, ok := params["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	// 获取容器名（多容器 Pod）
	container := ""
	if c, ok := params["container"].(string); ok {
		container = c
	}

	// 是否查看上一个容器的日志（容器重启后）
	previous := false
	if p, ok := params["previous"].(bool); ok {
		previous = p
	}

	// 获取日志行数，默认 10 行
	tailLines := int64(10)
	if tl, ok := params["tail_lines"].(int); ok && tl > 0 {
		tailLines = int64(tl)
	}
	if tl, ok := params["tail_lines"].(float64); ok && tl > 0 {
		tailLines = int64(tl)
	}

	msg := fmt.Sprintf("Getting logs for Pod %s/%s", namespace, podName)
	if container != "" {
		msg += fmt.Sprintf(" (container: %s)", container)
	}
	if previous {
		msg += " [previous container]"
	}
	msg += fmt.Sprintf(", tail %d lines", tailLines)

	if logCallback != nil {
		logCallback(taskID, "info", msg)
	} else {
		log.Printf("[K8s] [%s] %s", taskID, msg)
	}

	// 构建日志请求选项
	logOptions := &corev1.PodLogOptions{
		TailLines: &tailLines,
		Previous:  previous,
	}
	if container != "" {
		logOptions.Container = container
	}

	// 获取日志
	req := e.clientset.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
	podLogs, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get pod logs: %w", err)
	}
	defer podLogs.Close()

	// 读取日志内容
	logs, err := io.ReadAll(podLogs)
	if err != nil {
		return "", fmt.Errorf("failed to read pod logs: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully retrieved logs for Pod %s/%s", namespace, podName))
	} else {
		log.Printf("[K8s] [%s] Successfully retrieved logs for Pod %s/%s", taskID, namespace, podName)
	}

	return string(logs), nil
}

// createResource 创建资源
func (e *K8sExecutor) createResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Creating %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	} else {
		log.Printf("[K8s] [%s] Creating %s/%s in namespace %s", taskID, gvk.Kind, obj.GetName(), namespace)
	}

	result, err := dr.Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to create resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully created %s/%s", gvk.Kind, obj.GetName()))
	} else {
		log.Printf("[K8s] [%s] Successfully created %s/%s", taskID, gvk.Kind, obj.GetName())
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// updateResource 更新资源
func (e *K8sExecutor) updateResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Updating %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	} else {
		log.Printf("[K8s] [%s] Updating %s/%s in namespace %s", taskID, gvk.Kind, obj.GetName(), namespace)
	}

	// 获取现有资源以获取 resourceVersion
	existing, err := dr.Get(ctx, obj.GetName(), metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("resource not found: %w", err)
	}

	// 设置 resourceVersion
	obj.SetResourceVersion(existing.GetResourceVersion())

	var result *unstructured.Unstructured
	err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var err error
		result, err = dr.Update(ctx, obj, metav1.UpdateOptions{})
		return err
	})

	if err != nil {
		return "", fmt.Errorf("failed to update resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully updated %s/%s", gvk.Kind, obj.GetName()))
	} else {
		log.Printf("[K8s] [%s] Successfully updated %s/%s", taskID, gvk.Kind, obj.GetName())
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// deleteResource 删除资源
func (e *K8sExecutor) deleteResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Deleting %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	} else {
		log.Printf("[K8s] [%s] Deleting %s/%s in namespace %s", taskID, gvk.Kind, obj.GetName(), namespace)
	}

	err := dr.Delete(ctx, obj.GetName(), metav1.DeleteOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to delete resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully deleted %s/%s", gvk.Kind, obj.GetName()))
	} else {
		log.Printf("[K8s] [%s] Successfully deleted %s/%s", taskID, gvk.Kind, obj.GetName())
	}

	return fmt.Sprintf("Resource %s/%s deleted successfully", gvk.Kind, obj.GetName()), nil
}

// patchResource 补丁资源
func (e *K8sExecutor) patchResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Patching %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	} else {
		log.Printf("[K8s] [%s] Patching %s/%s in namespace %s", taskID, gvk.Kind, obj.GetName(), namespace)
	}

	// 获取 patch 类型，默认为 strategic-merge-patch
	patchType := types.StrategicMergePatchType
	if pt, ok := params["patch_type"].(string); ok && pt != "" {
		switch strings.ToLower(pt) {
		case "json":
			patchType = types.JSONPatchType
		case "merge":
			patchType = types.MergePatchType
		case "strategic":
			patchType = types.StrategicMergePatchType
		}
	}

	// 将对象转换为 JSON 作为 patch 数据
	patchData, err := json.Marshal(obj.Object)
	if err != nil {
		return "", fmt.Errorf("failed to marshal patch data: %w", err)
	}

	var result *unstructured.Unstructured
	err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var err error
		result, err = dr.Patch(ctx, obj.GetName(), patchType, patchData, metav1.PatchOptions{})
		return err
	})

	if err != nil {
		return "", fmt.Errorf("failed to patch resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully patched %s/%s", gvk.Kind, obj.GetName()))
	} else {
		log.Printf("[K8s] [%s] Successfully patched %s/%s", taskID, gvk.Kind, obj.GetName())
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// applyResource 应用资源（create 或 update）
func (e *K8sExecutor) applyResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Applying %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	} else {
		log.Printf("[K8s] [%s] Applying %s/%s in namespace %s", taskID, gvk.Kind, obj.GetName(), namespace)
	}

	var result *unstructured.Unstructured
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var err error
		// 尝试获取现有资源
		existing, err := dr.Get(ctx, obj.GetName(), metav1.GetOptions{})
		if err != nil {
			// 资源不存在，创建
			result, err = dr.Create(ctx, obj, metav1.CreateOptions{})
			if err != nil {
				return err
			}
			if logCallback != nil {
				logCallback(taskID, "info", fmt.Sprintf("Created %s/%s", gvk.Kind, obj.GetName()))
			} else {
				log.Printf("[K8s] [%s] Created %s/%s", taskID, gvk.Kind, obj.GetName())
			}
		} else {
			// 资源存在，更新
			obj.SetResourceVersion(existing.GetResourceVersion())
			result, err = dr.Update(ctx, obj, metav1.UpdateOptions{})
			if err != nil {
				return err
			}
			if logCallback != nil {
				logCallback(taskID, "info", fmt.Sprintf("Updated %s/%s", gvk.Kind, obj.GetName()))
			} else {
				log.Printf("[K8s] [%s] Updated %s/%s", taskID, gvk.Kind, obj.GetName())
			}
		}
		return nil
	})

	if err != nil {
		return "", fmt.Errorf("failed to apply resource: %w", err)
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// Cancel 取消执行
func (e *K8sExecutor) Cancel(taskID string) error {
	// K8s 执行通过 context 自动取消
	return nil
}

// pluralizeKind 将 Kind 转换为复数形式（用于构建 Resource 名称）
func (e *K8sExecutor) pluralizeKind(kind string) string {
	kindLower := strings.ToLower(kind)

	// Kubernetes 标准资源的准确映射
	resourceMap := map[string]string{
		// Core resources
		"pod":                   "pods",
		"service":               "services",
		"configmap":             "configmaps",
		"secret":                "secrets",
		"namespace":             "namespaces",
		"node":                  "nodes",
		"persistentvolume":      "persistentvolumes",
		"persistentvolumeclaim": "persistentvolumeclaims",
		"serviceaccount":        "serviceaccounts",
		"endpoints":             "endpoints",
		"endpoint":              "endpoints",

		// Apps resources
		"deployment":  "deployments",
		"replicaset":  "replicasets",
		"statefulset": "statefulsets",
		"daemonset":   "daemonsets",
		"job":         "jobs",
		"cronjob":     "cronjobs",

		// RBAC resources
		"role":               "roles",
		"rolebinding":        "rolebindings",
		"clusterrole":        "clusterroles",
		"clusterrolebinding": "clusterrolebindings",

		// Networking resources
		"ingress":       "ingresses",
		"networkpolicy": "networkpolicies",

		// Storage resources
		"storageclass": "storageclasses",

		// Custom resources (常见模式)
		"customresourcedefinition": "customresourcedefinitions",
		"crd":                      "customresourcedefinitions",
	}

	// 检查映射表
	if resource, ok := resourceMap[kindLower]; ok {
		return resource
	}

	// 如果没有找到，使用简单的复数化规则
	if strings.HasSuffix(kindLower, "y") {
		return strings.TrimSuffix(kindLower, "y") + "ies"
	}
	if strings.HasSuffix(kindLower, "s") || strings.HasSuffix(kindLower, "x") ||
		strings.HasSuffix(kindLower, "z") || strings.HasSuffix(kindLower, "ch") ||
		strings.HasSuffix(kindLower, "sh") {
		return kindLower + "es"
	}
	return kindLower + "s"
}

// isClusterScopedResource 判断是否是集群范围资源
func (e *K8sExecutor) isClusterScopedResource(kind string) bool {
	kindLower := strings.ToLower(kind)
	clusterScoped := map[string]bool{
		"namespace":                true,
		"node":                     true,
		"persistentvolume":         true,
		"clusterrole":              true,
		"clusterrolebinding":       true,
		"storageclass":             true,
		"customresourcedefinition": true,
	}
	return clusterScoped[kindLower]
}

// getResource removed (duplicate)

// describeResource 描述资源
func (e *K8sExecutor) describeResource(ctx context.Context, dr dynamic.ResourceInterface, name string, gvk schema.GroupVersionKind, namespace string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	// 1. 获取资源
	result, err := dr.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get resource: %w", err)
	}

	if shouldClearManagedFields(gvk.Kind) {
		clearManagedFields(result.Object)
	}

	// 2. 获取事件
	var events []corev1.Event
	if e.clientset != nil {
		// 使用 UID 查询事件更准确
		fieldSelector := fmt.Sprintf("involvedObject.uid=%s", result.GetUID())
		// 备用：如果 UID 查询不到，也可以尝试 name/kind，但 UID 是最准的
		eventList, err := e.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
			FieldSelector: fieldSelector,
		})
		if err == nil {
			events = eventList.Items
			sort.Slice(events, func(i, j int) bool {
				return events[i].LastTimestamp.Time.Before(events[j].LastTimestamp.Time)
			})
		} else {
			if logCallback != nil {
				logCallback(taskID, "warning", fmt.Sprintf("Failed to get events: %v", err))
			} else {
				log.Printf("[K8s] [%s] Failed to get events: %v", taskID, err)
			}
		}
	}

	// 3. 格式化输出
	output := "json"
	if o, ok := params["output"].(string); ok {
		output = strings.ToLower(o)
	}

	// 构造包含资源和事件的结构
	data := map[string]interface{}{
		"resource": result.Object,
		"events":   events,
	}

	if output == "yaml" {
		yamlData, err := sigsyaml.Marshal(data)
		if err != nil {
			return "", fmt.Errorf("failed to marshal result to YAML: %w", err)
		}
		return string(yamlData), nil
	}

	// Default to JSON
	resultJSON, _ := json.MarshalIndent(data, "", "  ")
	return string(resultJSON), nil
}

// getEvents 获取事件
func (e *K8sExecutor) getEvents(ctx context.Context, command string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if e.clientset == nil {
		return "", common.NewError("kubernetes client not initialized")
	}

	namespace := e.namespace
	if ns, ok := params["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	opts := metav1.ListOptions{}

	if fs, ok := params["field_selector"].(string); ok {
		opts.FieldSelector = fs
	}

	events, err := e.clientset.CoreV1().Events(namespace).List(ctx, opts)
	if err != nil {
		return "", err
	}

	sortBy := "lastTimestamp"
	if s, ok := params["sort_by"].(string); ok && s != "" {
		sortBy = s
	}

	if sortBy == "lastTimestamp" {
		sort.Slice(events.Items, func(i, j int) bool {
			return events.Items[i].LastTimestamp.Time.Before(events.Items[j].LastTimestamp.Time)
		})
	}

	if l, ok := params["limit"].(int); ok && l > 0 && l < len(events.Items) {
		events.Items = events.Items[:l]
	}
	if l, ok := params["limit"].(float64); ok && l > 0 && int(l) < len(events.Items) {
		events.Items = events.Items[:int(l)]
	}

	outputFormat := "json"
	if out, ok := params["output"].(string); ok && out != "" {
		outputFormat = strings.ToLower(out)
	}

	if outputFormat == "yaml" {
		y, err := sigsyaml.Marshal(events)
		if err != nil {
			return "", err
		}
		return string(y), nil
	}

	j, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		return "", err
	}
	return string(j), nil
}

// parseResourceAndName 解析资源和名称
func (e *K8sExecutor) parseResourceAndName(command string) (string, string, error) {
	command = strings.TrimSpace(command)
	if command == "" {
		return "", "", fmt.Errorf("command is required")
	}

	parts := strings.Fields(command)
	if len(parts) >= 2 {
		return parts[0], parts[1], nil
	}

	if strings.Contains(command, "/") {
		parts = strings.SplitN(command, "/", 2)
		return parts[0], parts[1], nil
	}

	return command, "", nil
}

// resolveGVRFromResourceName 解析 GVR
func (e *K8sExecutor) resolveGVRFromResourceName(resource string) (schema.GroupVersionResource, bool, error) {
	if e.clientset != nil {
		groups, err := e.clientset.Discovery().ServerPreferredResources()
		if err == nil {
			for _, group := range groups {
				for _, r := range group.APIResources {
					if strings.EqualFold(r.Name, resource) || strings.EqualFold(r.Kind, resource) || contains(r.ShortNames, resource) {
						gv, _ := schema.ParseGroupVersion(group.GroupVersion)
						return schema.GroupVersionResource{
							Group:    gv.Group,
							Version:  gv.Version,
							Resource: r.Name,
						}, r.Namespaced, nil
					}
				}
			}
		}
	}
	return schema.GroupVersionResource{}, false, fmt.Errorf("resource type %s not found", resource)
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if strings.EqualFold(a, e) {
			return true
		}
	}
	return false
}
