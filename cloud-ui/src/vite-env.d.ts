/// <reference types="vite/client" />

// 扩展 Vite 的环境变量类型定义
interface ImportMetaEnv {
  readonly VITE_WS_URL?: string
  readonly VITE_API_TARGET?: string
  readonly VITE_WS_PROXY_TARGET?: string
  // 可以在这里添加更多环境变量
}

