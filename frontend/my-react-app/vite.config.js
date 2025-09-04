// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // String shorthand: proxy '/api' requests to a different server
      '/api': {
        target: 'http://localhost:8000', // Your API gateway URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // remove /api from the request path
      },
    }
  }
})