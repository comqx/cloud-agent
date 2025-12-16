package plugins

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
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

	// 构建 kubeconfig 路径
	kubeconfig := "~/.kube/config"
	if kubeconfigPath, ok := config["kubeconfig"].(string); ok {
		kubeconfig = kubeconfigPath
	}

	// 展开 ~ 路径
	if strings.HasPrefix(kubeconfig, "~") {
		home, _ := os.UserHomeDir()
		kubeconfig = strings.Replace(kubeconfig, "~", home, 1)
	}

	// 加载 kubeconfig
	var restConfig *rest.Config
	var err error

	// 优先使用 in-cluster 配置（如果在 Pod 中运行）
	restConfig, err = rest.InClusterConfig()
	if err != nil {
		// 如果不在集群内，使用 kubeconfig 文件
		if _, err := os.Stat(kubeconfig); err == nil {
			restConfig, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
			if err != nil {
				// 如果加载失败，返回一个空的执行器，会在首次使用时尝试重新加载
				return exec
			}
		} else {
			// kubeconfig 文件不存在，返回空的执行器
			return exec
		}
	}

	// 创建 clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err == nil {
		exec.clientset = clientset
	}

	// 创建 dynamic client
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err == nil {
		exec.dynamicClient = dynamicClient
	}

	// 创建 REST mapper（使用 discovery client 动态发现 API 资源）
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
	if err == nil {
		// 使用缓存的 discovery client 和 REST mapper
		cachedDiscovery := memory.NewMemCacheClient(discoveryClient)
		exec.restMapper = restmapper.NewDeferredDiscoveryRESTMapper(cachedDiscovery)
	} else {
		// 如果创建失败，使用空的 REST mapper（会在运行时尝试重新创建）
		exec.restMapper = meta.NewDefaultRESTMapper([]schema.GroupVersion{})
	}

	return exec
}

// Type 返回执行器类型
func (e *K8sExecutor) Type() common.TaskType {
	return common.TaskTypeK8s
}

// Execute 执行 K8s 操作
func (e *K8sExecutor) Execute(taskID string, command string, params map[string]interface{}, fileID string, logCallback LogCallback) (string, error) {
	if command == "" {
		return "", common.NewError("k8s YAML or JSON content is required")
	}

	// 获取操作类型，默认为 apply（create 或 update）
	operation := "apply"
	if op, ok := params["operation"].(string); ok && op != "" {
		operation = strings.ToLower(op)
	}

	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	// 判断是 YAML 还是 JSON 格式
	format := e.detectFormat(command)
	if format == "unknown" {
		return "", common.NewError("invalid format: must be YAML or JSON, and must contain apiVersion and kind fields")
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
	default:
		return "", fmt.Errorf("unsupported operation: %s (supported: create, update, delete, patch, apply)", operation)
	}
}

// createResource 创建资源
func (e *K8sExecutor) createResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Creating %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	}

	result, err := dr.Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to create resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully created %s/%s", gvk.Kind, obj.GetName()))
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// updateResource 更新资源
func (e *K8sExecutor) updateResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Updating %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
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
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// deleteResource 删除资源
func (e *K8sExecutor) deleteResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Deleting %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
	}

	err := dr.Delete(ctx, obj.GetName(), metav1.DeleteOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to delete resource: %w", err)
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Successfully deleted %s/%s", gvk.Kind, obj.GetName()))
	}

	return fmt.Sprintf("Resource %s/%s deleted successfully", gvk.Kind, obj.GetName()), nil
}

// patchResource 补丁资源
func (e *K8sExecutor) patchResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, params map[string]interface{}, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Patching %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
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
	}

	resultJSON, _ := json.MarshalIndent(result.Object, "", "  ")
	return string(resultJSON), nil
}

// applyResource 应用资源（create 或 update）
func (e *K8sExecutor) applyResource(ctx context.Context, dr dynamic.ResourceInterface, obj *unstructured.Unstructured, gvk schema.GroupVersionKind, namespace string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Applying %s/%s in namespace %s", gvk.Kind, obj.GetName(), namespace))
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

// isClusterScopedResource 判断资源是否是集群级别的（非命名空间资源）
func (e *K8sExecutor) isClusterScopedResource(kind string) bool {
	clusterScopedKinds := map[string]bool{
		"Namespace":                      true,
		"Node":                           true,
		"PersistentVolume":               true,
		"ClusterRole":                    true,
		"ClusterRoleBinding":             true,
		"StorageClass":                   true,
		"CustomResourceDefinition":       true,
		"APIService":                     true,
		"MutatingWebhookConfiguration":   true,
		"ValidatingWebhookConfiguration": true,
		"PriorityClass":                  true,
		"CSIDriver":                      true,
		"CSINode":                        true,
		"VolumeAttachment":               true,
	}
	return clusterScopedKinds[kind]
}
