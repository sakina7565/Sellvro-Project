import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Same default as server/server.js so `npm run dev:all` works without a PORT in .env
  const apiPort = env.PORT || process.env.PORT || 5000

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
        },
        '/uploads': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
