import { useState } from 'react'
import { Swords, X, Trophy, Clock, Gem, Shield, Zap, Check, AlertCircle } from 'lucide-react'
import api from '@/services/api'

interface ChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  opponent: {
    id: string
    name: string
    safety_score: number
    level: number
  } | null
  currentUserGems: number
  onChallengeCreated: () => void
}

interface ActiveChallenge {
  id: string
  opponent_name: string
  stake: number
  duration_hours: number
  status: 'pending' | 'active' | 'won' | 'lost'
  your_score: number
  opponent_score: number
  ends_at: string
}

const CHALLENGE_DURATIONS = [
  { hours: 24, label: '24 Hours', description: 'Quick sprint' },
  { hours: 72, label: '3 Days', description: 'Weekend warrior' },
  { hours: 168, label: '1 Week', description: 'Full challenge' },
]

const STAKE_OPTIONS = [
  { amount: 50, label: '50 Gems', risk: 'Low' },
  { amount: 100, label: '100 Gems', risk: 'Medium' },
  { amount: 250, label: '250 Gems', risk: 'High' },
  { amount: 500, label: '500 Gems', risk: 'Extreme' },
]

export default function ChallengeModal({ isOpen, onClose, opponent, currentUserGems, onChallengeCreated }: ChallengeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(24)
  const [selectedStake, setSelectedStake] = useState(50)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSendChallenge = async () => {
    if (!opponent) return
    
    if (currentUserGems < selectedStake) {
      setError("You don't have enough gems for this stake!")
      return
    }

    setSending(true)
    setError(null)

    try {
      const res = await api.createFriendChallenge({
        opponent_id: opponent.id,
        stake: selectedStake,
        duration_hours: selectedDuration,
        challenge_type: 'safest_drive',
      })
      if (!res.success) {
        setError(res.error || 'Failed to create challenge')
        return
      }
      const payload = res.data as { success?: boolean; message?: string; data?: unknown } | undefined
      if (payload?.success === false) {
        setError(typeof payload.message === 'string' ? payload.message : 'Failed to create challenge')
        return
      }
      setSuccess(true)
      setTimeout(() => {
        onChallengeCreated()
        onClose()
        setSuccess(false)
      }, 1500)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen || !opponent) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-gradient-to-r from-red-500 to-orange-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Swords className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Challenge Friend</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors" data-testid="challenge-close">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Opponent Card */}
          <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {opponent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{opponent.name}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/70">Lvl {opponent.level}</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Shield size={12} />
                  <span>{opponent.safety_score}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Challenge</p>
              <p className="text-yellow-300 text-sm font-bold">VS</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {success ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="text-white" size={32} />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Challenge Sent!</h3>
              <p className="text-slate-400 text-sm">Waiting for {opponent.name} to accept...</p>
            </div>
          ) : (
            <>
              {/* Duration Selection */}
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-blue-400" /> Challenge Duration
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {CHALLENGE_DURATIONS.map(duration => (
                    <button
                      key={duration.hours}
                      onClick={() => setSelectedDuration(duration.hours)}
                      className={`p-3 rounded-xl border transition-all ${
                        selectedDuration === duration.hours
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                      data-testid={`duration-${duration.hours}`}
                    >
                      <p className="font-bold text-sm">{duration.label}</p>
                      <p className="text-[10px] opacity-70">{duration.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Selection */}
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Gem size={14} className="text-cyan-400" /> Gems at Stake
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {STAKE_OPTIONS.map(stake => (
                    <button
                      key={stake.amount}
                      onClick={() => setSelectedStake(stake.amount)}
                      disabled={currentUserGems < stake.amount}
                      className={`p-3 rounded-xl border transition-all ${
                        currentUserGems < stake.amount
                          ? 'bg-slate-800/30 border-slate-800 text-slate-600 cursor-not-allowed'
                          : selectedStake === stake.amount
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                      data-testid={`stake-${stake.amount}`}
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Gem size={14} />
                        <span className="font-bold">{stake.label}</span>
                      </div>
                      <p className={`text-[10px] ${
                        stake.risk === 'Low' ? 'text-emerald-400' :
                        stake.risk === 'Medium' ? 'text-amber-400' :
                        stake.risk === 'High' ? 'text-orange-400' : 'text-red-400'
                      }`}>{stake.risk} Risk</p>
                    </button>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2 text-center">
                  Your gems: <span className="text-cyan-400 font-medium">{currentUserGems.toLocaleString()}</span>
                </p>
              </div>

              {/* Challenge Rules */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-sm mb-2">How it works</h3>
                <ul className="space-y-1 text-slate-400 text-xs">
                  <li className="flex items-start gap-2">
                    <Trophy className="text-yellow-400 mt-0.5" size={12} />
                    <span>Highest average Safety Score during challenge wins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Gem className="text-cyan-400 mt-0.5" size={12} />
                    <span>Winner takes all staked gems ({selectedStake * 2} total)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="text-amber-400 mt-0.5" size={12} />
                    <span>Both drivers earn bonus XP regardless of outcome</span>
                  </li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mx-4 mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2">
                  <AlertCircle className="text-red-400" size={16} />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Fixed */}
        {!success && (
          <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/95">
            <button
              onClick={handleSendChallenge}
              disabled={sending || currentUserGems < selectedStake}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                sending || currentUserGems < selectedStake
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/25'
              }`}
              data-testid="send-challenge-btn"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Swords size={18} />
                  Challenge for {selectedStake} Gems
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Active Challenges List Component
export function ActiveChallenges({ challenges, onViewChallenge }: { 
  challenges: ActiveChallenge[]
  onViewChallenge: (challenge: ActiveChallenge) => void 
}) {
  if (challenges.length === 0) return null

  return (
    <div className="p-4 bg-slate-800/50 border-t border-slate-700">
      <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
        <Swords size={14} className="text-red-400" /> Active Challenges
      </h3>
      <div className="space-y-2">
        {challenges.map(challenge => (
          <button
            key={challenge.id}
            onClick={() => onViewChallenge(challenge)}
            className="w-full bg-slate-900/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700 hover:border-slate-600 transition-all"
            data-testid={`challenge-${challenge.id}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              challenge.status === 'active' ? 'bg-amber-500/20' :
              challenge.status === 'won' ? 'bg-emerald-500/20' :
              challenge.status === 'lost' ? 'bg-red-500/20' : 'bg-slate-700'
            }`}>
              <Swords size={18} className={
                challenge.status === 'active' ? 'text-amber-400' :
                challenge.status === 'won' ? 'text-emerald-400' :
                challenge.status === 'lost' ? 'text-red-400' : 'text-slate-400'
              } />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-medium">vs {challenge.opponent_name}</p>
              <p className="text-slate-400 text-xs">
                {challenge.status === 'active' ? 'In Progress' :
                 challenge.status === 'pending' ? 'Awaiting Response' :
                 challenge.status === 'won' ? 'Victory!' : 'Defeated'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-cyan-400 text-sm font-bold flex items-center gap-1">
                <Gem size={12} /> {challenge.stake}
              </p>
              {challenge.status === 'active' && (
                <p className="text-slate-500 text-[10px]">
                  {challenge.your_score} vs {challenge.opponent_score}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
