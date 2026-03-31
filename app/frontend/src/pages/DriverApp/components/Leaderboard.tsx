import { useState, useEffect } from 'react'
import { Trophy, Medal, MapPin, ChevronDown, Shield, Crown, X, Gem, Zap, Calendar, TrendingUp, Swords, Star, Users, Award } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
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
  challenges_participated?: number
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
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedState, setSelectedState] = useState<string>('all')
  const [states, setStates] = useState<string[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myData, setMyData] = useState<any>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly')
  const [loading, setLoading] = useState(false)
  const [, setTotalUsers] = useState(0)
  const [challengeTarget, setChallengeTarget] = useState<LeaderboardEntry | null>(null)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard()
    }
  }, [isOpen, selectedState, timeFilter])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      let url = `${API_URL}/api/leaderboard?limit=10`
      if (selectedState && selectedState !== 'all') url += `&state=${selectedState}`
      url += `&time_filter=${timeFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success && data.data) {
        const payload = data.data
        const list = Array.isArray(payload.leaderboard) ? payload.leaderboard : Array.isArray(payload) ? payload : []
        setLeaderboard(list)
        setMyRank(payload.my_rank ?? null)
        setMyData(payload.my_data ?? null)
        setTotalUsers(payload.total_drivers ?? payload.total_users ?? 0)
        if (Array.isArray(payload.states)) setStates(payload.states)
      }
    } catch (e) {
      setLeaderboard([])
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
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
        <span className={`font-bold text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>#{rank}</span>
      </div>
    )
  }

  const formatGems = (gems: number | undefined) => {
    if (!gems || gems === 0) return '0'
    if (gems >= 1000000) return `${(gems / 1000000).toFixed(1)}M`
    if (gems >= 1000) return `${(gems / 1000).toFixed(1)}K`
    return gems.toString()
  }

  if (!isOpen) return null

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const textPrimary = isLight ? 'text-slate-800' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'

  return (
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-4 ${isLight ? 'bg-black/50' : 'bg-black/90'}`} onClick={onClose}>
      <div className={`w-full max-w-md max-h-[90vh] ${modalBg} rounded-2xl overflow-hidden animate-scale-in flex flex-col shadow-xl`} onClick={e => e.stopPropagation()}>
        {/* Header */}
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
                  <p className="text-white/80 text-xs flex items-center gap-1">
                    <Users size={12} />
                    Top 10 by state · Weekly · Ranked by safety score & gems
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
        <div className={`flex-shrink-0 p-3 border-b ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/50 border-slate-700/50'}`}>
          <div className="flex gap-2">
            {/* Time Filter Pills */}
            <div className={`flex-1 flex gap-1 rounded-lg p-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
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
                className={`h-full px-3 rounded-lg flex items-center gap-2 text-xs ${isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                data-testid="state-filter"
              >
                <MapPin size={12} />
                {selectedState === 'all' || !selectedState ? 'All' : selectedState}
                <ChevronDown size={12} className={`transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showStateDropdown && (
                <div className={`absolute top-full right-0 mt-1 w-36 rounded-xl max-h-48 overflow-auto z-20 shadow-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  <button 
                    onClick={() => { setSelectedState('all'); setShowStateDropdown(false) }}
                    className={`w-full px-3 py-2 text-left text-xs ${isLight ? 'hover:bg-slate-100 text-slate-800' : 'text-white hover:bg-slate-700'}`}
                    data-testid="state-all"
                  >
                    All States
                  </button>
                  {states.map(s => (
                    <button 
                      key={s} 
                      onClick={() => { setSelectedState(s); setShowStateDropdown(false) }}
                      className={`w-full px-3 py-2 text-left text-xs ${selectedState === s ? 'text-purple-600 bg-purple-100' : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-slate-700'}`}
                      data-testid={`state-${s}`}
                    >
                      {s}
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
              {/* Top 3 Podium — click to see badges & challenges */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-2 py-4 mb-4">
                  {/* 2nd Place */}
                  <button type="button" onClick={() => leaderboard[1] && setSelectedUser(leaderboard[1])} className="flex flex-col items-center cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center mb-2 border-2 border-slate-300">
                      <span className="text-white font-bold text-lg">{leaderboard[1]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-slate-500 to-slate-400 w-20 h-16 rounded-t-lg flex flex-col items-center justify-center">
                      <Medal className="text-white" size={16} />
                      <span className="text-white text-xs font-bold">2nd</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 truncate w-20 text-center">{leaderboard[1]?.name}</p>
                  </button>

                  {/* 1st Place */}
                  <button type="button" onClick={() => leaderboard[0] && setSelectedUser(leaderboard[0])} className="flex flex-col items-center -mb-4 cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-300 shadow-lg shadow-yellow-500/30">
                      <span className="text-white font-bold text-xl">{leaderboard[0]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-amber-600 to-yellow-400 w-24 h-24 rounded-t-lg flex flex-col items-center justify-center">
                      <Crown className="text-white" size={20} />
                      <span className="text-white text-sm font-bold">1st</span>
                      <span className="text-white/80 text-[10px]">{leaderboard[0]?.safety_score} pts</span>
                    </div>
                    <p className="text-white text-xs mt-1 font-medium">{leaderboard[0]?.name}</p>
                  </button>

                  {/* 3rd Place */}
                  <button type="button" onClick={() => leaderboard[2] && setSelectedUser(leaderboard[2])} className="flex flex-col items-center cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center mb-2 border-2 border-amber-600">
                      <span className="text-white font-bold text-lg">{leaderboard[2]?.name?.charAt(0)}</span>
                    </div>
                    <div className="bg-gradient-to-t from-amber-800 to-amber-600 w-20 h-12 rounded-t-lg flex flex-col items-center justify-center">
                      <Medal className="text-white" size={16} />
                      <span className="text-white text-xs font-bold">3rd</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 truncate w-20 text-center">{leaderboard[2]?.name}</p>
                  </button>
                </div>
              )}

              {/* Rest of the list */}
              {(Array.isArray(leaderboard) ? leaderboard.slice(3) : []).map((entry) => {
                const isCurrentUser = entry.id === userId
                return (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedUser(entry)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedUser(entry)}
                    className={`rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer ${
                      isCurrentUser 
                        ? isLight ? 'bg-blue-50 border border-blue-200' : 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50'
                        : isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    {getRankDisplay(entry.rank)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-blue-600' : textPrimary}`}>
                          {entry.name}
                        </p>
                        {entry.is_premium && <Zap className="text-yellow-400" size={12} />}
                      </div>
                      <div className={`flex items-center gap-3 text-xs ${textMuted}`}>
                        <span className="flex items-center gap-1" title="Safety score">
                          <Shield size={10} />
                          {entry.safety_score}
                        </span>
                        <span className="flex items-center gap-1" title="Challenges">
                          <Swords size={10} />
                          {entry.challenges_participated ?? 0}
                        </span>
                        <span>Lvl {entry.level}</span>
                        {entry.state && <span className={textMuted}>{entry.state}</span>}
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
                          onClick={(e) => { e.stopPropagation(); handleChallengeClick(entry) }}
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

        {/* User detail modal — badges & challenges when clicking a top 10 user */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
            <div
              className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-xl ${isLight ? 'bg-white' : 'bg-slate-800'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {selectedUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${isLight ? 'text-slate-800' : 'text-white'}`}>{selectedUser.name}</h3>
                    <p className={`text-sm ${textMuted}`}>Rank #{selectedUser.rank} · {selectedUser.state || '—'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X size={20} className={textMuted} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className={`rounded-xl p-4 flex items-center gap-4 ${isLight ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Award className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <p className={`font-bold text-xl ${isLight ? 'text-slate-800' : 'text-white'}`}>{selectedUser.badges_count ?? 0}</p>
                    <p className={`text-sm ${textMuted}`}>Badges earned</p>
                  </div>
                </div>
                <div className={`rounded-xl p-4 flex items-center gap-4 ${isLight ? 'bg-slate-100' : 'bg-slate-700/50'}`}>
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Swords className="text-red-500" size={24} />
                  </div>
                  <div>
                    <p className={`font-bold text-xl ${isLight ? 'text-slate-800' : 'text-white'}`}>{selectedUser.challenges_participated ?? 0}</p>
                    <p className={`text-sm ${textMuted}`}>Challenges participated</p>
                  </div>
                </div>
                <div className={`flex gap-3 text-sm ${textMuted}`}>
                  <span className="flex items-center gap-1"><Shield size={14} /> Safety: {selectedUser.safety_score}</span>
                  <span className="flex items-center gap-1"><Gem size={14} /> {formatGems(selectedUser.gems)} gems</span>
                </div>
                {selectedUser.id !== userId && (
                  <button
                    onClick={() => { setChallengeTarget(selectedUser); setSelectedUser(null); setShowChallengeModal(true) }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Swords size={18} /> Challenge
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Challenge Modal */}
        <ChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          opponent={challengeTarget}
          currentUserGems={userGems}
          onChallengeCreated={() => {
            setShowChallengeModal(false)
            loadLeaderboard()
          }}
        />
      </div>
    </div>
  )
}
