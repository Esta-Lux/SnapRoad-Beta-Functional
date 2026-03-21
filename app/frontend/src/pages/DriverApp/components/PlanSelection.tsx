import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Check, Zap, Shield, Gift, BarChart3, Gem, Headphones, Navigation, Camera, MapPin, Sparkles, Star, Users, Bell, Route, MessageCircle, Trophy, Fuel } from 'lucide-react'

interface PlanSelectionProps {
  onSelectPlan: (plan: 'basic' | 'premium' | 'family') => void
  onSkip?: () => void
}

interface PricingConfig {
  founders_price: number
  public_price: number
  is_founders_active: boolean
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

/** All features that are locked for Basic and included in Premium (single source of truth for upgrade card). */
const PREMIUM_LOCKED_FEATURES = [
  { icon: Users, text: 'Share location & track friends' },
  { icon: Camera, text: 'Traffic cameras on map' },
  { icon: Bell, text: 'Delay alerts (2 hr ahead)' },
  { icon: Route, text: '20 saved routes (Basic: 5)' },
  { icon: Gift, text: 'Advanced local offers' },
  { icon: Gem, text: '2× Gem multiplier' },
  { icon: BarChart3, text: 'Smart commute analytics' },
  { icon: Shield, text: 'Driving Score & insights' },
  { icon: Trophy, text: 'Weekly Recap' },
  { icon: Fuel, text: 'Fuel tracker & savings' },
  { icon: MessageCircle, text: 'Orion voice assistant' },
  { icon: Headphones, text: 'Priority support' },
]

export default function PlanSelection({ onSelectPlan }: PlanSelectionProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'family' | null>(null)
  const [pricing, setPricing] = useState<PricingConfig>({
    founders_price: 10.99,
    public_price: 16.99,
    is_founders_active: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pricing`)
      const data = await res.json()
      if (data.success) {
        setPricing(data.data)
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const discountPercent = pricing.is_founders_active 
    ? Math.round(((pricing.public_price - pricing.founders_price) / pricing.public_price) * 100)
    : 0

  const currentPrice = pricing.is_founders_active ? pricing.founders_price : pricing.public_price

  const handleContinue = () => {
    if (selectedPlan) {
      onSelectPlan(selectedPlan)
    }
  }

  const basicFeatures = [
    { icon: Navigation, text: 'Manual rerouting' },
    { icon: Shield, text: 'Privacy-first navigation' },
    { icon: MapPin, text: 'Local offers' },
    { icon: Gem, text: 'Earn Gems (1×)' },
    { icon: Route, text: '5 saved routes' },
  ]

  const familyFeatures = [
    { icon: Users, text: 'Up to 5 family members' },
    { icon: MapPin, text: 'Opt-in live tracking (13+)' },
    { icon: Shield, text: 'Teen controls & safety settings' },
    { icon: Bell, text: 'SOS + safety alerts' },
    { icon: Trophy, text: 'Family leaderboard' },
  ]

  const bg = isLight ? 'bg-slate-100' : 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900'
  const cardBase = isLight ? 'bg-white border-slate-200' : 'bg-slate-800/40 border-slate-700'
  const cardSelectedBasic = isLight ? 'bg-blue-50 border-blue-500' : 'bg-slate-800/80 border-blue-500'
  const cardSelectedPremium = isLight ? 'bg-amber-50/80 border-amber-500' : 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-amber-500'
  const cardFamily = isLight ? 'bg-purple-50/70 border-purple-300' : 'bg-gradient-to-br from-purple-900/30 to-slate-900/30 border-purple-600/40'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'

  if (loading) {
    return (
      <div className={`fixed inset-0 ${bg} z-50 flex items-center justify-center`}>
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 ${bg} flex flex-col`}
      style={{
        zIndex: 2000,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-4 pt-6 pb-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="text-amber-500" size={18} />
            <span className="text-amber-600 text-xs font-semibold tracking-wide uppercase">Choose your plan</span>
          </div>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Start your journey</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>Drive safer. Earn rewards. Privacy guaranteed.</p>
        </div>

        {/* Extra bottom padding so Premium card scrolls fully above the sticky footer */}
        <div className="px-4 pb-4 space-y-3 mb-28">
          {/* Basic Plan */}
          <button
            onClick={() => setSelectedPlan('basic')}
            data-testid="plan-basic"
            className={`w-full text-left rounded-2xl p-4 transition-all border-2 ${
              selectedPlan === 'basic'
                ? `${cardSelectedBasic} shadow-lg shadow-blue-500/20`
                : `${cardBase} hover:border-slate-600`
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className={`font-bold text-base ${textPrimary}`}>Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${textPrimary}`}>$0</span>
                  <span className={`text-sm ${textMuted}`}>/mo</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === 'basic' ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
              }`}>
                {selectedPlan === 'basic' && <Check size={12} className="text-white" />}
              </div>
            </div>
            <p className={`text-xs mb-2 ${textMuted}`}>Privacy-first navigation for everyday driving.</p>
            <div className="space-y-1.5">
              {basicFeatures.map((feature, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${textMuted}`}>
                  <feature.icon size={12} />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Premium Plan */}
          <button
            onClick={() => setSelectedPlan('premium')}
            data-testid="plan-premium"
            className={`w-full text-left rounded-2xl p-4 transition-all border-2 relative overflow-hidden ${
              selectedPlan === 'premium'
                ? `${cardSelectedPremium} shadow-lg shadow-amber-500/20`
                : `${cardBase} hover:border-amber-600/50`
            }`}
          >
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-xl">
              Most popular
            </div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-amber-500 font-bold text-base flex items-center gap-1">
                  <Zap size={14} /> Premium
                </h3>
                <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                  <span className={`text-2xl font-bold ${textPrimary}`}>${currentPrice.toFixed(2)}</span>
                  <span className={`text-sm ${textMuted}`}>/mo</span>
                  {discountPercent > 0 && (
                    <>
                      <span className={`line-through text-xs ${textMuted}`}>${pricing.public_price.toFixed(2)}</span>
                      <span className="bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {discountPercent}% off
                      </span>
                    </>
                  )}
                </div>
                {pricing.is_founders_active && (
                  <p className="text-amber-500/90 text-[10px] mt-1 flex items-center gap-1">
                    <Star size={10} className="fill-amber-500" />
                    Founders pricing
                  </p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === 'premium' ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
              }`}>
                {selectedPlan === 'premium' && <Check size={12} className="text-white" />}
              </div>
            </div>
            {pricing.is_founders_active && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 mb-2">
                <p className="text-amber-400 text-[10px] font-medium">Lock in ${pricing.founders_price.toFixed(2)}/mo for life</p>
              </div>
            )}

            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'} mb-2`}>
              Everything in Basic, plus:
            </p>
            <div className="space-y-1.5">
              {PREMIUM_LOCKED_FEATURES.map((feature, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  <feature.icon size={12} className="text-amber-500 flex-shrink-0" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Family Plan */}
          <button
            onClick={() => setSelectedPlan('family')}
            data-testid="plan-family"
            className={`w-full text-left rounded-2xl p-4 transition-all border-2 relative overflow-hidden ${
              selectedPlan === 'family'
                ? `${cardFamily} shadow-lg shadow-purple-500/20 border-purple-500`
                : `${cardFamily} hover:border-purple-500/70`
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-purple-400 font-bold text-base flex items-center gap-1">
                  <Users size={14} /> Family
                </h3>
                <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                  <span className={`text-2xl font-bold ${textPrimary}`}>$19.99</span>
                  <span className={`text-sm ${textMuted}`}>/mo</span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>Shared safety and rewards for families.</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === 'family' ? 'bg-purple-500 border-purple-500' : 'border-slate-500'
              }`}>
                {selectedPlan === 'family' && <Check size={12} className="text-white" />}
              </div>
            </div>
            <div className="space-y-1.5 mt-2">
              {familyFeatures.map((feature, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${textMuted}`}>
                  <feature.icon size={12} />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* Sticky footer - stays in place with safe area */}
      <div
        className={`flex-shrink-0 border-t backdrop-blur-sm ${isLight ? 'border-slate-200 bg-white/98' : 'border-slate-800 bg-slate-900/98'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="p-4 pt-3">
          <button
            onClick={handleContinue}
            disabled={!selectedPlan}
            data-testid="plan-continue-btn"
            className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              selectedPlan
                ? selectedPlan === 'premium'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {selectedPlan === 'premium' ? (
              <><Zap size={18} /> Continue with Premium</>
            ) : selectedPlan === 'basic' ? (
              <><Check size={18} /> Choose Basic</>
            ) : (
              'Select a plan'
            )}
          </button>
          <p className={`text-center text-[11px] mt-2 ${textMuted}`}>
            No contracts · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
