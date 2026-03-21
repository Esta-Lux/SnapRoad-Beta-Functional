import React, { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Shield, TrendingUp, TrendingDown, Gauge, AlertTriangle, 
  CheckCircle, X, Zap, MessageCircle, 
  Car, Timer, Navigation, Eye, Volume2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface DrivingMetric {
  id: string
  name: string
  score: number
  trend: 'up' | 'down' | 'stable'
  icon: any
  color: string
  description: string
}

interface OrionTip {
  id: string
  metric: string
  tip: string
  priority: 'high' | 'medium' | 'low'
}

interface DrivingScoreProps {
  isOpen: boolean
  onClose: () => void
  isPremium: boolean
  onUpgrade: () => void
}

export default function DrivingScore({ isOpen, onClose, isPremium, onUpgrade }: DrivingScoreProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [overallScore, setOverallScore] = useState(0)
  const [metrics, setMetrics] = useState<DrivingMetric[]>([])
  const [orionTips, setOrionTips] = useState<OrionTip[]>([])
  const [, setLoading] = useState(true)
  const [speakingTip, setSpeakingTip] = useState<string | null>(null)

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'

  useEffect(() => {
    if (isOpen && isPremium) {
      loadDrivingScore()
    }
  }, [isOpen, isPremium])

  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Gauge, Car, TrendingUp, Eye, Navigation, Timer, Shield, AlertTriangle,
  }

  const normalizeMetrics = (raw: any[]): DrivingMetric[] => {
    if (!Array.isArray(raw)) return []
    return raw.map((m: any) => ({
      id: m.id ?? String(m.name ?? ''),
      name: m.name ?? 'Metric',
      score: typeof m.score === 'number' ? m.score : 0,
      trend: (m.trend === 'up' || m.trend === 'down' ? m.trend : 'stable') as 'up' | 'down' | 'stable',
      icon: typeof m.icon === 'function' ? m.icon : (iconMap[m.icon] ?? iconMap[m.id] ?? Gauge),
      color: m.color ?? 'blue',
      description: m.description ?? '',
    }))
  }

  const loadDrivingScore = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/driving-score`)
      const data = await res.json()
      const rawMetrics = data.data?.metrics
      if (data.success && data.data && Array.isArray(rawMetrics) && rawMetrics.length > 0) {
        setOverallScore(typeof data.data.overall_score === 'number' ? data.data.overall_score : 87)
        setMetrics(normalizeMetrics(rawMetrics))
        setOrionTips(Array.isArray(data.data.orion_tips) ? data.data.orion_tips : [])
      } else {
        setOverallScore(87)
        setMetrics([
          { id: 'speed', name: 'Speed Compliance', score: 92, trend: 'up', icon: Gauge, color: 'emerald', description: 'Staying within speed limits' },
          { id: 'braking', name: 'Smooth Braking', score: 78, trend: 'down', icon: Car, color: 'amber', description: 'Gradual, safe braking' },
          { id: 'acceleration', name: 'Smooth Acceleration', score: 85, trend: 'stable', icon: TrendingUp, color: 'blue', description: 'Gradual speed increases' },
          { id: 'following', name: 'Following Distance', score: 90, trend: 'up', icon: Eye, color: 'emerald', description: 'Safe distance from other cars' },
          { id: 'turns', name: 'Turn Signals', score: 95, trend: 'up', icon: Navigation, color: 'emerald', description: 'Signaling before turns' },
          { id: 'focus', name: 'Focus Time', score: 82, trend: 'stable', icon: Timer, color: 'blue', description: 'Minimal phone distractions' },
        ])
        setOrionTips([
          { id: '1', metric: 'braking', tip: "Try starting to brake a bit earlier. This gives you more control and is easier on your passengers!", priority: 'high' },
          { id: '2', metric: 'focus', tip: "Great job staying focused! Keep your phone mounted for hands-free navigation.", priority: 'medium' },
          { id: '3', metric: 'speed', tip: "You're doing awesome with speed limits! Keep it up for bonus gems.", priority: 'low' },
        ])
      }
    } catch (e) {
      setOverallScore(87)
      setMetrics([
        { id: 'speed', name: 'Speed Compliance', score: 92, trend: 'up', icon: Gauge, color: 'emerald', description: 'Staying within speed limits' },
        { id: 'braking', name: 'Smooth Braking', score: 78, trend: 'down', icon: Car, color: 'amber', description: 'Gradual, safe braking' },
        { id: 'acceleration', name: 'Smooth Acceleration', score: 85, trend: 'stable', icon: TrendingUp, color: 'blue', description: 'Gradual speed increases' },
        { id: 'following', name: 'Following Distance', score: 90, trend: 'up', icon: Eye, color: 'emerald', description: 'Safe distance from other cars' },
        { id: 'turns', name: 'Turn Signals', score: 95, trend: 'up', icon: Navigation, color: 'emerald', description: 'Signaling before turns' },
        { id: 'focus', name: 'Focus Time', score: 82, trend: 'stable', icon: Timer, color: 'blue', description: 'Minimal phone distractions' },
      ])
      setOrionTips([
        { id: '1', metric: 'braking', tip: "Try starting to brake a bit earlier. This gives you more control and is easier on your passengers!", priority: 'high' },
        { id: '2', metric: 'focus', tip: "Great job staying focused! Keep your phone mounted for hands-free navigation.", priority: 'medium' },
        { id: '3', metric: 'speed', tip: "You're doing awesome with speed limits! Keep it up for bonus gems.", priority: 'low' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const speakTip = (tip: OrionTip) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(tip.tip)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      setSpeakingTip(tip.id)
      utterance.onend = () => setSpeakingTip(null)
      window.speechSynthesis.speak(utterance)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30'
    if (score >= 70) return 'from-amber-500/20 to-amber-600/20 border-amber-500/30'
    return 'from-red-500/20 to-red-600/20 border-red-500/30'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="text-emerald-400" size={14} />
    if (trend === 'down') return <TrendingDown className="text-red-400" size={14} />
    return <div className="w-3 h-0.5 bg-slate-400 rounded" />
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-l-red-500 bg-red-500/10'
    if (priority === 'medium') return 'border-l-amber-500 bg-amber-500/10'
    return 'border-l-emerald-500 bg-emerald-500/10'
  }

  if (!isOpen) return null

  // Non-premium gate - theme-aware
  if (!isPremium) {
    return (
      <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-4`} onClick={onClose}>
        <div className={`w-full max-w-md ${modalBg} rounded-2xl overflow-hidden shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
            <Zap className="text-white mx-auto mb-3" size={40} />
            <h2 className="text-white font-bold text-xl mb-2">Premium Feature</h2>
            <p className="text-white/90 text-sm">Unlock detailed driving insights and personalized tips from Orion</p>
          </div>
          <div className={`p-6 space-y-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
            <div className="space-y-2">
              {['Detailed driving score breakdown', 'Personalized improvement tips', 'Voice coaching from Orion', 'Track progress over time'].map((feature, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${textMuted}`}>
                  <CheckCircle className="text-emerald-500" size={16} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg"
              data-testid="upgrade-premium-btn"
            >
              Upgrade to Premium
            </button>
            <button onClick={onClose} className={`w-full ${textMuted} text-sm py-2`}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-4`} onClick={onClose}>
      <div className={`w-full max-w-md ${modalBg} rounded-2xl overflow-hidden animate-scale-in shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
        {/* Header - theme-aware */}
        <div className={isLight ? 'bg-gradient-to-r from-blue-500 to-indigo-500 p-4' : 'bg-gradient-to-r from-blue-600 to-indigo-600 p-4'}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Driving Score</h2>
              <span className={isLight ? 'bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full' : 'bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full'}>PREMIUM</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30" data-testid="driving-score-close">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Overall Score Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.25)" strokeWidth="8" fill="none" />
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke="url(#scoreGradient)" 
                  strokeWidth="8" 
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${overallScore * 3.52} 352`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{overallScore}</span>
                <span className="text-white/80 text-xs">Overall Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid - theme-aware */}
        <div className={`p-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
          <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${textPrimary}`}>
            <Gauge size={14} className="text-blue-500" /> Score Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(metric => {
              const IconComponent = typeof metric.icon === 'function' ? metric.icon : Gauge
              return (
                <div 
                  key={metric.id}
                  className={`bg-gradient-to-r ${getScoreBg(metric.score)} border rounded-xl p-3 ${isLight ? 'border-slate-200' : 'border-transparent'}`}
                  data-testid={`metric-${metric.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <IconComponent size={14} className={getScoreColor(metric.score)} />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${getScoreColor(metric.score)}`}>{metric.score}</p>
                  <p className={`text-xs font-medium ${textPrimary}`}>{metric.name}</p>
                  <p className={`text-[10px] ${textMuted}`}>{metric.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Orion Tips - theme-aware */}
        <div className={`px-4 pb-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
          <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${textPrimary}`}>
            <MessageCircle size={14} className="text-purple-500" /> Tips from Orion
          </h3>
          <div className="space-y-2">
            {orionTips.map(tip => (
              <div 
                key={tip.id}
                className={`border-l-4 ${getPriorityColor(tip.priority)} rounded-r-xl p-3 flex items-start gap-3 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800/50'}`}
                data-testid={`tip-${tip.id}`}
              >
                <div className="flex-1">
                  <p className={`text-sm ${textPrimary}`}>{tip.tip}</p>
                  <p className={`text-[10px] mt-1 capitalize ${textMuted}`}>
                    {tip.priority} priority • {tip.metric}
                  </p>
                </div>
                <button 
                  onClick={() => speakTip(tip)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    speakingTip === tip.id 
                      ? 'bg-purple-500 animate-pulse' 
                      : isLight ? 'bg-slate-200 hover:bg-slate-300' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                  data-testid={`speak-tip-${tip.id}`}
                >
                  <Volume2 size={14} className={isLight ? 'text-slate-700' : 'text-white'} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - theme-aware */}
        <div className={`p-3 border-t ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/80'}`}>
          <p className={`text-center text-xs ${textMuted}`}>
            Score updates after each trip • Keep driving safely! 🚗
          </p>
        </div>
      </div>
    </div>
  )
}
