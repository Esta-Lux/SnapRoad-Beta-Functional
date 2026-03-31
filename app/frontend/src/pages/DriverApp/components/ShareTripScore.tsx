import { useState, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, Download, Twitter, Instagram, Copy, Check, Gem, Shield, Route, Clock, Zap } from 'lucide-react'

interface TripSummary {
  distance: number
  duration: number
  safety_score: number
  gems_earned: number
  xp_earned: number
  origin: string
  destination: string
  date: string
  is_safe_drive: boolean
}

interface ShareTripScoreProps {
  isOpen: boolean
  onClose: () => void
  /** Backend may return a partial trip summary; we coerce fields when rendering. */
  tripData: TripSummary | Record<string, unknown> | null
  userName: string
  userLevel: number
}

export default function ShareTripScore({ isOpen, onClose, tripData, userName, userLevel }: ShareTripScoreProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const backdrop = isLight ? 'bg-black/50' : 'bg-black/90'
  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const statCardBg = isLight ? 'bg-slate-100' : 'bg-slate-800/50'
  const copyBtnBg = copied ? 'bg-emerald-500 text-white' : isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-white'
  const downloadBtnBg = isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'

  if (!isOpen || !tripData) return null

  const t = tripData as TripSummary

  const shareText = `🚗 Just completed a trip with SnapRoad!\n\n` +
    `📍 ${t.origin} → ${t.destination}\n` +
    `🛡️ Safety Score: ${t.safety_score}\n` +
    `💎 +${t.gems_earned} gems earned\n` +
    `⭐ +${t.xp_earned} XP\n\n` +
    `Drive safe with #SnapRoad 🚀`

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }

  const handleDownloadImage = async () => {
    // In a real app, this would use html2canvas or similar to capture the card
    // For now, we'll just copy the text
    handleCopyText()
  }

  const score = Number(t.safety_score) || 0
  const scoreColor = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex flex-col items-center justify-center p-4`}>
      <button 
        onClick={onClose}
        className={`absolute top-4 right-4 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'}`}
        data-testid="share-close"
      >
        <X size={24} />
      </button>

      <div 
        ref={cardRef}
        className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border ${cardBg}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-20 translate-y-20" />
          </div>
          
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/snaproad-logo.png" alt="SnapRoad" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <span className="text-white/80 text-sm font-medium">SnapRoad</span>
            </div>
            <h2 className="text-white font-bold text-xl">Trip Complete!</h2>
          </div>
        </div>

        <div className={`px-6 py-4 border-b ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <Route className="text-blue-500" size={20} />
            <div className="flex-1">
              <p className={`font-medium ${textPrimary}`}>{t.origin}</p>
              <p className={`text-sm ${textMuted}`}>to {t.destination}</p>
            </div>
          </div>
        </div>

        {/* Safety Score - Big Display */}
        <div className="p-6 text-center">
          <div className="relative inline-block mb-4">
            <svg className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="#334155" strokeWidth="8" fill="none" />
              <circle 
                cx="64" cy="64" r="56" 
                stroke={score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" 
                fill="none" 
                strokeDasharray={`${((Number(t.safety_score) || 0) / 100) * 352} 352`} 
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>{Number(t.safety_score) || 0}</span>
              <span className="text-slate-400 text-xs">Safety Score</span>
            </div>
          </div>

          {t.is_safe_drive && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Shield size={16} />
              Safe Drive!
            </div>
          )}
        </div>

        <div className="px-6 pb-6 grid grid-cols-3 gap-3">
          <div className={`${statCardBg} rounded-xl p-3 text-center border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <Route size={18} className="text-blue-500 mx-auto mb-1" />
            <p className={`font-bold ${textPrimary}`}>{(Number(t.distance) || 0).toFixed(1)}</p>
            <p className={`text-xs ${textMuted}`}>miles</p>
          </div>
          <div className={`${statCardBg} rounded-xl p-3 text-center border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <Clock size={18} className="text-purple-500 mx-auto mb-1" />
            <p className={`font-bold ${textPrimary}`}>{Number(t.duration) || 0}</p>
            <p className={`text-xs ${textMuted}`}>mins</p>
          </div>
          <div className={`${statCardBg} rounded-xl p-3 text-center border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
            <Gem size={18} className="text-cyan-500 mx-auto mb-1" />
            <p className={`font-bold ${textPrimary}`}>+{Number(t.gems_earned) || 0}</p>
            <p className={`text-xs ${textMuted}`}>gems</p>
          </div>
        </div>

        {/* XP Earned */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-blue-400" size={18} />
              <span className="text-blue-300 text-sm">XP Earned</span>
            </div>
            <span className="text-white font-bold">+{Number(tripData.xp_earned) ?? 0}</span>
          </div>
        </div>

        <div className={`px-6 pb-6 flex items-center justify-between border-t pt-4 ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
          <div>
            <p className={`font-medium ${textPrimary}`}>{userName}</p>
            <p className={`text-xs ${textMuted}`}>Level {userLevel}</p>
          </div>
          <p className={`text-xs ${textMuted}`}>{t.date}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 w-full max-w-sm">
        <div className="flex gap-3">
          <button
            onClick={handleShareTwitter}
            className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            data-testid="share-twitter"
          >
            <Twitter size={18} />
            Twitter
          </button>
          <button
            onClick={handleCopyText}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            data-testid="share-instagram"
          >
            <Instagram size={18} />
            Instagram
          </button>
        </div>

        <button
          onClick={handleCopyText}
          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${copyBtnBg}`}
          data-testid="copy-text"
        >
          {copied ? (
            <>
              <Check size={18} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={18} />
              Copy Text
            </>
          )}
        </button>

        <button
          onClick={handleDownloadImage}
          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${downloadBtnBg}`}
          data-testid="download-image"
        >
          <Download size={18} />
          Save as Image
        </button>
      </div>
    </div>
  )
}
