import { useState, useEffect } from 'react'
import { Swords, Trophy, X, Gem, Shield, TrendingUp, Award, Crown, Flame, Star, Medal } from 'lucide-react'
import api from '@/services/api'

interface Challenge {
  id: string
  opponent_name: string
  stake: number
  duration_hours: number
  status: 'pending' | 'active' | 'won' | 'lost' | 'draw' | 'completed' | 'cancelled'
  raw_status?: string
  can_accept?: boolean
  pending_outgoing?: boolean
  your_score: number
  opponent_score: number
  created_at: string
  ends_at: string
}

interface ChallengeStats {
  total_challenges: number
  wins: number
  losses: number
  draws?: number
  win_rate: number
  total_gems_won: number
  total_gems_lost: number
  current_streak: number
  best_streak: number
}

interface ChallengeBadge {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  progress?: number
  total?: number
}

interface ChallengeHistoryProps {
  isOpen: boolean
  onClose: () => void
  onGemsUpdated?: (gems: number) => void
}

const CHALLENGE_BADGES: ChallengeBadge[] = [
  { id: 'first_win', name: 'First Victory', description: 'Win your first challenge', icon: 'trophy', unlocked: false },
  { id: 'win_streak_3', name: 'Hot Streak', description: 'Win 3 challenges in a row', icon: 'flame', unlocked: false },
  { id: 'win_streak_5', name: 'On Fire', description: 'Win 5 challenges in a row', icon: 'fire', unlocked: false },
  { id: 'total_wins_10', name: 'Champion', description: 'Win 10 total challenges', icon: 'crown', unlocked: false, progress: 0, total: 10 },
  { id: 'total_wins_25', name: 'Legend', description: 'Win 25 total challenges', icon: 'star', unlocked: false, progress: 0, total: 25 },
  { id: 'gems_earned_1k', name: 'Gem Collector', description: 'Earn 1,000 gems from challenges', icon: 'gem', unlocked: false, progress: 0, total: 1000 },
  { id: 'perfect_score', name: 'Perfect Driver', description: 'Win with 100 safety score', icon: 'shield', unlocked: false },
  { id: 'comeback_king', name: 'Comeback King', description: 'Win after being behind at halftime', icon: 'trending', unlocked: false },
]

const BADGE_ICONS: Record<string, any> = {
  trophy: Trophy,
  flame: Flame,
  fire: Flame,
  crown: Crown,
  star: Star,
  gem: Gem,
  shield: Shield,
  trending: TrendingUp,
}

export default function ChallengeHistory({ isOpen, onClose, onGemsUpdated }: ChallengeHistoryProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [stats, setStats] = useState<ChallengeStats | null>(null)
  const [badges, setBadges] = useState<ChallengeBadge[]>(CHALLENGE_BADGES)
  const [activeTab, setActiveTab] = useState<'history' | 'badges'>('history')
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadChallengeData()
    }
  }, [isOpen])

  const loadChallengeData = async () => {
    setLoading(true)
    try {
      const res = await api.getFriendChallengeHistory(100)
      if (!res.success || !res.data) {
        setChallenges([])
        setStats(null)
        setBadges(CHALLENGE_BADGES)
        return
      }
      const body = res.data
      const payload = body.data
      if (body.success && payload) {
        setChallenges((payload.challenges as Challenge[]) || [])
        setStats((payload.stats as ChallengeStats) ?? null)
        if (payload.badges) setBadges(payload.badges as ChallengeBadge[])
      } else {
        setChallenges([])
        setStats(null)
        setBadges(CHALLENGE_BADGES)
      }
    } catch {
      setChallenges([])
      setStats(null)
      setBadges(CHALLENGE_BADGES)
    } finally {
      setLoading(false)
    }
  }

  const acceptChallenge = async (challengeId: string) => {
    setAcceptingId(challengeId)
    try {
      const res = await api.acceptFriendChallenge(challengeId)
      if (!res.success) {
        window.alert(res.error || 'Could not accept this challenge.')
        return
      }
      const envelope = res.data as { data?: { opponent_gems_remaining?: number } } | undefined
      const rem = envelope?.data?.opponent_gems_remaining
      if (typeof rem === 'number' && Number.isFinite(rem)) {
        onGemsUpdated?.(Math.max(0, Math.floor(rem)))
      }
      await loadChallengeData()
    } catch {
      window.alert('Something went wrong. Try again.')
    } finally {
      setAcceptingId(null)
    }
  }

  const getStatusColor = (challenge: Challenge) => {
    const raw = challenge.raw_status ?? challenge.status
    if (raw === 'pending' && challenge.can_accept) return 'text-amber-700 bg-amber-100'
    if (raw === 'pending' && challenge.pending_outgoing) return 'text-slate-500 bg-slate-100'
    switch (challenge.status) {
      case 'won': return 'text-emerald-400 bg-emerald-500/20'
      case 'lost': return 'text-red-400 bg-red-500/20'
      case 'draw': return 'text-amber-400 bg-amber-500/20'
      case 'active': return 'text-blue-400 bg-blue-500/20'
      case 'completed': return 'text-slate-400 bg-slate-500/20'
      case 'cancelled': return 'text-slate-400 bg-slate-500/20'
      case 'pending': return 'text-slate-500 bg-slate-100'
      default: return 'text-slate-400 bg-slate-500/20'
    }
  }

  const getStatusLabel = (challenge: Challenge) => {
    const raw = challenge.raw_status ?? challenge.status
    if (raw === 'pending' && challenge.can_accept) return 'Needs you'
    if (raw === 'pending' && challenge.pending_outgoing) return 'Waiting'
    switch (challenge.status) {
      case 'won': return 'Victory'
      case 'lost': return 'Defeat'
      case 'draw': return 'Draw'
      case 'active': return 'In Progress'
      case 'completed': return 'Finished'
      case 'cancelled': return 'Cancelled'
      default: return 'Pending'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Swords className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Challenge History</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30" data-testid="challenge-history-close">
              <X className="text-white" size={16} />
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/20 rounded-xl p-2 text-center backdrop-blur-sm">
                <p className="text-white text-lg font-bold">{stats.wins}</p>
                <p className="text-white/80 text-[10px]">Wins</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2 text-center backdrop-blur-sm">
                <p className="text-white text-lg font-bold">{stats.losses}</p>
                <p className="text-white/80 text-[10px]">Losses</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2 text-center backdrop-blur-sm">
                <p className="text-emerald-200 text-lg font-bold">{stats.win_rate}%</p>
                <p className="text-white/80 text-[10px]">Win Rate</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2 text-center backdrop-blur-sm">
                <p className="text-amber-200 text-lg font-bold flex items-center justify-center gap-0.5">
                  <Gem size={12} />{stats.total_gems_won - stats.total_gems_lost}
                </p>
                <p className="text-white/80 text-[10px]">Net Gems</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {[
            { id: 'history', label: 'History', icon: Swords },
            { id: 'badges', label: 'Badges', icon: Award },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'history' | 'badges')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-slate-500'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[350px] overflow-auto bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : activeTab === 'history' ? (
            <div className="p-3 space-y-2">
              {challenges.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl mx-2">
                  <Swords className="text-slate-300 mx-auto mb-2" size={32} />
                  <p className="text-slate-600 text-sm">No challenges yet</p>
                  <p className="text-slate-500 text-xs">Challenge friends from Friends Hub.</p>
                </div>
              ) : (
                challenges.map(challenge => (
                  <div
                    key={challenge.id}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
                    data-testid={`challenge-history-${challenge.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(challenge)}`}>
                          {challenge.status === 'won' ? <Trophy size={14} /> : 
                           challenge.status === 'lost' ? <X size={14} /> : 
                           challenge.status === 'draw' ? <Award size={14} /> :
                           challenge.can_accept ? <Swords size={14} className="text-amber-600" /> :
                           <Swords size={14} />}
                        </div>
                        <div>
                          <p className="text-slate-900 text-sm font-medium">vs {challenge.opponent_name}</p>
                          <p className="text-slate-500 text-[10px]">
                            {challenge.duration_hours}h challenge
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(challenge)}`}>
                        {getStatusLabel(challenge)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          You: <span className={challenge.your_score > challenge.opponent_score ? 'text-emerald-600 font-medium' : 'text-slate-600'}>{challenge.your_score}</span>
                        </span>
                        <span className="text-slate-500">
                          Them: <span className={challenge.opponent_score > challenge.your_score ? 'text-red-500 font-medium' : 'text-slate-600'}>{challenge.opponent_score}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Gem size={12} className={
                          challenge.status === 'won' ? 'text-emerald-500' :
                          challenge.status === 'lost' ? 'text-red-500' : 'text-slate-400'
                        } />
                        <span className={
                          challenge.status === 'won' ? 'text-emerald-600 font-medium' :
                          challenge.status === 'lost' ? 'text-red-600 font-medium' :
                          'text-slate-500 font-medium'
                        }>
                          {challenge.status === 'won' ? `+${challenge.stake}` :
                           challenge.status === 'lost' ? `-${challenge.stake}` :
                           challenge.stake > 0 ? `${challenge.stake} staked` : '—'}
                        </span>
                      </div>
                    </div>
                    {challenge.can_accept && (challenge.raw_status ?? challenge.status) === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => void acceptChallenge(challenge.id)}
                        disabled={acceptingId === challenge.id}
                        className="mt-3 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                        data-testid={`challenge-accept-${challenge.id}`}
                      >
                        {acceptingId === challenge.id ? 'Accepting…' : 'Accept challenge'}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-3 grid grid-cols-2 gap-2">
              {Array.isArray(badges) ? badges.map(badge => {
                const Icon = BADGE_ICONS[badge.icon] || Medal
                return (
                  <div
                    key={badge.id}
                    className={`rounded-xl p-3 border shadow-sm ${
                      badge.unlocked
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-slate-200'
                    }`}
                    data-testid={`badge-${badge.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        badge.unlocked ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        <Icon size={16} className={badge.unlocked ? 'text-amber-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${badge.unlocked ? 'text-slate-900' : 'text-slate-600'}`}>
                          {badge.name}
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{badge.description}</p>
                      </div>
                    </div>
                    {badge.progress !== undefined && badge.total && !badge.unlocked && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-right mt-0.5">
                          {badge.progress}/{badge.total}
                        </p>
                      </div>
                    )}
                  </div>
                )
              }) : null}
            </div>
          )}
        </div>

        {stats && stats.current_streak > 0 && (
          <div className="p-3 border-t border-slate-200 bg-amber-50">
            <div className="flex items-center justify-center gap-2">
              <Flame className="text-orange-500" size={16} />
              <span className="text-orange-700 text-sm font-medium">
                {stats.current_streak} Win Streak!
              </span>
              <span className="text-slate-500 text-xs">
                (Best: {stats.best_streak})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
