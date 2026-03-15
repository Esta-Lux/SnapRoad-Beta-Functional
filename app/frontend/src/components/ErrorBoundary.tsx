import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// ErrorFallback must be a child of Router (useNavigate); ErrorBoundary is used inside App which is inside BrowserRouter.

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches React render errors (e.g. after login navigation) and shows
 * a fallback instead of a blank screen. Use for debugging "site not loading".
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-200">
      <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-400 mb-4 max-w-md text-center">
        The page couldn’t load. This often happens after login if the backend is unreachable or a component threw an error.
      </p>
      <pre className="text-xs bg-slate-800 rounded-lg p-4 mb-6 max-w-full overflow-auto text-left">
        {error.message}
      </pre>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
