import { useState, useEffect } from 'react'
import { Trophy, Medal, MapPin, ChevronDown, Shield, Crown, X, Gem, Zap, Clock, Calendar, TrendingUp, Swords } from 'lucide-react'
import ChallengeModal from './ChallengeModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  safety_score: number
  gems: number
  level: number
  state: string
  badges_count: number
  total_miles: number
  is_premium: boolean
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userGems?: number
}

type TimeFilter = 'all_time' | 'weekly' | 'monthly'

export default function Leaderboard({ isOpen, onClose, userId, userGems = 0 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedState, setSelectedState] = useState<string>('OH') // Default to Ohio
  const [states, setStates] = useState<string[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myData, setMyData] = useState<any>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all_time')
  const [loading, setLoading] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard()
    }
  }, [isOpen, selectedState, timeFilter])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      let url = `${API_URL}/api/leaderboard?limit=50`
      if (selectedState) url += `&state=${selectedState}`
      if (timeFilter !== 'all_time') url += `&time_filter=${timeFilter}`
      
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setLeaderboard(data.data)
        setMyRank(data.my_rank)
        setMyData(data.my_data)
        setTotalUsers(data.total_users)
        if (data.states) setStates(data.states)
      }
    } catch (e) {
      console.log('Could not load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />
    if (rank === 2) return <Medal className="text-slate-300" size={18} />
    if (rank === 3) return <Medal className="text-amber-600" size={18} />
    return <span className="text-slate-400 font-bold text-sm">#{rank}</span>
  }

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-gradient-to-r from-blue-600/30 to-blue-700/30 border-2 border-blue-500'
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border border-slate-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-600/30'
    return 'bg-slate-800/50 border border-slate-700/50'
  }

  const formatGems = (gems: number) => {
    if (gems >= 1000000) return `${(gems / 1000000).toFixed(1)}M`
    if (gems >= 1000) return `${(gems / 1000).toFixed(1)}K`
    return gems.toString()
  }

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'weekly': return 'This Week'
      case 'monthly': return 'This Month'
      default: return 'All Time'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-300" size={20} />
              <h2 className="text-white font-bold text-lg">Leaderboard</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center" data-testid="leaderboard-close">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex gap-2 mb-3">
            {/* State Selector */}
            <div className="relative flex-1">
              <button 
                onClick={() => setShowStateDropdown(!showStateDropdown)}
                className="w-full bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-white text-sm"
                data-testid="state-filter"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{selectedState || 'All States'}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showStateDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-xl max-h-48 overflow-auto z-10 shadow-xl">
                  <button 
                    onClick={() => { setSelectedState(''); setShowStateDropdown(false) }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 text-sm"
                    data-testid="state-all"
                  >
                    All States
                  </button>
                  {states.map(state => (
                    <button 
                      key={state} 
                      onClick={() => { setSelectedState(state); setShowStateDropdown(false) }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center justify-between ${selectedState === state ? 'text-blue-400 bg-slate-700/50' : 'text-white'}`}
                      data-testid={`state-${state}`}
                    >
                      <span>{state}</span>
                      {state === 'OH' && <span className="text-xs text-purple-400">⭐ Focus</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Filter */}
            <div className="flex bg-white/10 rounded-xl p-1">
              {[
                { value: 'all_time', icon: TrendingUp, label: 'All' },
                { value: 'weekly', icon: Clock, label: 'Week' },
                { value: 'monthly', icon: Calendar, label: 'Month' },
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value as TimeFilter)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                    timeFilter === filter.value
                      ? 'bg-white text-purple-600'
                      : 'text-white/70 hover:text-white'
                  }`}
                  data-testid={`time-${filter.value}`}
                >
                  <filter.icon size={12} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* My Rank Card */}
          {myRank && myData && (
            <div className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-xs">Your Ranking {selectedState ? `in ${selectedState}` : 'Overall'}</span>
                <span className="text-yellow-300 font-bold text-lg">#{myRank}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Shield size={14} className="text-emerald-400" />
                    <span className="text-white font-medium">{myData.safety_score}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gem size={14} className="text-cyan-400" />
                    <span className="text-white font-medium">{formatGems(myData.gems)}</span>
                  </div>
                </div>
                <span className="text-white/50 text-xs">of {totalUsers} drivers</span>
              </div>
            </div>
          )}
        </div>

        {/* Column Headers */}
        <div className="px-4 py-2 bg-slate-800/50 flex items-center text-xs text-slate-400 font-medium">
          <span className="w-10 text-center">Rank</span>
          <span className="flex-1 pl-12">Driver</span>
          <span className="w-16 text-center">Score</span>
          <span className="w-16 text-center">Gems</span>
        </div>

        {/* Leaderboard List */}
        <div className="p-3 max-h-[350px] overflow-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="text-slate-600 mx-auto mb-2" size={32} />
              <p className="text-slate-500 text-sm">No drivers found</p>
              <p className="text-slate-600 text-xs mt-1">Try a different filter</p>
            </div>
          ) : (
            leaderboard.map(entry => (
              <div 
                key={entry.id} 
                data-testid={`leaderboard-${entry.id}`}
                className={`rounded-xl p-3 flex items-center gap-2 transition-all ${getRankBg(entry.rank, entry.id === userId)}`}
              >
                {/* Rank */}
                <div className="w-10 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                    {entry.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  {entry.is_premium && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <Zap size={10} className="text-amber-900" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate flex items-center gap-1">
                    {entry.name}
                    {entry.id === userId && <span className="text-blue-400 text-xs">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Lvl {entry.level}</span>
                    <span>•</span>
                    <span>{entry.state}</span>
                    <span>•</span>
                    <span>{entry.badges_count} 🎖️</span>
                  </div>
                </div>

                {/* Safety Score */}
                <div className="w-16 text-center">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
                    entry.safety_score >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                    entry.safety_score >= 70 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    <Shield size={12} />
                    <span className="font-bold text-sm">{entry.safety_score}</span>
                  </div>
                </div>

                {/* Gems */}
                <div className="w-16 text-center">
                  <div className="flex items-center justify-center gap-1 text-cyan-400">
                    <Gem size={12} />
                    <span className="font-medium text-sm">{formatGems(entry.gems)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <p className="text-center text-slate-500 text-xs">
            Ranked by Safety Score • {getTimeFilterLabel()} • {selectedState ? `${selectedState} drivers` : 'All drivers'}
          </p>
        </div>
      </div>
    </div>
  )
}
