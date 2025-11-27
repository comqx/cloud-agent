import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://localhost:8443',
        changeOrigin: true,
        secure: false, // 允许自签证书
      },
      '/ws': {
        target: process.env.VITE_WS_PROXY_TARGET || 'wss://localhost:8443',
        ws: true,
        secure: false, // 允许自签证书
      },
    },
  },
})
