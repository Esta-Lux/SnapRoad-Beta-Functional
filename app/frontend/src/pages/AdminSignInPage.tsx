import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import { useAuthStore } from '../store/authStore'
import { adminApi } from '../services/adminApi'
import { api } from '@/services/api'

export default function AdminSignInPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api.login({ email, password })
      if (!result.success || !result.data) throw new Error(result.error || 'Login failed')
      const user = result.data.user as {
        id?: string
        email?: string
        role?: string
        full_name?: string
        name?: string
      }
      const token = result.data.token
      const role = String(user?.role ?? '')
      if (!user?.id || (role !== 'admin' && role !== 'super_admin')) {
        throw new Error('This account does not have admin access')
      }
      adminApi.setToken(token)
      setAuth(
        {
          id: String(user.id),
          email: String(user.email ?? ''),
          fullName: String(user.full_name ?? user.name ?? user.email ?? ''),
          role: role === 'super_admin' ? 'super_admin' : 'admin',
        },
        token,
      )
      navigate('/portal/admin-sr2025secure')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={snaproadLogo} alt="SnapRoad" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Admin sign in</h1>
          <p className="text-slate-400 mt-1">SnapRoad internal dashboard</p>
        </div>

        <div className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                placeholder="admin@snaproad.co"
                required
                data-testid="admin-signin-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all pr-12"
                  placeholder="Enter your password"
                  required
                  data-testid="admin-signin-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              data-testid="admin-signin-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to admin'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          <Link to="/driver/auth" className="text-slate-500 hover:text-slate-400">
            Driver app
          </Link>
          <span className="text-slate-700 mx-2">|</span>
          <Link to="/portal/partner/welcome" className="text-slate-500 hover:text-slate-400">
            Partner portal
          </Link>
        </p>
      </div>
    </div>
  )
}
