import { useState, useEffect } from 'react'
import { 
  X, Calendar, MapPin, Clock, Shield, Gem, ChevronRight, TrendingUp, 
  Fuel, DollarSign, Leaf, Car, BarChart3, ChevronDown, ChevronUp
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface Trip {
  id: number
  date: string
  time: string
  origin: string
  destination: string
  distance_miles: number
  duration_minutes: number
  safety_score: number
  gems_earned: number
  xp_earned: number
  fuel_used_gallons: number
  avg_speed_mph: number
}

interface Analytics {
  total_trips: number
  total_distance_miles: number
  total_fuel_gallons: number
  total_duration_hours: number
  avg_safety_score: number
  total_gems_earned: number
  avg_mpg: number
  fuel_saved_gallons: number
  money_saved_dollars: number
  co2_saved_lbs: number
}

interface TripAnalyticsProps {
  isOpen: boolean
  onClose: () => void
}

export default function TripAnalytics({ isOpen, onClose }: TripAnalyticsProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(30)
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'trips' | 'savings' | 'stats'>('trips')

  useEffect(() => {
    if (isOpen) loadData()
  }, [isOpen, dateRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/trips/history/detailed?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        setTrips(data.data.trips || [])
        setAnalytics(data.data.analytics || null)
      }
    } catch (e) {
      console.log('Could not load trip analytics')
    }
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/20'
    if (score >= 75) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-red-400 bg-red-500/20'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Trip Analytics</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center" data-testid="close-trip-analytics">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Quick Stats */}
          {analytics && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.total_trips}</p>
                <p className="text-blue-200 text-[9px]">Trips</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.total_distance_miles.toFixed(0)}</p>
                <p className="text-blue-200 text-[9px]">Miles</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.avg_safety_score}</p>
                <p className="text-blue-200 text-[9px]">Avg Score</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-emerald-300 font-bold text-sm">${analytics.money_saved_dollars.toFixed(0)}</p>
                <p className="text-blue-200 text-[9px]">Saved</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            {(['trips', 'savings', 'stats'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${activeTab === tab ? 'bg-white text-blue-600' : 'text-white'}`}
                data-testid={`tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="px-4 py-2 bg-slate-800/50 flex gap-2">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${dateRange === days ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid={`range-${days}`}
            >
              {days === 7 ? '7 Days' : days === 30 ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading analytics...</div>
          ) : (
            <>
              {/* Trips Tab */}
              {activeTab === 'trips' && (
                <div className="space-y-2">
                  {trips.length === 0 ? (
                    <div className="text-center py-8">
                      <Car className="mx-auto text-slate-600 mb-2" size={40} />
                      <p className="text-slate-400">No trips recorded yet</p>
                      <p className="text-slate-500 text-xs mt-1">Start driving to see your analytics!</p>
                    </div>
                  ) : (
                    trips.map(trip => (
                      <div key={trip.id} className="bg-slate-800 rounded-xl overflow-hidden" data-testid={`trip-${trip.id}`}>
                        <button 
                          className="w-full p-3 text-left"
                          onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                        >
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
                            <MapPin size={14} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-white text-sm truncate">{trip.origin}</span>
                            <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                            <span className="text-white text-sm truncate">{trip.destination}</span>
                            {expandedTrip === trip.id ? <ChevronUp size={14} className="text-slate-400 ml-auto" /> : <ChevronDown size={14} className="text-slate-400 ml-auto" />}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3 text-slate-400">
                              <span>{trip.distance_miles.toFixed(1)} mi</span>
                              <span>•</span>
                              <span>{trip.duration_minutes} min</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400">
                              <Gem size={12} />
                              <span>+{Math.round(trip.gems_earned)}</span>
                            </div>
                          </div>
                        </button>
                        
                        {/* Expanded Details */}
                        {expandedTrip === trip.id && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-700/50 grid grid-cols-3 gap-2">
                            <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                              <Fuel className="mx-auto text-amber-400 mb-1" size={14} />
                              <p className="text-white text-xs font-medium">{trip.fuel_used_gallons.toFixed(2)} gal</p>
                              <p className="text-slate-500 text-[9px]">Fuel Used</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                              <TrendingUp className="mx-auto text-blue-400 mb-1" size={14} />
                              <p className="text-white text-xs font-medium">{trip.avg_speed_mph} mph</p>
                              <p className="text-slate-500 text-[9px]">Avg Speed</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                              <Gem className="mx-auto text-purple-400 mb-1" size={14} />
                              <p className="text-white text-xs font-medium">+{trip.xp_earned}</p>
                              <p className="text-slate-500 text-[9px]">XP Earned</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Savings Tab */}
              {activeTab === 'savings' && analytics && (
                <div className="space-y-4">
                  {/* Fuel Savings Hero */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 text-center">
                    <Leaf className="mx-auto text-white mb-2" size={32} />
                    <p className="text-emerald-100 text-xs mb-1">Total Savings</p>
                    <p className="text-white text-3xl font-bold">${analytics.money_saved_dollars.toFixed(2)}</p>
                    <p className="text-emerald-200 text-xs mt-2">Based on your efficient driving vs. avg vehicle</p>
                  </div>

                  {/* Savings Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 rounded-xl p-4 text-center">
                      <Fuel className="mx-auto text-amber-400 mb-2" size={24} />
                      <p className="text-white font-bold text-lg">{analytics.fuel_saved_gallons.toFixed(1)}</p>
                      <p className="text-slate-400 text-xs">Gallons Saved</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 text-center">
                      <Leaf className="mx-auto text-emerald-400 mb-2" size={24} />
                      <p className="text-white font-bold text-lg">{analytics.co2_saved_lbs.toFixed(0)}</p>
                      <p className="text-slate-400 text-xs">lbs CO2 Avoided</p>
                    </div>
                  </div>

                  {/* Efficiency Rating */}
                  <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-medium">Fuel Efficiency</p>
                      <p className="text-emerald-400 font-bold">{analytics.avg_mpg} MPG</p>
                    </div>
                    <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${Math.min((analytics.avg_mpg / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>0 MPG</span>
                      <span className="text-slate-400">Nat'l Avg: 25.4</span>
                      <span>50 MPG</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-xs text-center">
                    Savings calculated vs. average US vehicle (25.4 MPG)
                  </p>
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && analytics && (
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-3">Distance & Time</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-white text-2xl font-bold">{analytics.total_distance_miles.toFixed(0)}</p>
                        <p className="text-slate-400 text-xs">Total Miles</p>
                      </div>
                      <div>
                        <p className="text-white text-2xl font-bold">{analytics.total_duration_hours.toFixed(1)}</p>
                        <p className="text-slate-400 text-xs">Hours Driven</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-3">Fuel Consumption</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-white text-2xl font-bold">{analytics.total_fuel_gallons.toFixed(1)}</p>
                        <p className="text-slate-400 text-xs">Gallons Used</p>
                      </div>
                      <div>
                        <p className="text-white text-2xl font-bold">{analytics.avg_mpg}</p>
                        <p className="text-slate-400 text-xs">Avg MPG</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-3">Safety & Rewards</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-emerald-400 text-2xl font-bold">{analytics.avg_safety_score}</p>
                        <p className="text-slate-400 text-xs">Avg Safety Score</p>
                      </div>
                      <div>
                        <p className="text-purple-400 text-2xl font-bold">{Math.round(analytics.total_gems_earned)}</p>
                        <p className="text-slate-400 text-xs">Gems Earned</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
