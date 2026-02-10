# K8s 插件

K8s 插件用于在 Kubernetes 集群中执行资源操作，支持通过 YAML 或 JSON 格式管理 K8s 资源。

## 功能简介

- 支持 `create`、`update`、`delete`、`patch`、`apply`、`get`、`describe`、`events`、`logs` 多种操作类型
- 支持 YAML 和 JSON 两种资源定义格式
- 支持多资源文件（使用 `---` 分隔）
- 支持命名空间和集群级别资源
- 支持动态 REST Mapper 自动发现 API 资源
- 支持资源引用格式（`Kind/Name`）进行 `get`、`delete`、`describe` 操作

## Cloud API 调用说明

任务通过 Cloud API 下发，由 Agent 接收并执行。

- **接口地址**: `POST /api/v1/tasks`
- **Content-Type**: `application/json`

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `agent_id` | string | 是 | - | 目标 Agent ID |
| `type` | string | 是 | - | 任务类型，固定值为 `"k8s"` |
| `command` | string | 条件必填 | - | K8s 资源 YAML/JSON 内容，或资源引用（`Kind/Name`），或 Pod 名称（logs 操作）。`events` 操作时可为空 |
| `params` | object | 否 | `{}` | 扩展参数，见下方各操作的 Params 说明 |
| `file_id` | string | 否 | - | 关联的文件 ID（预留字段） |
| `sync` | bool | 否 | `false` | 是否同步等待结果。`true` 时接口会阻塞直到任务完成或超时 |
| `timeout` | int | 否 | `60` | 同步模式超时时间（秒），范围 1-300，超出范围会被修正 |

### Params 通用参数

以下参数适用于所有操作类型：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 否 | `"apply"` | 操作类型：`create`、`update`、`delete`、`patch`、`apply`、`get`、`describe`、`events`、`logs` |
| `namespace` | string | 否 | `"default"` | 目标命名空间。对集群级别资源（如 Namespace、Node）此参数会被忽略 |

### 操作类型说明

| 操作类型 | 说明 | `command` 格式 |
|----------|------|----------------|
| `create` | 创建资源，资源已存在时报错 | YAML/JSON 内容 |
| `update` | 更新资源，资源不存在时报错（自动处理 `resourceVersion`） | YAML/JSON 内容 |
| `delete` | 删除资源 | YAML/JSON 内容 或 `Kind/Name`（如 `Pod/my-pod`） |
| `patch` | 对资源进行补丁更新（支持冲突自动重试） | YAML/JSON 内容（只需包含要更新的字段） |
| `apply` | 声明式应用，资源存在则更新，不存在则创建 | YAML/JSON 内容 |
| `get` | 获取单个资源详情（支持 JSON/YAML 输出） | `Kind/Name`（如 `services/my-service`）或 YAML/JSON 内容 |
| `describe` | 获取资源详情及相关事件（通过 UID 关联） | `Kind/Name`（如 `deployment/nginx-deployment`） |
| `events` | 获取集群/命名空间事件 | 可为空字符串 `""` |
| `logs` | 获取 Pod 日志 | `Pod/pod-name` 或 `pod-name` |

---

### `create` / `update` / `apply` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | `"apply"` | `create`、`update` 或 `apply` |
| `namespace` | string | 否 | `"default"` | 目标命名空间。优先级：`params.namespace` > YAML 中的 `metadata.namespace` > `"default"` |

### `delete` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"delete"` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `api_version` | string | 否 | - | 当 `command` 使用 `Kind/Name` 格式且 Kind 不在内置映射表中时，需手动指定 API 版本（如 `"apps/v1"`） |

### `patch` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"patch"` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `patch_type` | string | 否 | `"strategic"` | Patch 类型：`json`（JSON Patch）、`merge`（Merge Patch）、`strategic`（Strategic Merge Patch） |

### `get` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"get"` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `output` | string | 否 | `"json"` | 输出格式：`json` 或 `yaml` |
| `api_version` | string | 否 | - | 当 Kind 不在内置映射表中时，需手动指定 API 版本 |

### `describe` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"describe"` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `output` | string | 否 | `"json"` | 输出格式：`json` 或 `yaml`。返回包含 `resource` 和 `events` 两个字段的结构 |
| `api_version` | string | 否 | - | 当 Kind 不在内置映射表中时，需手动指定 API 版本 |

### `events` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"events"` |
| `namespace` | string | 否 | `"default"` | 目标命名空间 |
| `field_selector` | string | 否 | - | 字段选择器，如 `"type=Warning"`、`"involvedObject.kind=Pod"` |
| `sort_by` | string | 否 | `"lastTimestamp"` | 排序字段，目前支持 `"lastTimestamp"` |
| `limit` | int | 否 | - | 返回数量限制（截取排序后的前 N 条） |
| `output` | string | 否 | `"json"` | 输出格式：`json` 或 `yaml` |

### `logs` 操作的 Params

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 固定 `"logs"` |
| `namespace` | string | 否 | `"default"` | Pod 所在命名空间 |
| `container` | string | 否 | - | 容器名称。多容器 Pod 时必须指定，否则 API 会报错 |
| `previous` | bool | 否 | `false` | 是否查看**上一个容器**的日志（容器重启后使用，适用于 CrashLoopBackOff 排查） |
| `tail_lines` | int | 否 | `10` | 返回最后 N 行日志 |

> **`command` 格式**：`"Pod/pod-name"` 或 `"pod-name"`（前缀 `Pod/` 可选，不区分大小写）

### 内置资源 Kind 映射表

以下 Kind 可直接在 `Kind/Name` 格式中使用，无需指定 `api_version`：

| Kind / 缩写 | apiVersion | 说明 |
|---|---|---|
| `Pod` / `po` | `v1` | Pod |
| `Service` / `svc` | `v1` | Service |
| `ConfigMap` / `cm` | `v1` | ConfigMap |
| `Secret` | `v1` | Secret |
| `Namespace` / `ns` | `v1` | Namespace（集群级别） |
| `Node` / `no` | `v1` | Node（集群级别） |
| `PersistentVolume` / `pv` | `v1` | PersistentVolume（集群级别） |
| `PersistentVolumeClaim` / `pvc` | `v1` | PersistentVolumeClaim |
| `ServiceAccount` / `sa` | `v1` | ServiceAccount |
| `Deployment` / `deploy` | `apps/v1` | Deployment |
| `StatefulSet` / `sts` | `apps/v1` | StatefulSet |
| `DaemonSet` / `ds` | `apps/v1` | DaemonSet |
| `ReplicaSet` / `rs` | `apps/v1` | ReplicaSet |
| `Job` | `batch/v1` | Job |
| `CronJob` / `cj` | `batch/v1` | CronJob |
| `Ingress` / `ing` | `networking.k8s.io/v1` | Ingress |

> 不在上表中的资源需通过 `params.api_version` 手动指定，否则会返回错误。

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
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 2：删除 Service（delete 操作 - YAML 格式）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Service\nmetadata:\n  name: my-service",
  "params": {
    "operation": "delete",
    "namespace": "production"
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 3：删除 Service（delete 操作 - 资源引用格式）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "Service/my-service",
  "params": {
    "operation": "delete",
    "namespace": "production"
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 4：使用 JSON 格式创建 ConfigMap

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "{\"apiVersion\": \"v1\", \"kind\": \"ConfigMap\", \"metadata\": {\"name\": \"app-config\"}, \"data\": {\"config.json\": \"{\\\"key\\\": \\\"value\\\"}\"}}",
  "params": {
    "operation": "apply",
    "namespace": "default"
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 5：多资源批量应用

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: test-ns\n---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: test-config\n  namespace: test-ns\ndata:\n  key: value",
  "params": {
    "operation": "apply"
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 6：Patch 更新 Deployment（Merge Patch）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "{\"spec\": {\"replicas\": 5}}",
  "params": {
    "operation": "patch",
    "namespace": "default",
    "patch_type": "merge"
  },
  "sync": true,
  "timeout": 60
}
```

### 示例 7：获取单个 Service 详情（JSON 输出）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "services/my-service",
  "params": {
    "operation": "get",
    "namespace": "default",
    "output": "json"
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 8：获取 Deployment 详情（YAML 输出）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "deployment/nginx-deployment",
  "params": {
    "operation": "get",
    "namespace": "default",
    "output": "yaml"
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 9：Describe Deployment（包含关联事件）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "deployment/nginx-deployment",
  "params": {
    "operation": "describe",
    "namespace": "default",
    "output": "json"
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 10：获取 Warning 级别的事件（按时间排序，限制 20 条）

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
    "limit": 20,
    "output": "json"
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 11：查看 Pod 当前容器日志（最后 10 行）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "Pod/nginx-pod-xxx",
  "params": {
    "operation": "logs",
    "namespace": "default"
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 12：查看 Pod 上一个容器的日志（容器重启后）

```json
{
  "agent_id": "agent-123",
  "type": "k8s",
  "command": "nginx-pod-xxx",
  "params": {
    "operation": "logs",
    "namespace": "production",
    "previous": true,
    "tail_lines": 100
  },
  "sync": true,
  "timeout": 30
}
```

### 示例 13：多容器 Pod 查看指定容器日志

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
  },
  "sync": true,
  "timeout": 30
}
```

## 返回结果

### 写操作（create/update/apply/patch）

执行成功后，`result` 字段返回操作后的资源对象 JSON：

```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "nginx-deployment",
    "namespace": "default",
    "uid": "xxx-xxx-xxx",
    "resourceVersion": "12345"
  },
  "spec": {
    "replicas": 3
  }
}
```

### delete 操作

返回纯文本：

```text
Resource Deployment/nginx-deployment deleted successfully
```

### get 操作

返回资源对象 JSON 或 YAML（根据 `output` 参数）。Pod 和 Node 类型会自动清理 `metadata.managedFields` 字段以减少输出噪音。

### describe 操作

返回包含资源和事件的结构：

```json
{
  "resource": {
    "apiVersion": "apps/v1",
    "kind": "Deployment",
    "metadata": { "..." : "..." },
    "spec": { "..." : "..." },
    "status": { "..." : "..." }
  },
  "events": [
    {
      "type": "Normal",
      "reason": "ScalingReplicaSet",
      "message": "Scaled up replica set nginx-deployment-xxx to 3",
      "lastTimestamp": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### events 操作

返回 Kubernetes EventList 对象 JSON 或 YAML。

### logs 操作

返回纯文本日志内容。

### 多资源操作

多个 YAML 用 `---` 分隔时，每个资源的结果以 `\n\n` 连接返回。如果某个资源处理失败，会返回已成功的结果和错误信息。

## 注意事项

1. **连接方式**：
   - 使用 ServiceAccount Token 认证（默认从 `/tmp/.cloud-agent/sa/token` 和 `/tmp/.cloud-agent/sa/ca.crt` 读取）
   - API Server 地址优先从插件配置 `api_server` 获取，其次从 kubelet 配置 `/etc/kubernetes/kubelet.conf` 提取
   - 可通过插件配置自定义 `token_file`、`ca_file`、`kubelet_config` 路径
2. **权限要求**：Agent 运行时需要具有操作目标资源的 RBAC 权限
3. **命名空间优先级**：`params.namespace` > YAML 中的 `metadata.namespace` > 插件默认值 > `"default"`
4. **集群级别资源**：对于 Namespace、Node、PersistentVolume、ClusterRole、ClusterRoleBinding、StorageClass、CRD 等集群级别资源，命名空间参数会被忽略
5. **Patch 操作**：`command` 只需包含要更新的字段，不需要完整资源定义。支持冲突自动重试
6. **超时控制**：Agent 内部执行超时为 30 分钟。同步模式下 API 超时范围为 1-300 秒
7. **Logs 操作**：
   - 使用 `previous: true` 查看容器重启前的日志（适用于 CrashLoopBackOff 排查）
   - 如果容器未重启过，使用 `previous: true` 会报错 `previous terminated container not found`
   - 多容器 Pod 必须通过 `container` 参数指定容器名
   - 默认只返回最后 10 行日志，可通过 `tail_lines` 调整
8. **managedFields 清理**：`get` 和 `describe` 操作查询 Pod 和 Node 时，会自动清理 `metadata.managedFields` 以减少输出噪音
