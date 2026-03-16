import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { ChevronLeft, Lock, Sparkles } from 'lucide-react'

interface CommunityBadge {
  id: number
  name: string
  desc: string
  icon: string
  requirement: number
  earned: boolean
}

interface CommunityBadgesProps {
  isOpen: boolean
  onClose: () => void
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function CommunityBadges({ isOpen, onClose }: CommunityBadgesProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [badges, setBadges] = useState<CommunityBadge[]>([])
  const [earnedCount, setEarnedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedBadge, setSelectedBadge] = useState<CommunityBadge | null>(null)

  const bg = isLight ? 'bg-slate-50' : 'bg-[#0a0a0f]'
  const headerBg = isLight ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-slate-900'
  const cardEarned = isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border-indigo-500/30'
  const cardLocked = isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/80 border-white/5'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const detailModalBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
  const backdrop = isLight ? 'bg-black/40' : 'bg-black/60'

  useEffect(() => {
    if (isOpen) {
      loadBadges()
    }
  }, [isOpen])

  const loadBadges = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/badges/community`)
      const data = await res.json()
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : (data.data?.badges ?? [])
        setBadges(list)
        setEarnedCount(typeof data.earned_count === 'number' ? data.earned_count : list.filter((b: CommunityBadge) => b.earned).length)
      }
    } catch (e) {
      console.log('Error loading badges')
    } finally {
      setLoading(false)
    }
  }

  const badgeList = Array.isArray(badges) ? badges : []
  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 ${bg} z-50 flex flex-col`}>
      {/* Header - theme-aware, clean badges title */}
      <div className={`${headerBg} px-4 py-4 flex items-center gap-3 border-b ${isLight ? 'border-white/20' : 'border-white/10'}`}>
        <button onClick={onClose} className="text-white/90 hover:text-white p-1" data-testid="community-badges-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Community Badges</h1>
          <p className="text-white/80 text-xs">Earned by helping other drivers</p>
        </div>
        <div className="bg-white/20 px-3 py-1.5 rounded-full border border-white/20">
          <span className="text-amber-200 font-bold text-sm tabular-nums">{earnedCount} / {badgeList.length}</span>
        </div>
      </div>

      {/* Info Card - theme-aware */}
      <div className={`px-4 py-3 border-b ${isLight ? 'bg-indigo-50/80 border-slate-200' : 'bg-black/20 border-white/5'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border ${isLight ? 'bg-indigo-100 border-indigo-200' : 'bg-indigo-500/20 border-indigo-500/20'}`}>
            <Sparkles className={isLight ? 'text-indigo-600' : 'text-indigo-400'} size={20} />
          </div>
          <div>
            <p className={`text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white/90'}`}>How to earn badges</p>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Post road reports, help other drivers, and get upvotes to unlock community badges!
            </p>
          </div>
        </div>
      </div>

      {/* Badges Grid - clean display */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {badgeList.map(badge => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col items-center p-3 rounded-xl transition-all border ${badge.earned ? cardEarned : cardLocked} hover:opacity-95`}
                data-testid={`badge-${badge.id}`}
              >
                <div className={`relative text-3xl mb-1 ${!badge.earned && 'grayscale opacity-50'}`}>
                  {badge.icon}
                  {!badge.earned && (
                    <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`}>
                      <Lock size={10} className={textMuted} />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] text-center leading-tight line-clamp-2 font-medium ${badge.earned ? textPrimary : textMuted}`}>
                  {badge.name}
                </span>
                {badge.earned && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badge Detail Modal - theme-aware */}
      {selectedBadge && (
        <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-6`} onClick={() => setSelectedBadge(null)}>
          <div className={`w-full max-w-xs rounded-2xl p-6 text-center border shadow-xl ${selectedBadge.earned ? (isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-gradient-to-b from-purple-900 to-indigo-900 border-purple-500/50') : detailModalBg}`} onClick={e => e.stopPropagation()}>
            <div className={`text-6xl mb-4 ${!selectedBadge.earned && 'grayscale opacity-50'}`}>
              {selectedBadge.icon}
            </div>
            {selectedBadge.earned ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-600 px-3 py-1 rounded-full text-xs font-medium mb-3">
                <span>✓</span> Earned
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mb-3 ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-400'}`}>
                <Lock size={12} /> Locked
              </span>
            )}
            <h3 className={`font-bold text-lg mb-2 ${textPrimary}`}>{selectedBadge.name}</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>{selectedBadge.desc}</p>
            <button onClick={() => setSelectedBadge(null)} className={`w-full py-3 rounded-xl font-medium transition-colors ${isLight ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
