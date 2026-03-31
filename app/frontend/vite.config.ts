import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// ESM-safe: __dirname is often undefined in vite.config.ts; wrong path => loadEnv reads no .env
const configDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = configDir

export default defineConfig(({ mode }) => {
  // Load from app/frontend/.env — third arg limits to VITE_* keys
  const env = loadEnv(mode, frontendRoot, 'VITE_')
  const envAll = loadEnv(mode, frontendRoot, '')
  const apiProxyTarget =
    env.VITE_BACKEND_PROXY_TARGET ||
    envAll.VITE_BACKEND_PROXY_TARGET ||
    'http://127.0.0.1:8001'
  // Hard-inject into the client bundle. Fixes cases where import.meta.env was empty
  // (wrong cwd, tooling, or env not merged) even though .env exists next to this file.
  const importMetaEnvDefine = Object.fromEntries(
    Object.entries(env).map(([key, val]) => [`import.meta.env.${key}`, JSON.stringify(val)])
  )

  if (mode === 'development') {
    const envPath = path.join(frontendRoot, '.env')
    console.log('[vite] envDir:', frontendRoot)
    console.log('[vite] .env readable:', fs.existsSync(envPath), envPath)
    const hasSb = Boolean(
      env.VITE_SUPABASE_URL &&
        (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)
    )
    if (!hasSb) {
      console.warn(
        '[vite] Supabase: loadEnv did not load VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Keys in env:',
        Object.keys(env).filter((k) => k.includes('SUPABASE'))
      )
    } else {
      console.log('[vite] Supabase env loaded for client (URL + anon/publishable key present)')
    }
  }

  return {
    root: frontendRoot,
    envDir: frontendRoot,
    define: importMetaEnvDefine,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(frontendRoot, './src'),
        '@components': path.resolve(frontendRoot, './src/components'),
        '@pages': path.resolve(frontendRoot, './src/pages'),
        '@hooks': path.resolve(frontendRoot, './src/hooks'),
        '@services': path.resolve(frontendRoot, './src/services'),
        '@store': path.resolve(frontendRoot, './src/store'),
        '@utils': path.resolve(frontendRoot, './src/utils'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('mapbox-gl')) return 'mapbox'
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('/admin/')) return 'admin'
            if (id.includes('/partner/')) return 'partner'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: './coverage',
      },
    },
  }
})
