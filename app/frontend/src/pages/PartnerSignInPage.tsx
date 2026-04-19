import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import { partnerApi } from '../services/partnerApi'

export default function PartnerSignInPage() {
  const navigate = useNavigate()
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
      const result = await partnerApi.login(email, password)
      if (!result.success) throw new Error(result.detail || result.message || 'Login failed')
      navigate('/portal/partner')
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
          <h1 className="text-2xl font-bold text-white">Partner sign in</h1>
          <p className="text-slate-400 mt-1">Access your SnapRoad business portal</p>
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
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                placeholder="you@business.com"
                required
                data-testid="partner-signin-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all pr-12"
                  placeholder="Enter your password"
                  required
                  data-testid="partner-signin-password"
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
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              data-testid="partner-signin-submit"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to partner portal'
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              New to SnapRoad?{' '}
              <Link to="/auth/partner-signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Create a partner account
              </Link>
            </p>

            <p className="text-center text-sm text-slate-500">
              <Link to="/portal/partner/welcome" className="text-slate-400 hover:text-white">
                Back to partner home
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} SnapRoad. All rights reserved.
        </p>
      </div>
    </div>
  )
}
