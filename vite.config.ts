import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Plugin: rewrite /aripan-admin-secure and /aripan-admin-secure/ to /aripan-admin-secure/index.html
// so the static admin panel is served instead of React Router's SPA 404 catch-all.
function adminStaticPlugin(): Plugin {
  return {
    name: 'admin-static-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/aripan-admin-secure' || req.url === '/aripan-admin-secure/') {
          req.url = '/aripan-admin-secure/index.html'
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:4000'

  return {
    plugins: [react(), adminStaticPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      // Expose the backend URL to the browser bundle
      __API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/media': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      sourcemap: false,
      target: 'es2022',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/framer-motion')) return 'motion'
            if (id.includes('node_modules/react-router')) return 'router'
          },
        },
      },
    },
  }
})

