# Helm 插件使用指南

## 概述

Helm 插件使用 Helm Go SDK 提供 Helm Chart 的部署和管理功能，支持从仓库或上传的文件安装 Chart，以及 Release 的升级、删除和查询操作。

## 任务类型

`helm`

## 功能特性

- ✅ 从 Helm 仓库安装 Chart
- ✅ 上传 Chart 文件安装
- ✅ 自定义 Values 文件
- ✅ Release 升级和回滚
- ✅ Release 列表查询
- ✅ 获取 Release Values
- ✅ 删除 Release
- ✅ 仓库管理（添加/更新）

## 参数说明

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `command` | string | 条件 | Release 名称（list 操作不需要） |
| `params` | object | 是 | 操作参数 |

### params 对象结构

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `operation` | string | 是 | 操作类型：install/upgrade/list/delete/get-values |
| `namespace` | string | 否 | 命名空间，默认 default |
| `chart_file_id` | string | 条件 | Chart 文件 ID（上传的 .tgz） |
| `values_file_id` | string | 否 | Values 文件 ID（.yaml） |
| `repository` | object | 条件 | Helm 仓库配置 |
| `chart` | string | 条件 | Chart 名称（repo-name/chart-name） |
| `version` | string | 否 | Chart 版本 |
| `values` | object | 否 | 内联 Values 覆盖 |
| `flags` | object | 否 | Helm 操作标志 |

详细参数说明请参考：[Helm插件使用指南](../6-Helm插件使用指南.md)

## 使用示例

### 示例 1: 从仓库安装

**任务参数：**
```json
{
  "type": "helm",
  "command": "my-nginx",
  "params": {
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
}
```

### 示例 2: 上传 Chart 文件安装

**步骤：**
1. 上传 Chart 文件（.tgz 格式）
2. （可选）上传自定义 Values 文件
3. 创建任务：

```json
{
  "type": "helm",
  "command": "my-app",
  "params": {
    "operation": "install",
    "namespace": "production",
    "flags": {
      "create_namespace": true,
      "wait": true,
      "timeout": "10m"
    }
  }
}
```

### 示例 3: 升级 Release

**任务参数：**
```json
{
  "type": "helm",
  "command": "my-nginx",
  "params": {
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
      "wait": true
    }
  }
}
```

### 示例 4: 列出 Releases

**任务参数：**
```json
{
  "type": "helm",
  "params": {
    "operation": "list",
    "namespace": "default"
  }
}
```

### 示例 5: 获取 Values

**任务参数：**
```json
{
  "type": "helm",
  "command": "my-nginx",
  "params": {
    "operation": "get-values",
    "namespace": "default"
  }
}
```

### 示例 6: 删除 Release

**任务参数：**
```json
{
  "type": "helm",
  "command": "my-nginx",
  "params": {
    "operation": "delete",
    "namespace": "default"
  }
}
```

## RBAC 权限配置

Helm 操作需要适当的 Kubernetes 权限：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tiangong-agent-helm
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "pods", "persistentvolumeclaims"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["create", "get", "list"]
```

## 常见问题

### 1. 权限不足

**解决方案：**
- 配置适当的 RBAC 权限
- 参考文档中的权限配置示例

### 2. Chart 下载失败

**解决方案：**
- 检查仓库 URL 是否正确
- 确认网络连接
- 验证仓库认证信息

### 3. Release 已存在

**解决方案：**
- 使用 `upgrade` 操作替代 `install`
- 或先删除现有 Release

## 最佳实践

1. **使用命名空间隔离**
2. **启用 Wait 标志**
3. **明确指定版本**
4. **先执行 Dry Run**
5. **定期备份 Values**

详细的最佳实践请参考：[Helm插件使用指南](../6-Helm插件使用指南.md)

## 相关文档

- [Helm 插件使用指南](../6-Helm插件使用指南.md)
- [Helm 官方文档](https://helm.sh/docs/)
- [开发指南](../5-开发指南.md)
