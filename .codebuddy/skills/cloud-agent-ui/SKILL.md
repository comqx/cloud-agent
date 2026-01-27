---
name: cloud-agent-ui
description: This skill should be used when working on the Cloud Agent UI in cloud-ui (Vite + React + TypeScript + Ant Design): pages, services, websocket logs, and typing.
---

### 目标
为 `cloud-ui/` 的需求（新增页面、修 bug、增强交互）提供一致的改动套路，避免接口调用散落与类型漂移。

### 何时使用
- 新增/修改页面（`cloud-ui/src/pages/*`）、组件（`cloud-ui/src/components/*`）。
- 调整与后端交互（`cloud-ui/src/services/api.ts`、`cloud-ui/src/services/websocket.ts`）。
- 修复日志流、任务列表、Agent 列表等 UI 行为问题。

### 工作流（按顺序执行）
- **确认数据源**：先定位服务层（`src/services/*`）是否已有对应 API/WS 封装；缺失则先补服务层。
- **补齐类型**：将请求/响应/状态结构写进 `src/types/*`，页面只引用类型，不内联“any”。
- **页面实现**：使用 Ant Design 组件优先保证可用性与错误态（loading/empty/error）。
- **联调路径**：确认 `vite.config.ts` 代理配置；确保本地 `npm run dev` 可直连后端。
- **最小回归**：确保 `npm run lint`、`npm run build` 可过。

### 风险提示
- 不在页面里直接写 `axios` 调用；避免重复实现同一 API。
- 不破坏 `deployments/nginx.conf.template` 与容器环境变量（`CLOUD_API_URL`/`CLOUD_WS_URL`）的假设。
