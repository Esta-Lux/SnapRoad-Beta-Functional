import { useState, useEffect } from 'react'
import { Trophy, Medal, MapPin, ChevronDown, Shield, Crown, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  safety_score: number
  level: number
  state: string
  badges_count: number
}

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export default function Leaderboard({ isOpen, onClose, userId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedState, setSelectedState] = useState<string>('')
  const [states, setStates] = useState<string[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [showStateDropdown, setShowStateDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard()
    }
  }, [isOpen, selectedState])

  const loadLeaderboard = async () => {
    try {
      const url = selectedState 
        ? `${API_URL}/api/leaderboard?state=${selectedState}` 
        : `${API_URL}/api/leaderboard`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setLeaderboard(data.data)
        setMyRank(data.my_rank)
        if (data.states) setStates(data.states)
      }
    } catch (e) {
      console.log('Could not load leaderboard')
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />
    if (rank === 2) return <Medal className="text-slate-300" size={18} />
    if (rank === 3) return <Medal className="text-amber-600" size={18} />
    return <span className="text-slate-400 font-bold text-sm">#{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border border-slate-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-600/30'
    return 'bg-slate-800'
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
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* State Selector */}
          <div className="relative">
            <button onClick={() => setShowStateDropdown(!showStateDropdown)}
              className="w-full bg-white/10 rounded-xl px-4 py-2 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{selectedState || 'All States'}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showStateDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-xl max-h-48 overflow-auto z-10 shadow-xl">
                <button onClick={() => { setSelectedState(''); setShowStateDropdown(false) }}
                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 text-sm">
                  All States
                </button>
                {states.map(state => (
                  <button key={state} onClick={() => { setSelectedState(state); setShowStateDropdown(false) }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 ${selectedState === state ? 'text-blue-400' : 'text-white'}`}>
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* My Rank */}
          {myRank && (
            <div className="mt-3 bg-white/10 rounded-xl p-3 flex items-center justify-between">
              <span className="text-white text-sm">Your Rank</span>
              <span className="text-yellow-300 font-bold text-lg">#{myRank}</span>
            </div>
          )}
        </div>

        {/* Leaderboard List */}
        <div className="p-4 max-h-[400px] overflow-auto space-y-2">
          {leaderboard.map(entry => (
            <div key={entry.id} data-testid={`leaderboard-${entry.id}`}
              className={`rounded-xl p-3 flex items-center gap-3 ${getRankBg(entry.rank)} ${entry.id === userId ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="w-10 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                {entry.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{entry.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Lvl {entry.level}</span>
                  <span>•</span>
                  <span>{entry.state}</span>
                  <span>•</span>
                  <span>{entry.badges_count} 🎖️</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Shield size={14} />
                  <span className="font-bold">{entry.safety_score}</span>
                </div>
                <p className="text-[10px] text-slate-400">Safety Score</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
