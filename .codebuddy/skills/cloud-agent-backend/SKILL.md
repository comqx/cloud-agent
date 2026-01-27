---
name: cloud-agent-backend
description: This skill should be used when implementing or modifying Cloud Agent backend (Go) features: Cloud/Agent/CLI, WebSocket protocol, task pipeline, plugins, and security.
---

### 目标
为 `cloud-agent` 仓库的 Go 后端改动提供稳定的工作流：快速定位入口、识别协议/配置影响面、实现改动并保证可回归。

### 何时使用
- 实现/修改 Cloud API（Gin handlers）、任务管理、存储层、WebSocket 消息协议。
- 实现/修改 Agent 端连接、心跳、重连、执行器管理与插件。
- 新增任务类型（`common.TaskType`）或新增插件。

### 工作流（按顺序执行）
- **定位入口与调用链**：从 `cmd/cloud` / `cmd/agent` / `cmd/cli` 切入，沿 `internal/*` 找到关键 manager/handler。
- **识别协议与兼容性**：确认 `internal/common` 中的消息类型/结构是否需要变更；如变更，保证向后兼容或提供迁移策略。
- **识别配置面**：检查 `configs/*.yaml`、环境变量读取点、`deployments/*` 是否需要同步更新。
- **实现改动**：
  - 保持分层：共享协议进 `internal/common`，执行细节进 `internal/agent/plugins`。
  - 保持可停止性：新增 goroutine 必须能通过 `done` 或 `context` 退出。
- **补齐最小验证**：
  - 为纯逻辑函数写单测；
  - 对外部 IO 逻辑至少做一条“失败路径”覆盖。

### 该仓库关键定位点
- Cloud：`internal/cloud/server/*`、`internal/cloud/task/*`、`internal/cloud/agent/*`、`internal/cloud/storage/*`
- Agent：`internal/agent/client/*`、`internal/agent/executor/*`、`internal/agent/plugins/*`、`internal/agent/security/*`
- 协议：`internal/common/protocol.go`、`internal/common/websocket.go`、`internal/common/models*.go`

### 风险提示（必须遵守）
- 任何涉及远程命令/文件/SQL/K8s 资源的行为变更，默认不放宽权限；先保证审计可追踪，再谈能力扩展。
