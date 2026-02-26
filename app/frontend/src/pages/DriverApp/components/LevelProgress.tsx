import { useState, useEffect } from 'react'
import { ChevronLeft, TrendingUp, Award, Zap, Target, Star } from 'lucide-react'

interface XPStatus {
  level: number
  total_xp: number
  xp_progress: number
  xp_to_next_level: number
  progress_percent: number
  is_max_level: boolean
}

interface XPConfig {
  photo_report: number
  offer_redemption: number
  safe_drive: number
  consistent_driving: number
  safety_score_penalty: number
  base_xp_to_level: number
  xp_increment: number
  max_level: number
}

interface LevelProgressProps {
  isOpen: boolean
  onClose: () => void
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function LevelProgress({ isOpen, onClose }: LevelProgressProps) {
  const [status, setStatus] = useState<XPStatus | null>(null)
  const [config, setConfig] = useState<XPConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch(`${API_URL}/api/xp/status`).then(r => r.json()),
        fetch(`${API_URL}/api/xp/config`).then(r => r.json())
      ])
      
      if (statusRes.success) setStatus(statusRes.data)
      if (configRes.success) setConfig(configRes.data)
    } catch (e) {
      console.log('Error loading XP data')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const xpActions = config ? [
    { icon: '📍', label: 'Post road report', xp: `+${config.photo_report} XP`, color: 'text-amber-400' },
    { icon: '🎁', label: 'Redeem an offer', xp: `+${config.offer_redemption} XP`, color: 'text-emerald-400' },
    { icon: '🚗', label: 'Safe drive', xp: `+${config.safe_drive} XP`, color: 'text-blue-400' },
    { icon: '🔥', label: '3 safe drives streak', xp: `+${config.consistent_driving} XP`, color: 'text-orange-400' },
    { icon: '⚠️', label: 'Safety score drops', xp: `${config.safety_score_penalty} XP`, color: 'text-red-400' },
  ] : []

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 flex items-center gap-3">
        <button onClick={onClose} className="text-white" data-testid="level-progress-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Level & XP</h1>
          <p className="text-blue-200 text-xs">Track your progress</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
        </div>
      ) : status && (
        <div className="flex-1 overflow-auto">
          {/* Level Display */}
          <div className="px-6 py-8 text-center bg-gradient-to-b from-blue-600/20 to-transparent">
            <div className="relative inline-block mb-4">
              {/* Level Circle */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <div className="w-28 h-28 rounded-full bg-slate-900 flex flex-col items-center justify-center">
                  <span className="text-blue-400 text-xs font-medium">LEVEL</span>
                  <span className="text-white text-4xl font-bold">{status.level}</span>
                </div>
              </div>
              
              {/* Max Level Crown */}
              {status.is_max_level && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="text-2xl">👑</span>
                </div>
              )}
            </div>

            {/* XP Info */}
            <p className="text-slate-400 text-sm mb-2">
              Total XP: <span className="text-white font-bold">{status.total_xp.toLocaleString()}</span>
            </p>

            {/* Progress Bar */}
            {!status.is_max_level && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Level {status.level}</span>
                  <span className="text-slate-400">{Math.max(0, status.xp_progress).toLocaleString()} / {status.xp_to_next_level.toLocaleString()} XP</span>
                  <span className="text-blue-400">Level {status.level + 1}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, status.progress_percent))}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {Math.max(0, status.xp_to_next_level - status.xp_progress).toLocaleString()} XP to next level
                </p>
              </div>
            )}

            {status.is_max_level && (
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-3 max-w-xs mx-auto">
                <p className="text-amber-400 font-medium flex items-center justify-center gap-2">
                  <Star size={16} className="fill-amber-400" />
                  Maximum Level Reached!
                </p>
              </div>
            )}
          </div>

          {/* How to Earn XP */}
          <div className="px-4 pb-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              How to Earn XP
            </h3>
            
            <div className="space-y-2">
              {xpActions.map((action, i) => (
                <div 
                  key={i}
                  className="bg-slate-800 rounded-xl p-3 flex items-center gap-3"
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="flex-1 text-slate-300 text-sm">{action.label}</span>
                  <span className={`font-bold text-sm ${action.color}`}>{action.xp}</span>
                </div>
              ))}
            </div>

            {/* Level Requirements Info */}
            <div className="mt-6 bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Target size={16} className="text-indigo-400" />
                Level Requirements
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-slate-400">
                  Level 1 → 2: <span className="text-white">2,500 XP</span>
                </p>
                <p className="text-slate-400">
                  Each level: <span className="text-white">+500 XP</span> more than previous
                </p>
                <p className="text-slate-400">
                  Max level: <span className="text-amber-400">99</span>
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-xs flex items-center gap-2">
                <Zap size={14} />
                <span>Unsafe driving lowers XP and can cause you to level down!</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
