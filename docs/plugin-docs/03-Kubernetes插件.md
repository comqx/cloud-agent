# Kubernetes 插件使用指南

## 概述

Kubernetes 插件使用 `client-go` SDK 直接操作 Kubernetes 集群，支持资源的创建、更新、删除、查询等操作。支持 YAML 和 JSON 格式的资源定义。

## 任务类型

`k8s`

## 功能特性

- ✅ 支持所有 Kubernetes 资源类型
- ✅ YAML/JSON 格式资源定义
- ✅ 多资源批量操作（使用 `---` 分隔）
- ✅ In-cluster 配置自动识别
- ✅ 支持 create、update、delete、patch、apply 操作
- ✅ 实时日志输出

## 参数说明

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 是 | YAML 或 JSON 格式的资源定义 |
| `params` | object | 否 | 操作参数 |

### params 对象结构

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `operation` | string | apply | 操作类型：create/update/delete/patch/apply |
| `namespace` | string | default | 目标命名空间 |
| `patch_type` | string | strategic | Patch 类型：strategic/merge/json |

## 配置示例

### agent-plugins.yaml

```yaml
plugins:
  - type: k8s
    enabled: true
    config:
      kubeconfig: ~/.kube/config  # 可选，Pod 中自动使用 in-cluster 配置
      namespace: default
```

## 使用示例

### 示例 1: 创建 Deployment

**任务参数：**
```json
{
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  namespace: default\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.21\n        ports:\n        - containerPort: 80",
  "params": {
    "operation": "apply",
    "namespace": "default"
  }
}
```

### 示例 2: 创建 Service

**任务参数：**
```json
{
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Service\nmetadata:\n  name: nginx-service\nspec:\n  selector:\n    app: nginx\n  ports:\n  - protocol: TCP\n    port: 80\n    targetPort: 80\n  type: ClusterIP",
  "params": {
    "operation": "create",
    "namespace": "default"
  }
}
```

### 示例 3: 批量创建资源

**任务参数：**
```json
{
  "type": "k8s",
  "command": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: app-config\ndata:\n  app.conf: |\n    server {\n      listen 80;\n    }\n---\napiVersion: v1\nkind: Secret\nmetadata:\n  name: app-secret\ntype: Opaque\nstringData:\n  password: secret123\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: myapp\n  template:\n    metadata:\n      labels:\n        app: myapp\n    spec:\n      containers:\n      - name: app\n        image: myapp:latest\n        envFrom:\n        - configMapRef:\n            name: app-config\n        - secretRef:\n            name: app-secret",
  "params": {
    "operation": "apply",
    "namespace": "production"
  }
}
```

### 示例 4: 使用 JSON 格式

**任务参数：**
```json
{
  "type": "k8s",
  "command": "{\"apiVersion\":\"v1\",\"kind\":\"Pod\",\"metadata\":{\"name\":\"test-pod\",\"namespace\":\"default\"},\"spec\":{\"containers\":[{\"name\":\"nginx\",\"image\":\"nginx:1.21\"}]}}",
  "params": {
    "operation": "create",
    "namespace": "default"
  }
}
```

### 示例 5: 删除资源

**任务参数：**
```json
{
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\n  namespace: default",
  "params": {
    "operation": "delete",
    "namespace": "default"
  }
}
```

### 示例 6: Patch 更新

**任务参数：**
```json
{
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\nspec:\n  replicas: 5",
  "params": {
    "operation": "patch",
    "namespace": "default",
    "patch_type": "strategic"
  }
}
```

## 操作类型说明

### create
- 创建新资源
- 如果资源已存在会报错

### update
- 更新现有资源
- 如果资源不存在会报错

### apply
- 创建或更新资源（推荐）
- 资源不存在则创建，存在则更新

### delete
- 删除资源
- 如果资源不存在不会报错

### patch
- 部分更新资源
- 支持三种 patch 类型：
  - `strategic`: 策略合并（默认）
  - `merge`: JSON 合并
  - `json`: JSON Patch

## 支持的资源类型

- **工作负载**：Pod、Deployment、StatefulSet、DaemonSet、Job、CronJob
- **服务**：Service、Ingress、EndpointSlice
- **配置**：ConfigMap、Secret
- **存储**：PersistentVolume、PersistentVolumeClaim、StorageClass
- **权限**：ServiceAccount、Role、RoleBinding、ClusterRole、ClusterRoleBinding
- **网络**：NetworkPolicy
- **自定义资源**：CRD 及其实例

## 常见问题

### 1. 权限不足

**错误信息：**
```
Error: create: failed to create: deployments.apps is forbidden: User "system:serviceaccount:default:tiangong-agent" cannot create resource "deployments" in API group "apps" in the namespace "default"
```

**解决方案：**
- 为 Agent 的 ServiceAccount 配置适当的 RBAC 权限
- 参考文档中的 RBAC 配置示例

### 2. 资源已存在

**错误信息：**
```
Error: create: failed to create: deployments.apps "nginx-deployment" already exists
```

**解决方案：**
- 使用 `apply` 操作替代 `create`
- 或者先删除现有资源再创建

### 3. YAML 格式错误

**错误信息：**
```
Error: failed to parse YAML: yaml: line 5: could not find expected ':'
```

**解决方案：**
- 检查 YAML 格式是否正确
- 确保缩进使用空格而不是制表符
- 使用 YAML 验证工具检查语法

## 最佳实践

### 1. 使用 apply 操作

```json
{
  "params": {
    "operation": "apply"
  }
}
```

### 2. 明确指定命名空间

```yaml
metadata:
  name: my-app
  namespace: production
```

### 3. 添加标签和注解

```yaml
metadata:
  name: my-app
  labels:
    app: my-app
    version: v1.0.0
    env: production
  annotations:
    description: "My application"
    managed-by: "tiangong-deploy"
```

### 4. 使用资源限制

```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
```

### 5. 配置健康检查

```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

## 相关文档

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [client-go 文档](https://github.com/kubernetes/client-go)
- [开发指南](../5-开发指南.md)
