import { useState, useEffect } from 'react'
import { CheckCircle, BadgeCheck, Star, Loader2 } from 'lucide-react'
import { partnerApi } from '@/services/partnerApi'

interface PlanData {
  name: string
  price_founders: number | null
  price_public: number | null
  max_locations: number
  features: string[]
}

interface Props {
  currentPlan: string
  /** Admin-granted complimentary access */
  isInternalComplimentary?: boolean
  hasFullPortalAccess?: boolean
  onUpgrade: (planId: string) => void
}

const PLAN_ADDONS: Record<string, string[]> = {
  starter: [
    'Extra locations: $8.99/location/mo',
    'Auto-upgrade to Growth after 15 locations',
  ],
  growth: [
    'Extra locations: $6.99/location/mo',
    'Auto-upgrade to Enterprise after 35 locations',
  ],
  enterprise: [
    'Per-location pricing: $0.50 – $1.00/location',
    'Volume discounts available',
  ],
}

/** Paid tiers only — `internal` is admin-assigned and never listed here */
const PAID_PLAN_ORDER = ['starter', 'growth', 'enterprise'] as const
const PLAN_COLORS: Record<string, string> = {
  starter: '#0084FF',
  growth: '#00DFA2',
  enterprise: '#A855F7',
}

export default function PricingTab({
  currentPlan,
  isInternalComplimentary,
  onUpgrade,
}: Props) {
  const [plans, setPlans] = useState<Record<string, PlanData>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await partnerApi.getPlans()
        const planData = res.data?.plans || res.data
        if (planData) setPlans(planData)
      } catch {
        /* fallback empty */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" size={28} />
      </div>
    )
  }

  const showInternalBanner =
    isInternalComplimentary === true || currentPlan.toLowerCase() === 'internal'

  return (
    <div className="space-y-6 min-w-0">
      {showInternalBanner && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 sm:px-5 text-left">
          <p className="text-emerald-200 text-sm font-medium">Complimentary / internal access</p>
          <p className="text-slate-400 text-xs mt-1">
            Your portal is active without a paid subscription. You can move to a paid plan anytime below.
          </p>
        </div>
      )}

      <div className="text-center mb-6 sm:mb-8 px-1">
        <p className="text-slate-400 text-sm break-words">
          Current plan: <span className="text-white font-semibold capitalize">{currentPlan}</span>
          {' · '}
          <button
            type="button"
            className="text-[#0084FF] hover:underline"
            onClick={() => window.open('mailto:billing@snaproad.co?subject=Billing%20Inquiry', '_blank')}
          >
            Manage billing
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 min-w-0 gap-4 sm:gap-6 md:grid-cols-3">
        {PAID_PLAN_ORDER.map((planId) => {
          const plan = plans[planId]
          if (!plan) return null
          const isActive = planId === currentPlan
          const isPopular = planId === 'starter'
          const hasFoundersBonus = planId === 'growth'
          const color = PLAN_COLORS[planId]
          const addons = PLAN_ADDONS[planId] || []

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col min-w-0 transition-all ${
                isPopular
                  ? 'border-[#0084FF] ring-2 ring-[#0084FF]/20'
                  : 'border-white/10 hover:border-white/20'
              } ${isActive ? 'bg-white/[0.04]' : 'bg-slate-800/30'}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0084FF] text-white text-xs font-bold uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              {hasFoundersBonus && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center gap-1">
                  <Star size={12} fill="white" />
                  Founders Bonus
                </div>
              )}

              <div className="mb-5">
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <BadgeCheck size={20} style={{ color }} />
                </div>
                <h3 className="text-white text-xl font-bold">{plan.name}</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Up to {plan.max_locations >= 50 ? '50+' : plan.max_locations} locations
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                {plan.price_founders != null ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">
                        ${plan.price_founders.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-sm">/mo</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-500 text-sm line-through">
                        ${plan.price_public?.toFixed(2)}/mo
                      </span>
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">
                        Founders price
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">Custom</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 flex-1 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Includes</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color }} className="shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Add-ons */}
              {addons.length > 0 && (
                <div className="space-y-2 mb-6 pt-4 border-t border-white/5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Add-ons</p>
                  {addons.map((addon, i) => (
                    <p key={i} className="text-slate-400 text-xs">{addon}</p>
                  ))}
                </div>
              )}

              {hasFoundersBonus && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                  <p className="text-amber-400 text-xs font-medium">
                    Lock in $49.99/month for life while your account stays active
                  </p>
                </div>
              )}

              <button
                onClick={() => onUpgrade(planId)}
                data-testid={`plan-btn-${planId}`}
                disabled={isActive}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-white/10 text-slate-400 cursor-default'
                    : isPopular
                      ? 'bg-[#0084FF] text-white hover:opacity-90'
                      : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {isActive ? 'Current Plan' : planId === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
              </button>

              <p className="text-center text-slate-500 text-xs mt-2">No contracts — cancel anytime</p>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-slate-400 text-sm">
          Need a custom solution?{' '}
          <span
            className="text-[#0084FF] cursor-pointer hover:underline font-medium"
            onClick={() => window.open('mailto:sales@snaproad.co?subject=Custom%20Solution%20Inquiry', '_blank')}
          >
            Contact our sales team
          </span>{' '}
          or view our{' '}
          <span
            className="text-[#0084FF] cursor-pointer hover:underline font-medium"
            onClick={() => window.open('https://snaproad.co/pricing', '_blank')}
          >
            full feature comparison
          </span>
        </p>
      </div>
    </div>
  )
}
