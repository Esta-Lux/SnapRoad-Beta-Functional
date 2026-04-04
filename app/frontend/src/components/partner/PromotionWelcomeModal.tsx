import { Gift, X } from 'lucide-react'

function formatPlanLabel(plan?: string): string {
  const p = (plan || 'growth').toLowerCase()
  if (p === 'starter') return 'Starter'
  if (p === 'enterprise') return 'Enterprise'
  return 'Growth'
}

function formatUntil(dateIso?: string): string {
  if (!dateIso?.trim()) return ''
  try {
    const d = new Date(dateIso.includes('T') ? dateIso : `${dateIso.slice(0, 10)}T12:00:00Z`)
    if (Number.isNaN(d.getTime())) return dateIso.slice(0, 10)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateIso.slice(0, 10)
  }
}

type Theme = 'light' | 'dark'

interface Props {
  open: boolean
  theme: Theme
  promotionPlan?: string
  promotionAccessUntil?: string
  onClose: () => void
  onViewPlans: () => void
}

export default function PromotionWelcomeModal({
  open,
  theme,
  promotionPlan,
  promotionAccessUntil,
  onClose,
  onViewPlans,
}: Props) {
  if (!open) return null
  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'
  const label = formatPlanLabel(promotionPlan)
  const until = formatUntil(promotionAccessUntil)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60">
      <div className={`w-full max-w-md rounded-2xl border shadow-xl ${card}`}>
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'border-white/10' : 'border-[#E6ECF5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gift className="text-violet-400" size={22} />
            <h3 className={`font-semibold ${textPrimary}`}>Complimentary partner access</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className={`text-sm leading-relaxed ${textSecondary}`}>
            Your dashboard is unlocked at the <strong className={textPrimary}>{label}</strong> level
            {until ? ` through ${until}` : ''}. Limits and features match that plan for this period. When access ends,
            you can choose a paid plan under <strong className={textPrimary}>Plan &amp; Pricing</strong>.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                isDark ? 'border-white/15 text-slate-300' : 'border-[#E6ECF5] text-[#4B5C74]'
              }`}
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={onViewPlans}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold"
            >
              View plans &amp; billing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
