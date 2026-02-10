import { useState, useEffect } from 'react'
import { Trophy, Medal, MapPin, ChevronDown, Shield, Crown, X, Gem, Zap, Clock, Calendar, TrendingUp, Swords, Star, Users } from 'lucide-react'
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
  const [selectedState, setSelectedState] = useState<string>('OH')
  const [states, setStates] = useState<string[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myData, setMyData] = useState<any>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all_time')
  const [loading, setLoading] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)
  const [challengeTarget, setChallengeTarget] = useState<LeaderboardEntry | null>(null)
  const [showChallengeModal, setShowChallengeModal] = useState(false)

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

  const handleChallengeClick = (entry: LeaderboardEntry) => {
    setChallengeTarget(entry)
    setShowChallengeModal(true)
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return (
      <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
        <Crown className="text-white" size={20} />
      </div>
    )
    if (rank === 2) return (
      <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center">
        <Medal className="text-white" size={18} />
      </div>
    )
    if (rank === 3) return (
      <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
        <Medal className="text-white" size={18} />
      </div>
    )
    return (
      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
        <span className="text-slate-400 font-bold text-sm">#{rank}</span>
      </div>
    )
  }

  const formatGems = (gems: number) => {
    if (gems >= 1000000) return `${(gems / 1000000).toFixed(1)}M`
    if (gems >= 1000) return `${(gems / 1000).toFixed(1)}K`
    return gems.toString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Premium Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 p-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trophy className="text-yellow-300" size={24} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">Leaderboard</h2>
                  <p className="text-white/70 text-xs flex items-center gap-1">
                    <Users size={12} />
                    {totalUsers.toLocaleString()} drivers competing
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                data-testid="leaderboard-close"
              >
                <X className="text-white" size={18} />
              </button>
            </div>

            {/* Your Rank Card */}
            {myData && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {myData.name?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{myData.name}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-yellow-300 font-bold">Rank #{myRank}</span>
                    <span className="text-white/70">{myData.safety_score} pts</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{formatGems(myData.gems || 0)}</p>
                  <p className="text-white/60 text-xs">gems</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 bg-slate-800/50 p-3 border-b border-slate-700/50">
          <div className="flex gap-2">
            {/* Time Filter Pills */}
            <div className="flex-1 flex gap-1 bg-slate-800 rounded-lg p-1">
              {[
                { key: 'all_time', label: 'All Time', icon: Star },
                { key: 'weekly', label: 'Week', icon: Calendar },
                { key: 'monthly', label: 'Month', icon: TrendingUp },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setTimeFilter(f.key as TimeFilter)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                    timeFilter === f.key
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  data-testid={`time-${f.key}`}
                >
                  <f.icon size={12} />
                  {f.label}
                </button>
              ))}
            </div>

            {/* State Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowStateDropdown(!showStateDropdown)}
                className="h-full px-3 bg-slate-800 rounded-lg flex items-center gap-2 text-white text-xs hover:bg-slate-700"
                data-testid="state-filter"
              >
                <MapPin size={12} />
                {selectedState || 'All'}
                <ChevronDown size={12} className={`transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showStateDropdown && (
                <div className="absolute top-full right-0 mt-1 w-36 bg-slate-800 rounded-xl max-h-48 overflow-auto z-20 shadow-xl border border-slate-700">
                  <button 
                    onClick={() => { setSelectedState(''); setShowStateDropdown(false) }}
                    className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 text-xs"
                    data-testid="state-all"
                  >
                    All States
                  </button>
                  {states.map(state => (
                    <button 
                      key={state} 
                      onClick={() => { setSelectedState(state); setShowStateDropdown(false) }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-700 ${selectedState === state ? 'text-purple-400 bg-slate-700/50' : 'text-white'}`}
                      data-testid={`state-${state}`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-2 py-4 mb-4">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center mb-2 border-2 border-slate-300">
                      <span className="text-white font-bold text-lg">{leaderboard[1]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-slate-500 to-slate-400 w-20 h-16 rounded-t-lg flex flex-col items-center justify-center">
                      <Medal className="text-white" size={16} />
                      <span className="text-white text-xs font-bold">2nd</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 truncate w-20 text-center">{leaderboard[1]?.name}</p>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center -mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-300 shadow-lg shadow-yellow-500/30">
                      <span className="text-white font-bold text-xl">{leaderboard[0]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-amber-600 to-yellow-400 w-24 h-24 rounded-t-lg flex flex-col items-center justify-center">
                      <Crown className="text-white" size={20} />
                      <span className="text-white text-sm font-bold">1st</span>
                      <span className="text-white/80 text-[10px]">{leaderboard[0]?.safety_score} pts</span>
                    </div>
                    <p className="text-white text-xs mt-1 font-medium">{leaderboard[0]?.name}</p>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center mb-2 border-2 border-amber-600">
                      <span className="text-white font-bold text-lg">{leaderboard[2]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-amber-800 to-amber-600 w-20 h-12 rounded-t-lg flex flex-col items-center justify-center">
                      <Medal className="text-white" size={16} />
                      <span className="text-white text-xs font-bold">3rd</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 truncate w-20 text-center">{leaderboard[2]?.name}</p>
                  </div>
                </div>
              )}

              {/* Rest of the list */}
              {leaderboard.slice(3).map((entry) => {
                const isCurrentUser = entry.id === userId
                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl p-3 flex items-center gap-3 transition-all ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50' 
                        : 'bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    {getRankDisplay(entry.rank)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                          {entry.name}
                        </p>
                        {entry.is_premium && <Zap className="text-yellow-400" size={12} />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Shield size={10} />
                          {entry.safety_score}
                        </span>
                        <span>Lvl {entry.level}</span>
                        <span className="text-slate-500">{entry.state}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="text-cyan-400 font-bold text-sm flex items-center gap-1">
                          <Gem size={12} />
                          {formatGems(entry.gems)}
                        </p>
                      </div>
                      
                      {!isCurrentUser && (
                        <button
                          onClick={() => handleChallengeClick(entry)}
                          className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center hover:from-red-400 hover:to-orange-400 transition-colors shadow-lg"
                          data-testid={`challenge-${entry.id}`}
                          title={`Challenge ${entry.name}`}
                        >
                          <Swords className="text-white" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Challenge Modal */}
        <ChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          opponent={challengeTarget}
          currentUserGems={userGems}
          onChallengeSuccess={() => {
            setShowChallengeModal(false)
            loadLeaderboard()
          }}
        />
      </div>
    </div>
  )
}
