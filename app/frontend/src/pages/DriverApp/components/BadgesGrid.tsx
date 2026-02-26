import { useState, useEffect } from 'react'
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
  const [badges, setBadges] = useState<Badge[]>([])
  const [categories, setCategories] = useState<Record<string, { count: number; earned: number }>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterMode, setFilterMode] = useState<'all' | 'earned' | 'locked'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [totalEarned, setTotalEarned] = useState(0)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadBadges()
      loadCategories()
    }
  }, [isOpen])

  const loadBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/badges`)
      const data = await res.json()
      if (data.success) {
        setBadges(data.data)
        setTotalEarned(data.earned)
      }
    } catch (e) {
      console.log('Could not load badges')
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

  const filteredBadges = badges.filter(badge => {
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) return false
    if (filterMode === 'earned' && !badge.earned) return false
    if (filterMode === 'locked' && badge.earned) return false
    if (searchQuery && !badge.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="text-yellow-300" size={20} />
              <h2 className="text-white font-bold text-lg">All Badges</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Progress */}
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Collection Progress</span>
              <span className="text-yellow-300 font-bold">{totalEarned}/160</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${(totalEarned / 160) * 100}%` }} />
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="text-slate-400" size={16} />
            <input type="text" placeholder="Search badges..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-400" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto flex-shrink-0 border-b border-slate-800">
          <button onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
            All ({badges.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <button key={key} onClick={() => setSelectedCategory(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedCategory === key ? `bg-${val.color}-500 text-white` : 'bg-slate-800 text-slate-400'}`}>
              {val.label} {categories[key] && `(${categories[key].earned}/${categories[key].count})`}
            </button>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 flex gap-2 flex-shrink-0">
          {(['all', 'earned', 'locked'] as const).map(mode => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize ${filterMode === mode ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
              {mode === 'all' ? 'All' : mode === 'earned' ? '✓ Earned' : '🔒 Locked'}
            </button>
          ))}
        </div>

        {/* Badges Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-4 gap-2">
            {filteredBadges.map(badge => (
              <button key={badge.id} onClick={() => setSelectedBadge(badge)} data-testid={`badge-${badge.id}`}
                className={`relative rounded-xl p-2 flex flex-col items-center ${badge.earned ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1 ${badge.earned ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-slate-700'}`}>
                  {badge.earned ? badge.icon : <Lock className="text-slate-500" size={16} />}
                </div>
                
                {/* Name */}
                <p className={`text-[9px] text-center leading-tight line-clamp-2 ${badge.earned ? 'text-white' : 'text-slate-500'}`}>
                  {badge.name}
                </p>

                {/* Progress bar for locked */}
                {!badge.earned && badge.progress > 0 && (
                  <div className="w-full mt-1 bg-slate-700 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${badge.progress}%` }} />
                  </div>
                )}

                {/* Earned check */}
                {badge.earned && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="text-white" size={10} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12">
              <Award className="mx-auto text-slate-600 mb-2" size={48} />
              <p className="text-slate-400">No badges found</p>
            </div>
          )}
        </div>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedBadge(null)}>
            <div className="bg-slate-900 rounded-2xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>
              <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl mb-4 ${selectedBadge.earned ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-slate-700'}`}>
                {selectedBadge.earned ? selectedBadge.icon : <Lock className="text-slate-400" size={32} />}
              </div>
              
              <h3 className="text-white text-xl font-bold text-center">{selectedBadge.name}</h3>
              <p className={`text-center text-xs capitalize mb-2 ${CATEGORY_LABELS[selectedBadge.category]?.color ? `text-${CATEGORY_LABELS[selectedBadge.category].color}-400` : 'text-slate-400'}`}>
                {CATEGORY_LABELS[selectedBadge.category]?.label || selectedBadge.category}
              </p>
              <p className="text-slate-400 text-sm text-center mb-4">{selectedBadge.desc}</p>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <Gem className={`mx-auto mb-1 ${selectedBadge.earned ? 'text-emerald-400' : 'text-slate-500'}`} size={20} />
                  <p className={`font-bold ${selectedBadge.earned ? 'text-emerald-400' : 'text-slate-500'}`}>+{selectedBadge.gems}</p>
                  <p className="text-slate-500 text-[10px]">Gems</p>
                </div>
              </div>

              {!selectedBadge.earned && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white">{selectedBadge.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
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
                className="w-full mt-4 bg-slate-700 text-white py-2 rounded-xl text-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
