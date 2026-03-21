import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ChevronRight, Eye, EyeOff, Mail, Lock, User, Loader2, Check, ArrowLeft, Sparkles } from 'lucide-react'
import snaproadLogo from '../../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import toast from 'react-hot-toast'
import { getApiBaseUrl, setApiBaseUrlOverride } from '@/services/api'
import api from '@/services/api'
import { getSupabaseClient } from '@/lib/supabaseClient'

type AuthScreen = 'welcome' | 'login' | 'signup' | 'forgot' | 'verify'

export default function AuthFlow() {
  const navigate = useNavigate()
  const { login, signup, setUserFromApi, authError } = useAuth()
  const [screen, setScreen] = useState<AuthScreen>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiOverrideDraft, setApiOverrideDraft] = useState('')
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  const isTunnel = useMemo(() => {
    try {
      return window.location.hostname.endsWith('.tunnelmole.net')
    } catch {
      return false
    }
  }, [])

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), [screen])

  const applyApiOverride = () => {
    const candidate = apiOverrideDraft.trim()
    if (!candidate) {
      setApiBaseUrlOverride(null)
      toast.success('API URL reset')
      return
    }
    if (!/^https?:\/\//i.test(candidate)) {
      toast.error('API URL must start with http:// or https://')
      return
    }
    setApiBaseUrlOverride(candidate)
    toast.success('API URL updated. Try again.')
  }

  const completeSupabaseSession = async () => {
    const sb = getSupabaseClient()
    if (!sb) return
    const { data } = await sb.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) return

    const res = await api.oauthSupabase(accessToken)
    if (!res.success || !res.data?.token || !res.data?.user) {
      toast.error(res.error || 'OAuth login failed')
      return
    }
    setUserFromApi(res.data.user as any)
    toast.success('Welcome!')
    navigate('/driver')
  }

  const startOAuth = async (provider: 'google' | 'apple') => {
    const sb = getSupabaseClient()
    if (!sb) {
      toast.error('Supabase is not configured')
      return
    }
    const redirectTo = `${window.location.origin}/driver/auth`
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) toast.error(error.message || 'OAuth failed')
  }

  // If we returned from an OAuth redirect, complete the exchange automatically.
  useEffect(() => {
    void completeSupabaseSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setIsLoading(true)
    const success = await login(email, password)
    setIsLoading(false)
    if (success) {
      toast.success('Welcome back!')
      navigate('/driver')
    } else {
      toast.error(authError || 'Invalid email or password')
    }
  }

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!acceptTerms) {
      toast.error('Please accept Terms & Conditions')
      return
    }
    setIsLoading(true)
    const success = await signup(name, email, password)
    setIsLoading(false)
    if (success) {
      toast.success('Account created!')
      navigate('/driver')
    } else {
      toast.error(authError || 'Signup failed')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsLoading(false)
    toast.success('Reset code sent!')
    setScreen('verify')
  }

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter 6-digit code')
      return
    }
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setIsLoading(false)
    toast.success('Password reset! Please login.')
    setScreen('login')
  }

  const getPasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']

  // Welcome Screen
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Logo */}
          <div className="mb-8">
            <img src={snaproadLogo} alt="SnapRoad" className="h-20 w-auto" />
          </div>
          
          {/* Brand */}
          <h1 className="text-3xl font-bold text-white mb-2">SnapRoad</h1>
          <p className="text-slate-400 text-center text-sm mb-8 max-w-xs">
            Privacy-first navigation with gamified safety rewards
          </p>

          {/* Features */}
          <div className="w-full max-w-xs space-y-3 mb-10">
            {[
              { icon: '🗺️', text: 'Turn-by-turn navigation' },
              { icon: '💎', text: 'Earn gems while you drive' },
              { icon: '🏆', text: 'Compete with other drivers' },
              { icon: '🎁', text: 'Redeem rewards & offers' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => setScreen('signup')}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Sparkles size={18} /> Get Started
            </button>
            <button
              onClick={() => setScreen('login')}
              className="w-full bg-slate-800 text-white font-medium py-3.5 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              I already have an account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-slate-500 text-xs">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    )
  }

  // Login Screen
  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col px-6 py-8">
        {/* Back */}
        <button onClick={() => setScreen('welcome')} className="flex items-center gap-2 text-slate-400 mb-6">
          <ArrowLeft size={20} /> Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to continue your journey</p>
        </div>

        {isTunnel && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="text-amber-200 text-sm font-semibold mb-1">Tunnel mode</div>
            <div className="text-amber-200/80 text-xs mb-3 break-words">
              Current API: <span className="font-mono">{apiBaseUrl || '(empty)'}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={apiOverrideDraft}
                onChange={(e) => setApiOverrideDraft(e.target.value)}
                placeholder="Paste backend tunnel URL (https://....tunnelmole.net)"
                className="flex-1 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={applyApiOverride}
                className="bg-amber-500 text-slate-900 font-semibold px-3 py-2 rounded-lg text-xs hover:opacity-90"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setScreen('forgot')}
            className="text-emerald-400 text-sm font-medium"
          >
            Forgot password?
          </button>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Log In <ChevronRight size={18} /></>}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs">or continue with</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Social Login */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startOAuth('google')}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 flex items-center justify-center gap-2 text-white text-sm hover:bg-slate-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => startOAuth('apple')}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 flex items-center justify-center gap-2 text-white text-sm hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-slate-400 text-sm">
            Don't have an account?{' '}
            <button onClick={() => setScreen('signup')} className="text-emerald-400 font-medium">
              Sign up
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Signup Screen
  if (screen === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col px-6 py-8 overflow-auto">
        {/* Back */}
        <button onClick={() => setScreen('welcome')} className="flex items-center gap-2 text-slate-400 mb-6">
          <ArrowLeft size={20} /> Back
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400 text-sm">Start your safe driving journey</p>
        </div>

        {isTunnel && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="text-amber-200 text-sm font-semibold mb-1">Tunnel mode</div>
            <div className="text-amber-200/80 text-xs mb-3 break-words">
              Current API: <span className="font-mono">{apiBaseUrl || '(empty)'}</span>
            </div>
            <div className="flex gap-2">
              <input
                value={apiOverrideDraft}
                onChange={(e) => setApiOverrideDraft(e.target.value)}
                placeholder="Paste backend tunnel URL (https://....tunnelmole.net)"
                className="flex-1 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={applyApiOverride}
                className="bg-amber-500 text-slate-900 font-semibold px-3 py-2 rounded-lg text-xs hover:opacity-90"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-700'}`} />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Enter password'}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
              {confirmPassword && password === confirmPassword && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
              )}
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${acceptTerms ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
              {acceptTerms && <Check size={12} className="text-white" />}
            </div>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="hidden" />
            <span className="text-slate-400 text-xs leading-relaxed">
              I agree to the <span className="text-emerald-400">Terms of Service</span> and <span className="text-emerald-400">Privacy Policy</span>
            </span>
          </label>

          <button
            onClick={handleSignup}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ChevronRight size={18} /></>}
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <button onClick={() => setScreen('login')} className="text-emerald-400 font-medium">
              Log in
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Forgot Password Screen
  if (screen === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col px-6 py-8">
        <button onClick={() => setScreen('login')} className="flex items-center gap-2 text-slate-400 mb-6">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
          <p className="text-slate-400 text-sm">Enter your email to receive a reset code</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleForgotPassword}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Code'}
          </button>
        </div>
      </div>
    )
  }

  // Verification Screen
  if (screen === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col px-6 py-8">
        <button onClick={() => setScreen('forgot')} className="flex items-center gap-2 text-slate-400 mb-6">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Verify code</h1>
          <p className="text-slate-400 text-sm">Enter the 6-digit code sent to {email}</p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={verificationCode[i] || ''}
                onChange={(e) => {
                  const newCode = verificationCode.split('')
                  newCode[i] = e.target.value
                  setVerificationCode(newCode.join(''))
                  if (e.target.value && i < 5) {
                    const next = document.querySelector(`input:nth-child(${i + 2})`) as HTMLInputElement
                    next?.focus()
                  }
                }}
                className="w-11 h-12 bg-slate-800 border border-slate-700 rounded-xl text-center text-white text-lg font-bold focus:border-emerald-500 focus:outline-none"
              />
            ))}
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Reset Password'}
          </button>

          <button className="w-full text-emerald-400 text-sm font-medium py-2">
            Resend Code
          </button>
        </div>
      </div>
    )
  }

  return null
}
