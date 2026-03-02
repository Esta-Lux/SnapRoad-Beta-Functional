import { useState, useRef } from 'react'
import { X, Share2, Download, Twitter, Instagram, Copy, Check, Gem, Shield, Route, Clock, Zap } from 'lucide-react'

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
  tripData: TripSummary | null
  userName: string
  userLevel: number
}

export default function ShareTripScore({ isOpen, onClose, tripData, userName, userLevel }: ShareTripScoreProps) {
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !tripData) return null

  const shareText = `🚗 Just completed a trip with SnapRoad!\n\n` +
    `📍 ${tripData.origin} → ${tripData.destination}\n` +
    `🛡️ Safety Score: ${tripData.safety_score}\n` +
    `💎 +${tripData.gems_earned} gems earned\n` +
    `⭐ +${tripData.xp_earned} XP\n\n` +
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

  const scoreColor = tripData.safety_score >= 90 ? 'text-emerald-400' : 
                     tripData.safety_score >= 70 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white"
        data-testid="share-close"
      >
        <X size={24} />
      </button>

      {/* Share Card */}
      <div 
        ref={cardRef}
        className="w-full max-w-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
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

        {/* Route Info */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Route className="text-blue-400" size={20} />
            <div className="flex-1">
              <p className="text-white font-medium">{tripData.origin}</p>
              <p className="text-slate-400 text-sm">to {tripData.destination}</p>
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
                stroke={tripData.safety_score >= 90 ? '#10b981' : tripData.safety_score >= 70 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" 
                fill="none" 
                strokeDasharray={`${(tripData.safety_score / 100) * 352} 352`} 
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>{tripData.safety_score}</span>
              <span className="text-slate-400 text-xs">Safety Score</span>
            </div>
          </div>

          {tripData.is_safe_drive && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Shield size={16} />
              Safe Drive!
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <Route size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold">{tripData.distance.toFixed(1)}</p>
            <p className="text-slate-500 text-xs">miles</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <Clock size={18} className="text-purple-400 mx-auto mb-1" />
            <p className="text-white font-bold">{tripData.duration}</p>
            <p className="text-slate-500 text-xs">mins</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-3 text-center">
            <Gem size={18} className="text-cyan-400 mx-auto mb-1" />
            <p className="text-white font-bold">+{tripData.gems_earned}</p>
            <p className="text-slate-500 text-xs">gems</p>
          </div>
        </div>

        {/* XP Earned */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-blue-400" size={18} />
              <span className="text-blue-300 text-sm">XP Earned</span>
            </div>
            <span className="text-white font-bold">+{tripData.xp_earned}</span>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 pb-6 flex items-center justify-between border-t border-slate-700 pt-4">
          <div>
            <p className="text-white font-medium">{userName}</p>
            <p className="text-slate-400 text-xs">Level {userLevel}</p>
          </div>
          <p className="text-slate-500 text-xs">{tripData.date}</p>
        </div>
      </div>

      {/* Share Buttons */}
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
          className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
            copied 
              ? 'bg-emerald-500 text-white' 
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
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
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
          data-testid="download-image"
        >
          <Download size={18} />
          Save as Image
        </button>
      </div>
    </div>
  )
}
