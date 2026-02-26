import { useState, useEffect } from 'react'
import { Check, Zap, Shield, Gift, BarChart3, Gem, Headphones, Navigation, Camera, MapPin, Sparkles, Star } from 'lucide-react'

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
    { icon: Camera, text: 'Auto-blur photos' },
    { icon: MapPin, text: 'Local offers' },
    { icon: Gem, text: 'Earn Gems (1×)' },
  ]

  const premiumFeatures = [
    { icon: Check, text: 'Everything in Basic', highlight: true },
    { icon: Navigation, text: 'Automatic rerouting' },
    { icon: Gift, text: 'Advanced local offers' },
    { icon: Gem, text: 'Gem multiplier (2×)', highlight: true },
    { icon: BarChart3, text: 'Smart commute analytics' },
    { icon: Headphones, text: 'Priority support' },
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col overflow-auto">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="text-amber-400" size={20} />
          <span className="text-amber-400 text-sm font-medium tracking-wide">CHOOSE YOUR PLAN</span>
        </div>
        
        <h1 className="text-2xl font-bold text-white">
          Start Your Journey
        </h1>
        <p className="text-slate-400 text-sm mt-2">
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
              ? 'bg-slate-800/80 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white font-bold text-lg">BASIC</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-slate-400 text-sm">/mo</span>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedPlan === 'basic' ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
            }`}>
              {selectedPlan === 'basic' && <Check size={14} className="text-white" />}
            </div>
          </div>
          
          <p className="text-slate-400 text-xs mb-3">
            Privacy-first navigation for everyday driving.
          </p>
          
          <div className="space-y-2">
            {basicFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                <feature.icon size={14} className="text-slate-500" />
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
              ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-gradient-to-br from-slate-800/60 to-slate-800/40 border-slate-700 hover:border-amber-600/50'
          }`}
        >
          {/* Most Popular Badge */}
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            MOST POPULAR
          </div>
          
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-amber-400 font-bold text-lg flex items-center gap-1">
                  <Zap size={16} /> PREMIUM
                </h3>
              </div>
              
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-white">${currentPrice.toFixed(2)}</span>
                <span className="text-slate-400 text-sm">/mo</span>
                
                {discountPercent > 0 && (
                  <>
                    <span className="text-slate-500 line-through text-sm">${pricing.public_price.toFixed(2)}/mo</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              
              {pricing.is_founders_active && (
                <p className="text-amber-400/80 text-xs mt-1 flex items-center gap-1">
                  <Star size={10} className="fill-amber-400" />
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
                feature.highlight ? 'text-amber-300' : 'text-slate-300'
              }`}>
                <feature.icon size={14} className={feature.highlight ? 'text-amber-400' : 'text-slate-500'} />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
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
        
        <p className="text-center text-slate-500 text-xs mt-3">
          No contracts - cancel anytime
        </p>
      </div>
    </div>
  )
}
