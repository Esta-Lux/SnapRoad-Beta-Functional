import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Store, Shield } from 'lucide-react'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import { useAuthStore } from '../store/authStore'
import { partnerApi } from '../services/partnerApi'
import { adminApi } from '../services/adminApi'
import { api } from '@/services/api'

type AuthTab = 'partner' | 'admin'

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as AuthTab) || 'partner'
  const { setAuth } = useAuthStore()

  const [tab, setTab] = useState<AuthTab>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tabs: { id: AuthTab; label: string; icon: typeof Store }[] = [
    { id: 'partner', label: 'Partner', icon: Store },
    { id: 'admin', label: 'Admin', icon: Shield },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (tab === 'admin') {
        const result = await api.login({ email, password })
        if (!result.success || !result.data) throw new Error(result.error || 'Login failed')
        const user = result.data.user
        const token = result.data.token
        const role = user.role as string
        if (!user || (role !== 'admin' && role !== 'super_admin')) throw new Error('This account does not have admin access')
        adminApi.setToken(token)
        setAuth({ id: user.id, email: user.email, fullName: user.full_name || user.email, role: role === 'super_admin' ? 'super_admin' : 'admin' }, token)
        navigate('/portal/admin-sr2025secure')
      } else {
        const result = await partnerApi.login(email, password)
        if (!result.success) throw new Error(result.detail || 'Login failed')
        navigate('/portal/partner')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (t: AuthTab) => {
    setTab(t)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={snaproadLogo} alt="SnapRoad" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Welcome to SnapRoad</h1>
          <p className="text-slate-400 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          {/* Tab bar */}
          <div className="flex border-b border-slate-700/50">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
                  tab === id
                    ? 'text-white bg-slate-700/50 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
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
                placeholder={tab === 'admin' ? 'admin@snaproad.co' : tab === 'partner' ? 'you@business.com' : 'you@email.com'}
                required
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
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                `Sign in as ${tab.charAt(0).toUpperCase() + tab.slice(1)}`
              )}
            </button>

            {tab === 'partner' && (
              <p className="text-center text-sm text-slate-400">
                New to SnapRoad?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth/partner-signup')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Create a partner account
                </button>
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} SnapRoad. All rights reserved.
        </p>
      </div>
    </div>
  )
}
