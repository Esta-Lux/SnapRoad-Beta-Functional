import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, Lock, Check, Filter, Search, ChevronDown, Award, Gem } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface Badge {
  id: number
  name: string
  desc: string
  icon: string
  category: string
  requirement: number
  gems: number
  earned: boolean
  progress: number
}

interface BadgesGridProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  distance: { label: 'Distance', color: 'blue' },
  safety: { label: 'Safety', color: 'emerald' },
  community: { label: 'Community', color: 'purple' },
  streak: { label: 'Streaks', color: 'orange' },
  achievement: { label: 'Achievement', color: 'pink' },
  special: { label: 'Special', color: 'yellow' },
}

export default function BadgesGrid({ isOpen, onClose }: BadgesGridProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [badges, setBadges] = useState<Badge[]>([])
  const [categories, setCategories] = useState<Record<string, { count: number; earned: number }>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterMode, setFilterMode] = useState<'all' | 'earned' | 'locked'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalAvailable, setTotalAvailable] = useState(160)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const modalBg = isLight ? 'bg-white' : 'bg-[#0f0f14]'
  const headerBg = isLight ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-slate-900'
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border-white/10'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const pillActive = isLight ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
  const pillInactive = isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
  const badgeCardEarned = isLight ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border-indigo-500/30'
  const badgeCardLocked = isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/80 border-slate-700/50'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/90'

  useEffect(() => {
    if (isOpen) {
      loadBadges()
      loadCategories()
    }
  }, [isOpen])

  const padTo160 = (list: Badge[]): Badge[] => {
    const out = [...list]
    const byId = new Map(out.map(b => [b.id, b]))
    const categories = ['distance', 'safety', 'community', 'streak', 'achievement', 'special']
    for (let id = 1; id <= 160; id++) {
      if (byId.has(id)) continue
      out.push({
        id,
        name: `Badge ${id}`,
        desc: 'Earn by driving and contributing',
        icon: '🏅',
        category: categories[(id - 1) % categories.length],
        requirement: id * 10,
        gems: 10 + (id % 5) * 5,
        earned: false,
        progress: 0,
      })
    }
    return out.sort((a, b) => a.id - b.id)
  }

  const loadBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/badges`)
      const data = await res.json()
      if (data.success && data.data != null) {
        const raw = data.data
        const list = Array.isArray(raw) ? raw : (raw.badges ?? [])
        const normalized = Array.isArray(list) ? list.map((b: any) => ({
          id: b.id ?? 0,
          name: b.name ?? 'Badge',
          desc: b.desc ?? '',
          icon: b.icon ?? '🏅',
          category: b.category ?? 'achievement',
          requirement: b.requirement ?? 0,
          gems: b.gems ?? 0,
          earned: !!b.earned,
          progress: typeof b.progress === 'number' ? b.progress : 0,
        })) : []
        const fullList = padTo160(normalized)
        setBadges(fullList)
        const earned = typeof raw.earned_count === 'number' ? raw.earned_count : fullList.filter(b => b.earned).length
        setTotalEarned(earned)
        setTotalAvailable(160)
      } else {
        const placeholder = padTo160([])
        setBadges(placeholder)
        setTotalEarned(0)
        setTotalAvailable(160)
      }
    } catch (e) {
      const placeholder = padTo160([])
      setBadges(placeholder)
      setTotalEarned(0)
      setTotalAvailable(160)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/badges/categories`)
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch (e) {
      console.log('Could not load categories')
    }
  }

  const badgeList = Array.isArray(badges) ? badges : []
  const filteredBadges = badgeList.filter((badge: Badge) => {
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) return false
    if (filterMode === 'earned' && !badge.earned) return false
    if (filterMode === 'locked' && badge.earned) return false
    if (searchQuery && !badge.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (!isOpen) return null

  const total = Math.max(totalAvailable, badgeList.length, 1)
  const progressPct = (totalEarned / total) * 100

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-2`} onClick={onClose}>
      <div className={`w-full max-w-md h-[90vh] ${modalBg} rounded-2xl overflow-hidden flex flex-col animate-scale-in shadow-2xl border ${isLight ? 'border-slate-200' : 'border-white/10'}`} onClick={e => e.stopPropagation()}>
        {/* Header - theme-aware, clean badges title */}
        <div className={`${headerBg} p-4 flex-shrink-0 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLight ? 'bg-white/20' : 'bg-white/10'}`}>
                <Award className="text-amber-200" size={20} />
              </div>
              <h2 className="text-white font-bold text-lg tracking-tight">All Badges</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Progress - clean display */}
          <div className={`rounded-xl p-3 border ${isLight ? 'bg-white/20 border-white/20' : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 text-sm font-medium">Collection Progress</span>
              <span className="text-amber-200 font-bold tabular-nums">{totalEarned} / {total}</span>
            </div>
            <div className={`w-full rounded-full h-2.5 overflow-hidden ${isLight ? 'bg-white/30' : 'bg-slate-800'}`}>
              <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Search */}
          <div className={`mt-3 rounded-xl px-3 py-2 flex items-center gap-2 border ${isLight ? 'bg-white/20 border-white/20' : 'bg-black/20 border-white/5'}`}>
            <Search className="text-white/80" size={16} />
            <input type="text" placeholder="Search badges..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/60" />
          </div>
        </div>

        {/* Category Pills - theme-aware */}
        <div className={`px-4 py-3 flex gap-2 overflow-x-auto flex-shrink-0 border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/10 border-white/5'}`}>
          <button onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === 'all' ? pillActive : pillInactive}`}>
            All ({badgeList.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <button key={key} onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === key ? pillActive : pillInactive}`}>
              {val.label} {categories[key] && `(${categories[key].earned ?? 0}/${categories[key].count ?? 0})`}
            </button>
          ))}
        </div>

        {/* Filter Tabs - theme-aware */}
        <div className={`px-4 py-2 flex gap-2 flex-shrink-0 ${isLight ? 'bg-slate-50' : ''}`}>
          {(['all', 'earned', 'locked'] as const).map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filterMode === mode ? (isLight ? 'bg-blue-500 text-white' : 'bg-indigo-500/80 text-white') : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
              {mode === 'all' ? 'All' : mode === 'earned' ? '✓ Earned' : '🔒 Locked'}
            </button>
          ))}
        </div>

        {/* Badges Grid - clean cards, theme-aware */}
        <div className={`flex-1 overflow-auto p-4 ${isLight ? 'bg-slate-50' : 'bg-[#0f0f14]'}`}>
          <div className="grid grid-cols-4 gap-3">
            {filteredBadges.map(badge => (
              <button key={badge.id} onClick={() => setSelectedBadge(badge)} data-testid={`badge-${badge.id}`}
                className={`relative rounded-xl p-2.5 flex flex-col items-center border transition-all duration-200 ${badge.earned ? badgeCardEarned : badgeCardLocked} hover:opacity-95`}>
                {/* Lock on top for unearned */}
                {!badge.earned && (
                  <div className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center shadow">
                    <Lock className="text-white" size={10} />
                  </div>
                )}
                {/* Icon - clean badge icon or lock */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-1.5 ${badge.earned ? (isLight ? 'bg-amber-100 shadow-sm' : 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-md') : (isLight ? 'bg-slate-200' : 'bg-slate-700/80')}`}>
                  {badge.earned ? <span className={isLight ? 'text-amber-600' : 'text-white opacity-90'}>{badge.icon || '🏅'}</span> : <Lock className={isLight ? 'text-slate-400' : 'text-slate-500'} size={18} />}
                </div>
                
                {/* Name - clear label */}
                <p className={`text-[10px] text-center leading-tight line-clamp-2 font-medium ${badge.earned ? textPrimary : textMuted}`}>
                  {badge.name}
                </p>

                {/* Progress bar for locked */}
                {!badge.earned && badge.progress > 0 && (
                  <div className="w-full mt-1 bg-slate-700 rounded-full h-1">
                    <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${badge.progress}%` }} />
                  </div>
                )}

                {/* Earned check */}
                {badge.earned && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                    <Check className="text-white" size={10} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12">
              <Award className={`mx-auto mb-2 ${textMuted}`} size={48} />
              <p className={textMuted}>No badges found</p>
            </div>
          )}
        </div>

        {/* Badge Detail Modal - theme-aware, clean */}
        {selectedBadge && (
          <div className={`absolute inset-0 ${backdrop} flex items-center justify-center p-4`} onClick={() => setSelectedBadge(null)}>
            <div className={`${modalBg} rounded-2xl p-6 max-w-xs w-full shadow-2xl border ${isLight ? 'border-slate-200' : 'border-white/10'}`} onClick={e => e.stopPropagation()}>
              <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl mb-4 ${selectedBadge.earned ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg' : 'bg-slate-700'}`}>
                {selectedBadge.earned ? (selectedBadge.icon || '🏅') : <Lock className="text-slate-400" size={32} />}
              </div>
              
              <h3 className="text-white text-xl font-bold text-center">{selectedBadge.name}</h3>
              <p className={`text-center text-xs capitalize mb-2 ${CATEGORY_LABELS[selectedBadge.category]?.color ? `text-${CATEGORY_LABELS[selectedBadge.category].color}-400` : 'text-slate-400'}`}>
                {CATEGORY_LABELS[selectedBadge.category]?.label || selectedBadge.category}
              </p>
              <p className="text-slate-400 text-sm text-center mb-4">{selectedBadge.desc}</p>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <Gem className={`mx-auto mb-1 ${selectedBadge.earned ? 'text-emerald-500' : textMuted}`} size={20} />
                  <p className={`font-bold ${selectedBadge.earned ? 'text-emerald-500' : textMuted}`}>+{selectedBadge.gems}</p>
                  <p className={`text-[10px] ${textMuted}`}>Gems</p>
                </div>
              </div>

              {!selectedBadge.earned && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMuted}>Progress</span>
                    <span className={textPrimary}>{selectedBadge.progress}%</span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${selectedBadge.progress}%` }} />
                  </div>
                </div>
              )}

              {selectedBadge.earned && (
                <div className="bg-emerald-500/20 rounded-xl p-3 text-center">
                  <Check className="mx-auto text-emerald-400 mb-1" size={20} />
                  <p className="text-emerald-400 text-sm font-medium">Badge Earned!</p>
                </div>
              )}

              <button onClick={() => setSelectedBadge(null)}
                className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isLight ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
