# GitHub Actions 工作流说明

## Docker 镜像自动构建

这个工作流会在以下情况自动触发：

1. **推送到主分支** (`main` 或 `master`)
2. **创建标签** (格式: `v*.*.*`, 如 `v1.0.0`)
3. **Pull Request** (仅构建，不推送)
4. **手动触发** (在 GitHub Actions 页面手动运行)

## 配置步骤

### 1. 添加 Docker Hub 凭证

在 GitHub 仓库设置中添加 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下两个 Secret：
   - **Name**: `DOCKER_USERNAME`
     **Value**: 你的 Docker Hub 用户名 (例如: `comqx`)
   
   - **Name**: `DOCKER_PASSWORD`
     **Value**: 你的 Docker Hub 密码或 Access Token

> **注意**: 推荐使用 Docker Hub Access Token 而不是密码，更安全。
> 获取 Token: Docker Hub → Account Settings → Security → New Access Token

### 2. 推送代码触发构建

```bash
# 推送到主分支会自动构建并推送 latest 标签
git push origin main

# 创建版本标签会自动构建并推送版本标签
git tag v1.0.0
git push origin v1.0.0
```

### 3. 镜像标签规则

- **主分支推送**: `comqx/cloud-agent-*:latest` 和 `comqx/cloud-agent-*:main-<sha>`
- **版本标签**: `comqx/cloud-agent-*:v1.0.0`, `comqx/cloud-agent-*:1.0.0`, `comqx/cloud-agent-*:1.0`, `comqx/cloud-agent-*:1`
- **PR**: 仅构建，不推送

## 支持的架构

- `linux/amd64`
- `linux/arm64`

## 查看构建状态

在 GitHub 仓库的 "Actions" 标签页可以查看构建历史和状态。

