# Helm 插件使用指南

## 概述

Helm 插件允许通过 Tiangong-Deploy Agent 在 Kubernetes 集群中部署和管理 Helm 应用。该插件使用 Helm Go SDK (helm.sh/helm/v3) 通过 API 方式执行 Helm 操作，而不是使用命令行工具。

## 支持的操作

- **install**: 安装 Helm Chart
- **upgrade**: 升级已有的 Helm Release
- **list**: 列出指定命名空间中的所有 Release
- **delete**: 删除 Helm Release
- **get-values**: 获取 Release 的 Values 配置

## 前置条件

### 1. RBAC 权限配置

Agent 需要有足够的权限来执行 Helm 操作。推荐的 RBAC 配置：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tiangong-agent
  namespace: tiangong-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tiangong-agent-helm
rules:
  # Helm 需要的基本权限
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "pods", "persistentvolumeclaims"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["*"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["*"]
  # 如果需要创建命名空间
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tiangong-agent-helm
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tiangong-agent-helm
subjects:
  - kind: ServiceAccount
    name: tiangong-agent
    namespace: tiangong-system
```

### 2. Agent 部署

Agent 通过 DaemonSet 部署到 Kubernetes 集群中，会自动使用 in-cluster 配置连接到 Kubernetes API。

## 使用方法

### 通过 UI 创建 Helm 任务

1. 登录 Tiangong-Deploy UI
2. 进入"任务"页面
3. 选择任务类型为 "Helm 部署"
4. 选择 Helm 操作类型
5. 填写相应参数
6. 执行任务

### 参数说明

#### 通用参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `operation` | string | 是 | 操作类型：install/upgrade/list/delete/get-values |
| `release_name` | string | 条件 | Release 名称（list 操作不需要） |
| `namespace` | string | 否 | 命名空间，默认为 default |

#### Install/Upgrade 特有参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `chart_file_id` | string | 条件 | 上传的 Chart 文件 ID（.tgz 格式） |
| `values_file_id` | string | 否 | 自定义 Values 文件 ID（.yaml 格式） |
| `repository` | object | 条件 | Helm 仓库配置（从仓库安装时使用） |
| `repository.url` | string | 是 | 仓库 URL |
| `repository.name` | string | 是 | 仓库名称 |
| `repository.username` | string | 否 | 用户名（私有仓库） |
| `repository.password` | string | 否 | 密码（私有仓库） |
| `chart` | string | 条件 | Chart 名称（格式：repo-name/chart-name） |
| `version` | string | 否 | Chart 版本 |
| `values` | object | 否 | 内联 Values 覆盖 |
| `flags` | object | 否 | Helm 操作标志 |

#### Flags 参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `create_namespace` | boolean | false | 如果命名空间不存在则创建 |
| `wait` | boolean | false | 等待所有资源就绪 |
| `timeout` | string | - | 超时时间（例如："5m", "10m"） |
| `force` | boolean | false | 强制操作（仅 upgrade） |
| `dry_run` | boolean | false | 模拟运行 |

## 使用示例

### 1. 从 Helm 仓库安装

**任务参数：**

```json
{
  "operation": "install",
  "namespace": "default",
  "repository": {
    "url": "https://charts.bitnami.com/bitnami",
    "name": "bitnami"
  },
  "chart": "bitnami/nginx",
  "version": "15.0.0",
  "flags": {
    "create_namespace": true,
    "wait": true,
    "timeout": "5m"
  }
}
```

**Release 名称：** `my-nginx`

### 2. 上传 Chart 文件安装

**步骤：**
1. 选择操作类型：Install
2. 输入 Release 名称：`my-app`
3. 上传 Chart 文件（.tgz 格式）
4. （可选）上传自定义 Values 文件
5. 填写参数：

```json
{
  "operation": "install",
  "namespace": "production",
  "flags": {
    "create_namespace": true,
    "wait": true,
    "timeout": "10m"
  }
}
```

### 3. 升级 Release

**任务参数：**

```json
{
  "operation": "upgrade",
  "namespace": "default",
  "repository": {
    "url": "https://charts.bitnami.com/bitnami",
    "name": "bitnami"
  },
  "chart": "bitnami/nginx",
  "version": "15.1.0",
  "values": {
    "replicaCount": 3,
    "image": {
      "tag": "1.21.6"
    }
  },
  "flags": {
    "wait": true,
    "timeout": "5m"
  }
}
```

**Release 名称：** `my-nginx`

### 4. 列出所有 Release

**任务参数：**

```json
{
  "operation": "list",
  "namespace": "default"
}
```

**输出示例：**
```
Found 2 releases in namespace default:
- my-nginx (version: 1, status: deployed, chart: nginx, updated: 2025-12-02T15:30:00Z)
- my-app (version: 2, status: deployed, chart: myapp, updated: 2025-12-02T14:20:00Z)
```

### 5. 获取 Release Values

**任务参数：**

```json
{
  "operation": "get-values",
  "namespace": "default"
}
```

**Release 名称：** `my-nginx`

**输出示例：**
```json
{
  "replicaCount": 3,
  "image": {
    "repository": "nginx",
    "tag": "1.21.6"
  },
  "service": {
    "type": "ClusterIP",
    "port": 80
  }
}
```

### 6. 删除 Release

**任务参数：**

```json
{
  "operation": "delete",
  "namespace": "default"
}
```

**Release 名称：** `my-nginx`

## 高级用法

### 使用自定义 Values 文件

1. 准备 values.yaml 文件：

```yaml
replicaCount: 3

image:
  repository: nginx
  tag: "1.21.6"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
```

2. 在 UI 中上传该文件
3. 创建 install 或 upgrade 任务时会自动使用该 values 文件

### 覆盖特定 Values

可以通过 `values` 参数覆盖特定的配置项，而不需要上传完整的 values 文件：

```json
{
  "operation": "upgrade",
  "namespace": "default",
  "chart_file_id": "file-abc123",
  "values": {
    "replicaCount": 5,
    "resources": {
      "limits": {
        "cpu": "500m",
        "memory": "512Mi"
      }
    }
  }
}
```

### 私有 Helm 仓库

对于需要认证的私有仓库：

```json
{
  "operation": "install",
  "namespace": "default",
  "repository": {
    "url": "https://charts.mycompany.com",
    "name": "mycompany",
    "username": "admin",
    "password": "secret-password"
  },
  "chart": "mycompany/private-app",
  "version": "1.0.0"
}
```

> **安全提示**: 建议使用密钥管理系统存储仓库凭证，而不是直接在参数中明文传递。

## 故障排查

### 常见问题

#### 1. 权限不足错误

**错误信息：**
```
Error: create: failed to create: secrets is forbidden: User "system:serviceaccount:tiangong-system:tiangong-agent" cannot create resource "secrets" in API group "" in the namespace "default"
```

**解决方案：**
检查并更新 Agent 的 RBAC 权限配置，确保有足够的权限操作目标命名空间中的资源。

#### 2. Chart 下载失败

**错误信息：**
```
Error: failed to download repository index: Get "https://charts.example.com/index.yaml": dial tcp: lookup charts.example.com: no such host
```

**解决方案：**
- 检查仓库 URL 是否正确
- 确认 Agent Pod 可以访问外部网络
- 检查 DNS 配置

#### 3. 超时错误

**错误信息：**
```
Error: timed out waiting for the condition
```

**解决方案：**
- 增加 timeout 参数值（例如从 "5m" 增加到 "10m"）
- 检查 Pod 是否能正常启动
- 查看 Pod 日志排查应用启动问题

#### 4. Release 已存在

**错误信息：**
```
Error: cannot re-use a name that is still in use
```

**解决方案：**
- 使用 `upgrade` 操作而不是 `install`
- 或者先删除已有的 Release，再重新安装

### 查看详细日志

在任务列表中点击"日志"按钮可以查看 Helm 操作的详细日志，包括：
- Helm 操作的每个步骤
- 资源创建/更新的详细信息
- 错误堆栈信息

## 最佳实践

### 1. 使用命名空间隔离

为不同环境（开发、测试、生产）使用不同的命名空间：

```json
{
  "operation": "install",
  "namespace": "production",
  "flags": {
    "create_namespace": true
  }
}
```

### 2. 启用 Wait 标志

对于生产环境部署，建议启用 `wait` 标志确保所有资源就绪：

```json
{
  "flags": {
    "wait": true,
    "timeout": "10m"
  }
}
```

### 3. 使用版本控制

明确指定 Chart 版本，避免意外升级：

```json
{
  "chart": "bitnami/nginx",
  "version": "15.0.0"
}
```

### 4. 先执行 Dry Run

对于重要的变更，先执行 dry run 验证：

```json
{
  "operation": "upgrade",
  "flags": {
    "dry_run": true
  }
}
```

### 5. 定期备份 Values

使用 `get-values` 操作定期备份 Release 的配置：

```bash
# 通过任务执行 get-values 操作
# 将输出保存到文件系统或配置管理系统
```

## 限制和注意事项

1. **文件大小限制**: 上传的 Chart 文件大小受文件上传 API 限制
2. **并发限制**: Agent 可能有并发任务数量限制
3. **网络访问**: Agent 需要能够访问 Helm 仓库和容器镜像仓库
4. **存储空间**: Chart 文件会临时存储在 Agent 节点上

## 相关文档

- [Helm 官方文档](https://helm.sh/docs/)
- [Kubernetes RBAC 文档](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Tiangong-Deploy 开发指南](./5-开发指南.md)
