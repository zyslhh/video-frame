import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: '0.0.0.0',
    // 优化大量静态资源的加载
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },

  // 构建配置优化
  build: {
    // 输出目录
    outDir: 'dist',
    // 生成 source map（生产环境可关闭以提高性能）
    sourcemap: false,
    // 压缩配置
    minify: 'esbuild',
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分包，优化加载性能
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'gsap-vendor': ['gsap'],
        },
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name].[hash][extname]`
          }
          if (/\.(webp|png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `frames/[name].[hash][extname]`
          }
          return `assets/[name].[hash][extname]`
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
    // 构建大小警告阈值（MB）
    chunkSizeWarningLimit: 1000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
  },

  // 静态资源处理
  publicDir: 'public',
  
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap'],
  },
})
