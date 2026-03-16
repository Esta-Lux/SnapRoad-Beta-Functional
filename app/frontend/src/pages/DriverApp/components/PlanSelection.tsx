import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Check, Zap, Shield, Gift, BarChart3, Gem, Headphones, Navigation, Camera, MapPin, Sparkles, Star, Users, Bell, Route } from 'lucide-react'

interface PlanSelectionProps {
  onSelectPlan: (plan: 'basic' | 'premium') => void
  onSkip?: () => void
}

interface PricingConfig {
  founders_price: number
  public_price: number
  is_founders_active: boolean
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function PlanSelection({ onSelectPlan, onSkip }: PlanSelectionProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null)
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
      console.log('Using default pricing')
    } finally {
      setLoading(false)
    }
  }

  // Calculate discount percentage
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

  const premiumFeatures = [
    { icon: Check, text: 'Everything in Basic', highlight: true },
    { icon: Users, text: 'Share location & track friends', highlight: true },
    { icon: Camera, text: 'Traffic cameras on map', highlight: true },
    { icon: Bell, text: 'Delay alerts (2 hr ahead)', highlight: true },
    { icon: Route, text: '20 saved routes' },
    { icon: Gift, text: 'Advanced local offers' },
    { icon: Gem, text: 'Gem multiplier (2×)', highlight: true },
    { icon: BarChart3, text: 'Smart commute analytics' },
    { icon: Headphones, text: 'Priority support' },
  ]

  const bg = isLight ? 'bg-slate-100' : 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900'
  const cardBase = isLight ? 'bg-white border-slate-200' : 'bg-slate-800/40 border-slate-700'
  const cardSelectedBasic = isLight ? 'bg-blue-50 border-blue-500' : 'bg-slate-800/80 border-blue-500'
  const cardSelectedPremium = isLight ? 'bg-amber-50/80 border-amber-500' : 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-amber-500'
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
    <div className={`fixed inset-0 ${bg} z-50 flex flex-col overflow-auto`}>
      <div className="px-4 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="text-amber-500" size={20} />
          <span className="text-amber-600 text-sm font-medium tracking-wide">CHOOSE YOUR PLAN</span>
        </div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>
          Start Your Journey
        </h1>
        <p className={`text-sm mt-2 ${textMuted}`}>
          Drive safer. Earn rewards. Privacy guaranteed.
        </p>
      </div>

      {/* Plans Container */}
      <div className="flex-1 px-4 pb-4 space-y-3">
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
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className={`font-bold text-lg ${textPrimary}`}>BASIC</h3>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${textPrimary}`}>$0</span>
                <span className={`text-sm ${textMuted}`}>/mo</span>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPlan === 'basic' ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
            }`}>
              {selectedPlan === 'basic' && <Check size={14} className="text-white" />}
            </div>
          </div>
          
          <p className={`text-xs mb-3 ${textMuted}`}>
            Privacy-first navigation for everyday driving.
          </p>
          <div className="space-y-2">
            {basicFeatures.map((feature, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${textMuted}`}>
                <feature.icon size={14} className={textMuted} />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </button>

        <button
          onClick={() => setSelectedPlan('premium')}
          data-testid="plan-premium"
          className={`w-full text-left rounded-2xl p-4 transition-all border-2 relative overflow-hidden ${
            selectedPlan === 'premium'
              ? `${cardSelectedPremium} shadow-lg shadow-amber-500/20`
              : `${cardBase} hover:border-amber-600/50`
          }`}
        >
          {/* Most Popular Badge */}
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            MOST POPULAR
          </div>
          
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-amber-500 font-bold text-lg flex items-center gap-1">
                  <Zap size={16} /> PREMIUM
                </h3>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-bold ${textPrimary}`}>${currentPrice.toFixed(2)}</span>
                <span className={`text-sm ${textMuted}`}>/mo</span>
                {discountPercent > 0 && (
                  <>
                    <span className={`line-through text-sm ${textMuted}`}>${pricing.public_price.toFixed(2)}/mo</span>
                    <span className="bg-emerald-500/20 text-emerald-500 text-xs font-bold px-2 py-0.5 rounded-full">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              {pricing.is_founders_active && (
                <p className="text-amber-500/90 text-xs mt-1 flex items-center gap-1">
                  <Star size={10} className="fill-amber-500" />
                  Founders pricing
                </p>
              )}
            </div>
            
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPlan === 'premium' ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
            }`}>
              {selectedPlan === 'premium' && <Check size={14} className="text-white" />}
            </div>
          </div>
          
          <p className="text-slate-400 text-xs mb-3">
            Auto-routing, insights, and faster rewards.
          </p>

          {/* Lock in price callout */}
          {pricing.is_founders_active && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-3">
              <p className="text-amber-400 text-xs font-medium flex items-center gap-1">
                🎉 Lock in ${pricing.founders_price.toFixed(2)}/month for life!
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {premiumFeatures.map((feature, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${
                feature.highlight ? 'text-amber-600' : textMuted
              }`}>
                <feature.icon size={14} className={feature.highlight ? 'text-amber-500' : textMuted} />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </button>
      </div>

      <div className={`p-4 border-t backdrop-blur-sm ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/80'}`}>
        <button
          onClick={handleContinue}
          disabled={!selectedPlan}
          data-testid="plan-continue-btn"
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            selectedPlan
              ? selectedPlan === 'premium'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'
                : 'bg-blue-500 text-white hover:bg-blue-400'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {selectedPlan === 'premium' ? (
            <>
              <Zap size={20} />
              Continue with Premium
            </>
          ) : selectedPlan === 'basic' ? (
            <>
              <Check size={20} />
              Choose Basic
            </>
          ) : (
            'Select a Plan'
          )}
        </button>
        
        <p className={`text-center text-xs mt-3 ${textMuted}`}>
          No contracts - cancel anytime. Car Studio coming soon.
        </p>
      </div>
    </div>
  )
}
