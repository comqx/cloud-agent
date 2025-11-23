# Tiangong Deploy UI

Tiangong Deploy 部署管理平台的 Web UI 界面。

## 项目结构

```
tiangong-deploy-ui/
├── src/
│   ├── components/        # 通用组件
│   │   ├── Layout.tsx     # 布局组件
│   │   └── LogViewer.tsx  # 日志查看器
│   ├── pages/             # 页面组件
│   │   ├── Dashboard.tsx      # 概览仪表盘
│   │   ├── Environments.tsx   # 环境管理
│   │   ├── Products.tsx       # 产品管理
│   │   ├── Releases.tsx       # 发布与部署
│   │   ├── Tasks.tsx          # 任务管理
│   │   ├── Agents.tsx         # Agent 管理
│   │   ├── Changes.tsx        # 变更管理
│   │   ├── Audit.tsx          # 审计与合规
│   │   ├── Configuration.tsx  # 配置管理
│   │   ├── Monitoring.tsx     # 监控告警
│   │   └── System.tsx         # 系统管理
│   ├── services/          # API 服务
│   │   ├── api.ts         # API 客户端
│   │   └── websocket.ts   # WebSocket 服务
│   ├── types/             # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx            # 应用入口
│   ├── main.tsx           # 入口文件
│   └── index.css          # 全局样式
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## 功能模块

根据设计文档，UI 包含以下 11 个一级菜单模块：

1. **概览仪表盘** - 系统概览、部署统计、任务统计等
2. **环境管理** - 环境列表、配置管理、健康检查等
3. **产品管理** - 产品列表、版本管理、依赖管理等
4. **发布与部署** - 发布管理、部署管理、部署计划等
5. **任务管理** - 任务列表、任务创建、任务执行等
6. **Agent 管理** - Agent 列表、状态监控、健康检查等
7. **变更管理** - 变更请求、审批流程、变更执行等
8. **审计与合规** - 操作审计、登录审计、合规管理等
9. **配置管理** - 环境配置、产品配置、配置模板等
10. **监控告警** - 告警管理、告警规则、系统监控等
11. **系统管理** - 人员管理、用户组、角色、权限等

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型系统
- **Ant Design 5** - UI 组件库
- **React Router 6** - 路由管理
- **Vite** - 构建工具
- **Axios** - HTTP 客户端

## 开发

### 安装依赖

```bash
cd tiangong-deploy-ui
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:3001 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产版本

```bash
npm run preview
```

## API 配置

默认 API 基础路径为 `/api/v1`，通过 Vite 代理配置转发到后端服务。

如需修改，请编辑 `vite.config.ts` 中的代理配置：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

## WebSocket 配置

WebSocket 连接默认地址为 `/ws`，用于实时日志推送等功能。

## 注意事项

1. 所有页面都已创建，部分功能标记为"开发中"，需要根据实际后端 API 进行完善
2. 类型定义已完整，但需要根据实际后端数据结构进行调整
3. API 服务层已创建，但需要根据实际后端接口进行调整

