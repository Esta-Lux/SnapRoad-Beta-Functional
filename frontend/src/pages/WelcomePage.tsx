import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Car, Shield, Gem, Users, ArrowRight, X, Mail, Lock, 
  Eye, EyeOff, Building2, Settings, ChevronRight, Star,
  MapPin, Trophy, Zap
} from 'lucide-react'

type UserRole = 'driver' | 'partner' | 'admin'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
}

function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('driver')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate auth
    await new Promise(r => setTimeout(r, 1000))
    
    // Navigate based on role
    if (role === 'driver') {
      navigate('/driver')
    } else if (role === 'partner') {
      navigate('/partner')
    } else {
      navigate('/admin')
    }
    
    setLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md animate-scale-in">
        {/* Glassmorphism Card */}
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20 pointer-events-none" />
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X className="text-white/70" size={16} />
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-slate-400 text-sm">
                {mode === 'signin' 
                  ? 'Log in to your SnapRoad account' 
                  : 'Join the SnapRoad community'}
              </p>
            </div>

            {/* Role Selector */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-1 flex gap-1 mb-6">
              {[
                { id: 'driver', label: 'Driver', icon: Car },
                { id: 'partner', label: 'Partner', icon: Building2 },
                { id: 'admin', label: 'Admin', icon: Settings },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id as UserRole)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    role === r.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <r.icon size={16} />
                  {r.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1 block">
                    {role === 'partner' ? 'Business Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={role === 'partner' ? 'Your Business Name' : 'John Doe'}
                      className="w-full bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800/50 backdrop-blur border border-white/10 rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="text-right">
                  <button type="button" className="text-blue-400 text-sm hover:text-blue-300">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-slate-400 text-sm mt-6">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => onModeChange('signup')}
                    className="text-emerald-400 font-medium hover:text-emerald-300"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button 
                    onClick={() => onModeChange('signin')}
                    className="text-emerald-400 font-medium hover:text-emerald-300"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  const handleGetStarted = () => {
    setAuthMode('signup')
    setShowAuth(true)
  }

  const handleLogin = () => {
    setAuthMode('signin')
    setShowAuth(true)
  }

  const handlePartnership = () => {
    setAuthMode('signup')
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1920&q=80')`,
        }}
      />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-purple-900/30" />
      
      {/* Animated Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <MapPin className="text-white" size={20} />
            </div>
            <span className="text-white font-bold text-xl">SnapRoad</span>
          </div>
          <button 
            onClick={handleLogin}
            className="text-white/80 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign In
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/10">
            <Star className="text-yellow-400" size={16} />
            <span className="text-white/90 text-sm">Join 50,000+ safe drivers</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Safe journeys,
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              smart rewards
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-slate-300 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
            Join thousands of drivers making roads safer while earning premium rewards. 
            Where safety becomes the ultimate status symbol.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={handleGetStarted}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-8 rounded-2xl hover:from-blue-400 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              data-testid="get-started-btn"
            >
              Get Started
              <ArrowRight size={20} />
            </button>
            <button
              onClick={handlePartnership}
              className="flex-1 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              data-testid="partnership-btn"
            >
              Business Partnership
            </button>
          </div>

          {/* Login Link */}
          <p className="text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <button 
              onClick={handleLogin}
              className="text-emerald-400 font-medium hover:text-emerald-300"
            >
              Log In
            </button>
          </p>
        </main>

        {/* Features Strip */}
        <div className="border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Shield, label: 'Safety Score', desc: 'Track your driving' },
                { icon: Gem, label: 'Earn Gems', desc: 'Redeem rewards' },
                { icon: Trophy, label: 'Leaderboards', desc: 'Compete locally' },
                { icon: Zap, label: 'Premium Perks', desc: '2x gem multiplier' },
              ].map((feature, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="text-blue-400" size={24} />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{feature.label}</h3>
                  <p className="text-slate-400 text-xs mt-1">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center text-slate-500 text-xs border-t border-white/5">
          <p>© 2025 SnapRoad. Making roads safer, one drive at a time.</p>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
