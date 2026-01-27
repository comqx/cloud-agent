---
name: cloud-agent-deploy
description: This skill should be used when modifying or troubleshooting deployment for Cloud Agent: Dockerfiles, docker-compose, Helm charts, TLS/WSS setup, and build pipeline.
---

### 目标
为 `cloud-agent` 的部署与构建改动提供可重复流程：保证本地可跑、镜像可构建、Compose/Helm 可部署且配置一致。

### 何时使用
- 修改 `Dockerfile.*`、`deployments/docker-compose.yml`、`deployments/helm/*`。
- 排查 Cloud/Agent/UI 容器启动、端口、证书（HTTPS/WSS）、挂载目录问题。
- 做多架构镜像构建/推送（`Makefile` 的 buildx 目标）。

### 工作流（按顺序执行）
- **明确目标部署方式**：Compose 还是 Helm；不要只修其中一种而导致另一种失效。
- **检查配置一致性**：
  - Cloud 端口/证书路径与环境变量保持一致；
  - UI 反代到 Cloud 的 URL 与协议保持一致。
- **校验挂载**：确保数据目录、证书目录在容器内路径与服务启动参数一致。
- **构建验证**：
  - Go 侧 `make build`；
  - UI `make cloud-ui`；
  - 镜像 `make docker-build-all` 或单独目标。
- **最小可用性验证**：
  - Cloud 健康检查/基本 API 可达；
  - Agent 可连上 `/ws` 并注册；
  - UI 能打开并拉到任务/Agent 列表。

### 关键文件
- `Makefile`（build / docker-build / buildx / push）
- `deployments/docker-compose.yml`
- `deployments/helm/*`
- `scripts/generate-cert.sh`（自签证书生成）

### 风险提示
- 不默认开放额外端口；需要新增端口时明确说明用途。
- TLS/WSS 行为变更必须可通过环境变量配置，并保持向后兼容。
