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
          <Toaster position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
