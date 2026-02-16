import { useState, useEffect } from 'react'
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
  const [badges, setBadges] = useState<CommunityBadge[]>([])
  const [earnedCount, setEarnedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedBadge, setSelectedBadge] = useState<CommunityBadge | null>(null)

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
        setBadges(data.data)
        setEarnedCount(data.earned_count)
      }
    } catch (e) {
      console.log('Error loading badges')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="text-white" data-testid="community-badges-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Community Badges</h1>
          <p className="text-purple-200 text-xs">Earned by helping other drivers</p>
        </div>
        <div className="bg-white/20 px-3 py-1.5 rounded-full">
          <span className="text-white font-bold text-sm">{earnedCount}/{badges.length}</span>
        </div>
      </div>

      {/* Info Card */}
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-start gap-3">
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <Sparkles className="text-purple-400" size={20} />
          </div>
          <div>
            <p className="text-purple-300 text-sm font-medium">How to earn badges</p>
            <p className="text-purple-400/70 text-xs mt-0.5">
              Post road reports, help other drivers, and get upvotes to unlock community badges!
            </p>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {badges.map(badge => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                  badge.earned 
                    ? 'bg-gradient-to-b from-purple-500/30 to-indigo-500/20 border border-purple-500/50' 
                    : 'bg-slate-800/50 border border-slate-700'
                }`}
                data-testid={`badge-${badge.id}`}
              >
                {/* Badge Icon */}
                <div className={`relative text-3xl mb-1 ${!badge.earned && 'grayscale opacity-40'}`}>
                  {badge.icon}
                  
                  {/* Lock overlay for unearned */}
                  {!badge.earned && (
                    <div className="absolute -bottom-1 -right-1 bg-slate-700 rounded-full p-0.5">
                      <Lock size={10} className="text-slate-400" />
                    </div>
                  )}
                </div>
                
                {/* Badge Name */}
                <span className={`text-[10px] text-center leading-tight line-clamp-2 ${
                  badge.earned ? 'text-purple-200' : 'text-slate-500'
                }`}>
                  {badge.name}
                </span>
                
                {/* Earned Checkmark */}
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

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedBadge(null)}
        >
          <div 
            className={`w-full max-w-xs rounded-2xl p-6 text-center ${
              selectedBadge.earned 
                ? 'bg-gradient-to-b from-purple-900 to-indigo-900 border border-purple-500/50'
                : 'bg-slate-800 border border-slate-700'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Large Icon */}
            <div className={`text-6xl mb-4 ${!selectedBadge.earned && 'grayscale opacity-40'}`}>
              {selectedBadge.icon}
            </div>
            
            {/* Status Badge */}
            {selectedBadge.earned ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium mb-3">
                <span>✓</span> Earned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-700 text-slate-400 px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Lock size={12} /> Locked
              </span>
            )}
            
            {/* Name */}
            <h3 className={`font-bold text-lg mb-2 ${selectedBadge.earned ? 'text-white' : 'text-slate-300'}`}>
              {selectedBadge.name}
            </h3>
            
            {/* Description */}
            <p className={`text-sm mb-4 ${selectedBadge.earned ? 'text-purple-200' : 'text-slate-400'}`}>
              {selectedBadge.desc}
            </p>
            
            {/* Close */}
            <button 
              onClick={() => setSelectedBadge(null)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
