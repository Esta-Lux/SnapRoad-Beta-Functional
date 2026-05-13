import { Link, useNavigate } from 'react-router-dom'
import { Store, Gift, BarChart3, QrCode, ArrowRight, Star } from 'lucide-react'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'

export default function PartnerWelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=80')`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/25 via-transparent to-teal-900/25" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[120px] animate-pulse" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={snaproadLogo} alt="SnapRoad" className="h-10 w-auto" />
            <span className="text-white font-bold text-xl">SnapRoad</span>
            <span className="text-emerald-400/90 text-sm font-medium hidden sm:inline border border-emerald-500/30 rounded-full px-2.5 py-0.5">
              Partner
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/portal/partner/sign-in')}
            className="text-white/90 hover:text-white text-sm font-medium px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
          >
            Sign In
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/10">
            <Star className="text-emerald-400" size={16} />
            <span className="text-white/90 text-sm">Grow with local drivers</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Your storefront,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              on the map
            </span>
          </h1>

          <p className="text-slate-300 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
            Publish offers, track redemptions, and reach SnapRoad drivers nearby. One portal for locations,
            boosts, and team scan links.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/auth/partner-signup')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 px-10 rounded-2xl hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              data-testid="partner-get-started-btn"
            >
              Create partner account
              <ArrowRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/portal/partner/sign-in')}
              className="text-emerald-300 font-medium text-sm border border-emerald-500/40 rounded-2xl py-4 px-8 hover:bg-emerald-500/10 transition-colors"
            >
              Already a partner? Sign in
            </button>
          </div>
        </main>

        <div className="border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Gift, label: 'Offers', desc: 'Create & manage deals' },
                { icon: BarChart3, label: 'Analytics', desc: 'Real-time performance' },
                { icon: Store, label: 'Locations', desc: 'Pin your stores' },
                { icon: QrCode, label: 'Team links', desc: 'QR for your staff' },
              ].map((feature) => (
                <div key={feature.label} className="text-center">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="text-emerald-400" size={24} />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{feature.label}</h3>
                  <p className="text-slate-400 text-xs mt-1">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col gap-4 items-center text-center">
              <p className="text-slate-500 text-sm leading-relaxed px-1">
                © {new Date().getFullYear()} SnapRoad. Partner portal.
              </p>
              <nav
                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-sm text-slate-400 max-w-md w-full px-2"
                aria-label="Legal and policies"
              >
                <Link to="/privacy" className="hover:text-white transition-colors py-1 px-0.5 shrink-0">
                  Privacy
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors py-1 px-0.5 shrink-0">
                  Terms
                </Link>
                <Link to="/community-guidelines" className="hover:text-white transition-colors py-1 px-0.5 shrink-0 text-center">
                  Community Guidelines
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
