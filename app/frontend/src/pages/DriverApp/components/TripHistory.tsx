import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Clock, Shield, Gem, Filter, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface Trip {
  id: number
  date: string
  time: string
  origin: string
  destination: string
  distance: number
  duration: number
  safety_score: number
  gems_earned: number
}

interface TripHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export default function TripHistory({ isOpen, onClose }: TripHistoryProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [stats, setStats] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) loadTrips()
  }, [isOpen, selectedMonth])

  const loadTrips = async () => {
    setLoading(true)
    try {
      const url = selectedMonth 
        ? `${API_URL}/api/trips/history?month=${selectedMonth}` 
        : `${API_URL}/api/trips/history`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        const d = data.data
        setTrips(Array.isArray(d) ? d : Array.isArray(d?.recent_trips) ? d.recent_trips : [])
        setStats(data.stats ?? (d && !Array.isArray(d) ? { total_trips: d.total_trips, total_miles: d.total_miles, avg_safety_score: d.avg_safety_score ?? 0, total_gems_earned: d.total_gems_earned ?? 0 } : null))
      }
    } catch (e) {
      console.log('Could not load trips')
    }
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500 bg-emerald-500/10'
    if (score >= 75) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-red-500 bg-red-500/10'
  }

  const months = [
    { value: '', label: 'All Time' },
    { value: '2025-02', label: 'Feb 2025' },
    { value: '2025-01', label: 'Jan 2025' },
    { value: '2024-12', label: 'Dec 2024' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[85vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-lg">Trip History</h2>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{stats.total_trips}</p>
                <p className="text-blue-200 text-[10px]">Trips</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{(stats.total_miles/1000).toFixed(1)}K</p>
                <p className="text-blue-200 text-[10px]">Miles</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{stats.avg_safety_score}</p>
                <p className="text-blue-200 text-[10px]">Avg Score</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{(stats.total_gems_earned/1000).toFixed(1)}K</p>
                <p className="text-blue-200 text-[10px]">Gems</p>
              </div>
            </div>
          )}

          {/* Month Filter */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {months.map(m => (
              <button key={m.value} onClick={() => setSelectedMonth(m.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedMonth === m.value ? 'bg-white text-blue-600' : 'bg-white/10 text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trips List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No trips found</div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Calendar size={12} />
                    <span>{trip.date}</span>
                    <span>•</span>
                    <span>{trip.time}</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(trip.safety_score)}`}>
                    <Shield size={10} className="inline mr-1" />
                    {trip.safety_score}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-emerald-400" />
                  <span className="text-white text-sm">{trip.origin}</span>
                  <ChevronRight size={14} className="text-slate-500" />
                  <span className="text-white text-sm">{trip.destination}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{trip.distance.toFixed(1)} mi</span>
                    <span>•</span>
                    <span>{trip.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Gem size={12} />
                    <span>+{trip.gems_earned}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
