import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

const API_URL_OVERRIDE_KEY = 'snaproad_api_url_override'
const STALE_OVERRIDE_CLEARED_FLAG = 'snaproad_stale_api_override_cleared_v1'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('snaproad_clear_api_override') === '1') {
      localStorage.removeItem(API_URL_OVERRIDE_KEY)
      params.delete('snaproad_clear_api_override')
      const qs = params.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', next)
    } else if (!localStorage.getItem(STALE_OVERRIDE_CLEARED_FLAG)) {
      localStorage.removeItem(API_URL_OVERRIDE_KEY)
      localStorage.setItem(STALE_OVERRIDE_CLEARED_FLAG, '1')
    }
  } catch {
    // ignore (private mode / blocked storage)
  }
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.05,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4200,
              style: {
                background: 'rgba(15, 23, 42, 0.96)',
                color: '#f1f5f9',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '14px',
                boxShadow: '0 18px 48px rgba(0, 0, 0, 0.4)',
                padding: '14px 16px',
                maxWidth: '420px',
                fontSize: '14px',
                fontWeight: 500,
              },
              success: {
                iconTheme: { primary: '#34d399', secondary: '#0f172a' },
                style: {
                  border: '1px solid rgba(52, 211, 153, 0.45)',
                },
              },
              error: {
                iconTheme: { primary: '#f87171', secondary: '#0f172a' },
                style: {
                  border: '1px solid rgba(248, 113, 113, 0.45)',
                },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
