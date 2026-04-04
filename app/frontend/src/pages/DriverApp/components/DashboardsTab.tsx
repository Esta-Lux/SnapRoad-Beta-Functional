import { Users, Lock } from 'lucide-react'

interface Props {
  isLight: boolean
  isPremium: boolean
  hasFamily: boolean
  onUpgrade: () => void
  onOpenFriends: () => void
  onOpenFamily: () => void
}

export default function DashboardsTab({
  isLight,
  isPremium,
  hasFamily,
  onUpgrade,
  onOpenFriends,
  onOpenFamily,
}: Props) {
  const bg = isLight ? '#f5f5f7' : '#0a0a0f'
  const card = isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-white/10'
  const text = isLight ? 'text-slate-900' : 'text-white'
  const muted = isLight ? 'text-slate-500' : 'text-slate-400'

  const Locked = ({ label }: { label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${muted}`}>
      <Lock size={12} />
      <span>{label}</span>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'calc(60px + env(safe-area-inset-bottom, 20px))',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: bg,
        paddingTop: 'env(safe-area-inset-top, 44px)',
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <h1 className={`text-lg font-bold ${text}`}>Dashboards</h1>
        <p className={`text-xs ${muted}`}>Premium features and family safety controls</p>
      </div>

      <div className="px-4 pb-6 space-y-3">
        {/* Friends (Premium) */}
        <div className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isLight ? 'bg-emerald-100' : 'bg-emerald-500/15'}`}>
              <Users className={isLight ? 'text-emerald-700' : 'text-emerald-300'} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${text}`}>Friends</div>
              <div className={`text-xs ${muted}`}>Track friends, follow, and location tags</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => (isPremium ? onOpenFriends() : onUpgrade())}
              className={`px-3 py-2 rounded-xl text-sm font-semibold ${isPremium ? (isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white') : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')}`}
            >
              Open Friends Hub
            </button>
          </div>

          {!isPremium && (
            <div className="mt-3 space-y-1">
              <Locked label="Premium required for live friend tracking" />
              <button
                onClick={onUpgrade}
                className={`mt-2 w-full rounded-xl py-2 text-sm font-bold ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white'}`}
              >
                Upgrade to Premium
              </button>
            </div>
          )}
        </div>

        {/* Family (Family or Premium) */}
        <div className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isLight ? 'bg-purple-100' : 'bg-purple-500/15'}`}>
              <Users className={isLight ? 'text-purple-700' : 'text-purple-300'} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${text}`}>Family Mode</div>
              <div className={`text-xs ${muted}`}>Invite code, SOS, speed/curfew controls, trips</div>
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={() => (hasFamily ? onOpenFamily() : onUpgrade())}
              className={`w-full px-3 py-2 rounded-xl text-sm font-semibold ${hasFamily ? (isLight ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white') : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')}`}
            >
              Open Family Dashboard
            </button>
          </div>

          {!hasFamily && (
            <div className="mt-3 space-y-1">
              <Locked label="Family plan (or Premium) required" />
              <button
                onClick={onUpgrade}
                className={`mt-2 w-full rounded-xl py-2 text-sm font-bold ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white'}`}
              >
                Upgrade to Family or Premium
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
