import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import { partnerApi } from '../services/partnerApi'

export default function PartnerSignup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    business_address: '',
    email: '',
    password: '',
    referral_code: searchParams.get('ref') || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const result = await partnerApi.register(form)
      if (!result.success) throw new Error(result.detail || result.message || 'Registration failed')
      navigate('/portal/partner')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const fields: { key: string; label: string; type?: string; placeholder: string; half?: boolean }[] = [
    { key: 'first_name', label: 'First Name', placeholder: 'John', half: true },
    { key: 'last_name', label: 'Last Name', placeholder: 'Doe', half: true },
    { key: 'business_name', label: 'Business Name', placeholder: 'Your Business LLC' },
    { key: 'business_address', label: 'Business Address', placeholder: '123 Main St, City, State' },
    { key: 'email', label: 'Work Email', type: 'email', placeholder: 'you@business.com' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={snaproadLogo} alt="SnapRoad" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Partner with SnapRoad</h1>
          <p className="text-slate-400 mt-1">Create your partner account and start growing</p>
        </div>

        <div className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {fields.filter((f) => f.half).map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={(form as any)[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              ))}
            </div>

            {fields.filter((f) => !f.half).map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={(form as any)[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                  placeholder={f.placeholder}
                  required
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-12 text-sm"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {form.referral_code && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Referral Code</label>
                <input
                  type="text"
                  value={form.referral_code}
                  onChange={(e) => update('referral_code', e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
                  placeholder="Optional"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Start Partnering'
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already a partner?{' '}
              <button
                type="button"
                onClick={() => navigate('/portal/partner/sign-in')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Log in
              </button>
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
