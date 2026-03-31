import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  X, Trophy, Gem, Shield, TrendingUp, Flame, Car, 
  Zap, Star, ChevronRight, Award, Target, MapPin
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface WeeklyStats {
  total_trips: number
  total_miles: number
  total_time_minutes: number
  gems_earned: number
  xp_earned: number
  safety_score_avg: number
  safety_score_change: number
  challenges_won: number
  challenges_lost: number
  offers_redeemed: number
  reports_posted: number
  streak_days: number
  rank_change: number
  highlights: string[]
}

interface WeeklyRecapProps {
  isOpen: boolean
  onClose: () => void
  isPremium: boolean
}

export default function WeeklyRecap({ isOpen, onClose, isPremium }: WeeklyRecapProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'
  const gateCardBg = isLight ? 'bg-white' : 'bg-slate-900'
  const gateTextMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const loadingBg = isLight ? 'bg-white' : 'bg-slate-900'

  useEffect(() => {
    if (isOpen && isPremium) {
      loadWeeklyStats()
    }
  }, [isOpen, isPremium])

  const loadWeeklyStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/weekly-recap`)
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Non-premium gate - theme-aware
  if (!isPremium) {
    return (
      <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-4`} onClick={onClose}>
        <div className={`w-full max-w-sm ${gateCardBg} rounded-2xl overflow-hidden shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
            <Trophy className="text-yellow-200 mx-auto mb-3" size={48} />
            <h2 className="text-white font-bold text-xl mb-2">Weekly Recap</h2>
            <p className="text-white/90 text-sm">Premium Feature</p>
          </div>
          <div className={`p-6 text-center ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
            <p className={`${gateTextMuted} text-sm mb-4`}>
              Get personalized weekly summaries of your driving stats, achievements, and progress!
            </p>
            <button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              Upgrade to Premium
            </button>
            <button onClick={onClose} className={`w-full mt-2 ${gateTextMuted} text-sm py-2`}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  const slides = stats ? [
    // Slide 1: Overview
    {
      bg: 'from-purple-600 to-pink-600',
      content: (
        <div className="text-center">
          <div className="mb-4">
            <p className="text-purple-200 text-sm">Your Week in Review</p>
            <h2 className="text-white text-3xl font-bold mt-1">Week Recap</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <Car className="text-white mx-auto mb-1" size={24} />
              <p className="text-white text-xl font-bold">{stats.total_trips}</p>
              <p className="text-purple-200 text-xs">Trips</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <MapPin className="text-white mx-auto mb-1" size={24} />
              <p className="text-white text-xl font-bold">{stats.total_miles.toFixed(0)}</p>
              <p className="text-purple-200 text-xs">Miles</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <Gem className="text-cyan-300 mx-auto mb-1" size={24} />
              <p className="text-white text-xl font-bold">+{stats.gems_earned.toLocaleString()}</p>
              <p className="text-purple-200 text-xs">Gems</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <Zap className="text-yellow-300 mx-auto mb-1" size={24} />
              <p className="text-white text-xl font-bold">+{(stats.xp_earned / 1000).toFixed(1)}K</p>
              <p className="text-purple-200 text-xs">XP</p>
            </div>
          </div>
        </div>
      )
    },
    // Slide 2: Safety Score
    {
      bg: 'from-emerald-600 to-teal-600',
      content: (
        <div className="text-center">
          <Shield className="text-white mx-auto mb-4" size={48} />
          <p className="text-emerald-200 text-sm">Average Safety Score</p>
          <div className="relative w-32 h-32 mx-auto my-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
              <circle 
                cx="64" cy="64" r="56" 
                stroke="#ffffff" 
                strokeWidth="8" 
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${stats.safety_score_avg * 3.52} 352`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{stats.safety_score_avg}</span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
            stats.safety_score_change >= 0 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-red-500/30 text-red-200'
          }`}>
            <TrendingUp size={14} className={stats.safety_score_change < 0 ? 'rotate-180' : ''} />
            <span className="text-sm font-medium">
              {stats.safety_score_change >= 0 ? '+' : ''}{stats.safety_score_change} from last week
            </span>
          </div>
        </div>
      )
    },
    // Slide 3: Challenges & Achievements
    {
      bg: 'from-orange-500 to-red-500',
      content: (
        <div className="text-center">
          <Trophy className="text-yellow-300 mx-auto mb-4" size={48} />
          <p className="text-orange-200 text-sm">Challenge Results</p>
          <div className="flex justify-center gap-6 my-6">
            <div>
              <p className="text-4xl font-bold text-white">{stats.challenges_won}</p>
              <p className="text-orange-200 text-xs">Won</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-4xl font-bold text-white">{stats.challenges_lost}</p>
              <p className="text-orange-200 text-xs">Lost</p>
            </div>
          </div>
          {stats.streak_days > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Flame className="text-orange-300" size={18} />
              <span className="text-white font-medium">{stats.streak_days} Day Streak!</span>
            </div>
          )}
          {stats.rank_change !== 0 && (
            <div className="mt-4 text-orange-200 text-sm">
              <TrendingUp size={14} className="inline mr-1" />
              Moved up {stats.rank_change} spots in rankings!
            </div>
          )}
        </div>
      )
    },
    // Slide 4: Highlights
    {
      bg: 'from-blue-600 to-indigo-600',
      content: (
        <div className="text-center">
          <Star className="text-yellow-300 mx-auto mb-4" size={48} />
          <p className="text-blue-200 text-sm mb-4">Weekly Highlights</p>
          <div className="space-y-3 text-left">
            {stats.highlights.map((highlight, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Award className="text-yellow-300" size={16} />
                </div>
                <p className="text-white text-sm flex-1">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Slide 5: Community Impact
    {
      bg: 'from-cyan-600 to-blue-600',
      content: (
        <div className="text-center">
          <Target className="text-white mx-auto mb-4" size={48} />
          <p className="text-cyan-200 text-sm">Community Impact</p>
          <div className="my-6">
            <p className="text-5xl font-bold text-white">{stats.reports_posted}</p>
            <p className="text-cyan-200 text-sm mt-1">Road Reports Posted</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-cyan-100 text-sm">
              Your reports helped keep the roads safer for everyone! 🛣️
            </p>
          </div>
          <div className="mt-4 flex justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.offers_redeemed}</p>
              <p className="text-cyan-200 text-xs">Offers Redeemed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{Math.round(stats.total_time_minutes / 60)}h</p>
              <p className="text-cyan-200 text-xs">Drive Time</p>
            </div>
          </div>
        </div>
      )
    }
  ] : []

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-4`} onClick={onClose}>
      <div 
        className="w-full max-w-sm overflow-hidden animate-scale-in shadow-2xl rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className={`${loadingBg} rounded-2xl p-12 flex items-center justify-center border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : stats && (
          <div className={`bg-gradient-to-b ${slides[currentSlide].bg} rounded-2xl overflow-hidden`}>
            {/* Close Button */}
            <div className="p-4 flex justify-end">
              <button 
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                data-testid="weekly-recap-close"
              >
                <X className="text-white" size={16} />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 pb-6 min-h-[320px] flex flex-col justify-center">
              {slides[currentSlide].content}
            </div>
            
            {/* Navigation */}
            <div className="bg-black/20 p-4">
              {/* Dots */}
              <div className="flex justify-center gap-2 mb-4">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentSlide ? 'bg-white w-6' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                {currentSlide > 0 && (
                  <button
                    onClick={() => setCurrentSlide(currentSlide - 1)}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (currentSlide < slides.length - 1) {
                      setCurrentSlide(currentSlide + 1)
                    } else {
                      onClose()
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-white text-slate-900 font-bold flex items-center justify-center gap-2"
                >
                  {currentSlide < slides.length - 1 ? (
                    <>
                      Next
                      <ChevronRight size={16} />
                    </>
                  ) : (
                    'Done'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
