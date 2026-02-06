# K8s 插件

K8s 插件用于在 Kubernetes 集群中执行资源操作，支持通过 YAML 或 JSON 格式管理 K8s 资源。

## 功能简介

- 支持 `create`、`update`、`delete`、`patch`、`apply`、`get`、`describe`、`events`、`logs` 多种操作类型
- 支持 YAML 和 JSON 两种资源定义格式
- 支持多资源文件（使用 `---` 分隔）
- 支持命名空间和集群级别资源
- 支持动态 REST Mapper 自动发现 API 资源

## Cloud API 调用说明

任务通过 Cloud API 下发，由 Agent 接收并执行。

- **接口地址**: `POST /api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent_id` | string | 是 | 目标 Agent ID |
| `type` | string | 是 | 任务类型，固定值为 `"k8s"` |
| `command` | string | 是 | K8s 资源 YAML/JSON 内容 |
| `params` | object | 否 | 扩展参数，见下表 |
| `sync` | bool | 否 | 是否同步等待结果，默认 `false` |
| `timeout` | int | 否 | 超时时间（秒），默认 1800（30分钟） |

### Params 参数说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 否 | `"apply"` | 操作类型：`create`、`update`、`delete`、`patch`、`apply` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `patch_type` | string | 否 | `"strategic"` | Patch 类型（`patch` 操作时有效）：`json`、`merge`、`strategic` |
| `kubeconfig` | string | 否 | `"~/.kube/config"` | kubeconfig 文件路径 |
| `output` | string | 否 | `"json"` | 输出格式：`json`、`yaml`（`get`/`events` 有效） |
| `field_selector` | string | 否 | - | 字段选择器（`events` 有效） |
| `sort_by` | string | 否 | `"lastTimestamp"` | 排序字段（`events` 有效） |
| `limit` | int | 否 | - | 返回数量限制（`events` 有效） |

### 操作类型说明

| 操作类型 | 说明 |
|----------|------|
| `create` | 创建资源，资源已存在时报错 |
| `update` | 更新资源，资源不存在时报错 |
| `delete` | 删除资源 |
| `patch` | 对资源进行补丁更新 |
| `apply` | 声明式应用，资源存在则更新，不存在则创建 |
| `get` | 获取资源（支持 JSON/YAML 输出） |
| `describe` | 获取资源详情及相关事件 |
| `events` | 获取集群事件 |
| `logs` | 获取 Pod 日志（容器重启后可查看上一个容器日志） |

### Logs 操作参数（`operation=logs` 时）

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `command` | string | 是 | - | Pod 名称，格式：`"Pod/pod-name"` 或 `"pod-name"` |
| `namespace` | string | 否 | `"default"` | Pod 所在命名空间 |
| `container` | string | 否 | - | 容器名称（多容器 Pod 时必填） |
| `previous` | bool | 否 | `false` | 是否查看**上一个容器**的日志（容器重启后使用） |
| `tail_lines` | int | 否 | `10` | 显示最后 N 行日志 |

## 使用示例

### 示例 1：创建 Deployment（apply 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    metadata:\n      labels:\n        app: nginx\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.25\n        ports:\n        - containerPort: 80",
  "params": {
    "operation": "apply",
    "namespace": "default"
  }
}
```

### 示例 2：删除 Service（delete 操作）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Service\nmetadata:\n  name: my-service",
  "params": {
    "operation": "delete",
    "namespace": "production"
  }
}
```

### 示例 3：使用 JSON 格式创建 ConfigMap

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "{\"apiVersion\": \"v1\", \"kind\": \"ConfigMap\", \"metadata\": {\"name\": \"app-config\"}, \"data\": {\"config.json\": \"{\\\"key\\\": \\\"value\\\"}\"}}",
  "params": {
    "operation": "apply",
    "namespace": "default"
  }
}
```

### 示例 4：多资源批量应用

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: test-ns\n---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test-config\n  namespace: test-ns\ndata:\n  key: value",
  "params": {
    "operation": "apply"
  }
}
```

### 示例 5：Patch 更新 Deployment

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "{\"spec\": {\"replicas\": 5}}",
  "params": {
    "operation": "patch",
    "namespace": "default",
    "patch_type": "merge"
  }
}
```

### 示例 6：查看 Pod 当前容器日志（最后 10 行）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "Pod/nginx-pod-xxx",
  "params": {
    "operation": "logs",
    "namespace": "default"
  }
}
```

### 示例 7：查看 Pod **上一个容器**的日志（容器重启后）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "nginx-pod-xxx",
  "params": {
    "operation": "logs",
    "namespace": "production",
    "previous": true,
    "tail_lines": 10
  }
}
```

### 示例 8：多容器 Pod 查看指定容器日志

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "Pod/my-app-pod",
  "params": {
    "operation": "logs",
    "namespace": "default",
    "container": "sidecar",
    "previous": true,
    "tail_lines": 50
  }
}
```

### 示例 9：获取 Pod 列表（YAML 格式）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "pods",
  "params": {
    "operation": "get",
    "namespace": "default",
    "output": "yaml"
  }
}
```

### 示例 10：获取特定 Service 详情

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "services/my-service",
  "params": {
    "operation": "get",
    "namespace": "default"
  }
}
```

### 示例 11：Describe Deployment

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "deployment/nginx-deployment",
  "params": {
    "operation": "describe",
    "namespace": "default"
  }
}
```

### 示例 12：获取 Warning 级别的事件（按时间排序，限制 20 条）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "",
  "params": {
    "operation": "events",
    "namespace": "default",
    "field_selector": "type=Warning",
    "sort_by": "lastTimestamp",
    "limit": 20
  }
}
```

## 返回结果

执行成功后，`result` 字段将包含 JSON 格式的资源对象（或对象数组，多资源时）。

响应示例（`result` 字段内容）：

```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "nginx-deployment",
    "namespace": "default",
    "uid": "xxx-xxx-xxx"
  },
  "spec": {
    "replicas": 3
  }
}
```

## 注意事项

1. **权限要求**：Agent 运行时需要具有操作目标资源的 RBAC 权限
2. **连接方式**：
   - 优先使用 in-cluster 配置（如果在 Pod 中运行）
   - 其次使用 `params.kubeconfig` 指定的 kubeconfig 文件
   - 默认使用 `~/.kube/config`
3. **命名空间优先级**：`params.namespace` > YAML 中的 `metadata.namespace` > `"default"`
4. **集群级别资源**：对于 Namespace、Node、ClusterRole 等集群级别资源，命名空间参数会被忽略
5. **Patch 操作**：使用 `patch` 操作时，`command` 只需包含要更新的字段，不需要完整资源定义
6. **超时控制**：复杂操作（如 Deployment 滚动更新）建议适当增大 `timeout` 参数
7. **Logs 操作**：
   - 使用 `previous: true` 查看容器重启前的日志（适用于 CrashLoopBackOff 排查）
   - 如果容器未重启过，使用 `previous: true` 会报错 `previous terminated container not found`
   - 多容器 Pod 必须通过 `container` 参数指定容器名
   - 默认只返回最后 10 行日志，可通过 `tail_lines` 调整（最大受 kubelet 配置限制）
