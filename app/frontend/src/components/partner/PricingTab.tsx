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
  /** From API: paid subscription, promotion, or internal */
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

/** Self-serve paid tiers only — Enterprise is sales-led; `internal` is admin-only */
const PAID_PLAN_ORDER = ['starter', 'growth'] as const
const PLAN_COLORS: Record<string, string> = {
  starter: '#0084FF',
  growth: '#00DFA2',
  enterprise: '#A855F7',
}

export default function PricingTab({
  currentPlan,
  isInternalComplimentary,
  hasFullPortalAccess,
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

  const needsPaidSubscribe =
    hasFullPortalAccess !== true &&
    !showInternalBanner &&
    ['unselected', '', 'none'].includes((currentPlan || '').toLowerCase())

  return (
    <div className="space-y-6 min-w-0">
      {needsPaidSubscribe && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 sm:px-5 text-left">
          <p className="text-amber-100 text-sm font-medium">Choose a paid plan to unlock the partner portal</p>
          <p className="text-slate-400 text-xs mt-1">
            SnapRoad partner value is subscription-based (Starter or Growth). If SnapRoad extends a promotion or
            complimentary access from admin, your portal unlocks without checkout until that promotion ends.
          </p>
        </div>
      )}
      {showInternalBanner && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 sm:px-5 text-left">
          <p className="text-emerald-200 text-sm font-medium">Complimentary / internal access</p>
          <p className="text-slate-400 text-xs mt-1">
            Your portal is active without a paid subscription. You can move to a paid plan anytime below.
          </p>
        </div>
      )}

      <div className="mb-6 sm:mb-8 px-0.5">
        <div className="flex flex-col items-stretch gap-2 sm:items-center sm:flex-row sm:justify-center sm:flex-wrap sm:gap-x-2 sm:gap-y-1 text-center text-slate-400 text-sm">
          <span className="break-words">
            Current plan:{' '}
            <span className="text-white font-semibold capitalize">{currentPlan}</span>
          </span>
          <span className="hidden sm:inline text-slate-600" aria-hidden>
            ·
          </span>
          <button
            type="button"
            className="text-[#0084FF] hover:underline font-medium py-1 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center sm:inline"
            onClick={() => window.open('mailto:teams@snaproad.co?subject=Billing%20Inquiry', '_blank')}
          >
            Manage billing
          </button>
        </div>
      </div>

      {/* Two paid tiers: single column on phones, two columns from sm; centered max width so cards don’t look stretched */}
      <div className="grid grid-cols-1 min-w-0 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 max-w-4xl mx-auto w-full pt-2 sm:pt-1">
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
              className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col min-w-0 transition-all overflow-visible mt-4 sm:mt-3 ${
                isPopular
                  ? 'border-[#0084FF] ring-2 ring-[#0084FF]/20'
                  : 'border-white/10 hover:border-white/20'
              } ${isActive ? 'bg-white/[0.04]' : 'bg-slate-800/30'}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 max-w-[calc(100%-1rem)] px-3 py-1 sm:px-4 rounded-full bg-[#0084FF] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center whitespace-nowrap shadow-lg">
                  Most Popular
                </div>
              )}

              {hasFoundersBonus && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 max-w-[calc(100%-1rem)] px-3 py-1 sm:px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-lg">
                  <Star size={12} className="shrink-0" fill="white" />
                  <span className="truncate">Founders Bonus</span>
                </div>
              )}

              <div className="mb-5">
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <BadgeCheck size={20} style={{ color }} />
                </div>
                <h3 className="text-white text-lg sm:text-xl font-bold leading-tight">{plan.name}</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Up to {plan.max_locations >= 50 ? '50+' : plan.max_locations} locations
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-6 min-w-0">
                {plan.price_founders != null ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                        ${plan.price_founders.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-sm">/mo</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                      <span className="text-slate-500 text-sm line-through tabular-nums">
                        ${plan.price_public?.toFixed(2)}/mo
                      </span>
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Founders price
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-bold text-white">Custom</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 flex-1 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Includes</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={16} style={{ color }} className="shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm leading-snug break-words">{feature}</span>
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
                className={`w-full min-h-[48px] py-3 px-3 rounded-xl font-semibold text-sm transition-all touch-manipulation ${
                  isActive
                    ? 'bg-white/10 text-slate-400 cursor-default'
                    : isPopular
                      ? 'bg-[#0084FF] text-white hover:opacity-90 active:opacity-95'
                      : 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20'
                }`}
              >
                {isActive ? 'Current Plan' : 'Subscribe now'}
              </button>

              <p className="text-center text-slate-500 text-xs mt-2">No contracts — cancel anytime</p>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/5 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-2 text-center max-w-lg mx-auto">
          <p className="text-slate-400 text-sm leading-relaxed">Need a custom solution?</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center sm:items-center gap-2 sm:gap-x-2">
            <button
              type="button"
              className="text-[#0084FF] hover:underline font-medium py-3 px-2 rounded-lg sm:py-0 sm:px-0 min-h-[48px] sm:min-h-0 inline-flex items-center justify-center text-sm touch-manipulation active:bg-white/5 sm:active:bg-transparent"
              onClick={() => window.open('mailto:teams@snaproad.co?subject=Custom%20Solution%20Inquiry', '_blank')}
            >
              Contact our sales team
            </button>
            <span className="text-slate-500 text-xs sm:text-sm hidden sm:inline select-none" aria-hidden>
              ·
            </span>
            <button
              type="button"
              className="text-[#0084FF] hover:underline font-medium py-3 px-2 rounded-lg sm:py-0 sm:px-0 min-h-[48px] sm:min-h-0 inline-flex items-center justify-center text-sm touch-manipulation active:bg-white/5 sm:active:bg-transparent"
              onClick={() => window.open('https://snaproad.co/pricing', '_blank')}
            >
              View full feature comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
