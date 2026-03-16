import { useState, useEffect, useMemo } from 'react'
import {
  X, Calendar, MapPin, Clock, Shield, Gem, ChevronRight, TrendingUp,
  Fuel, Leaf, Car, BarChart3, ChevronDown, ChevronUp, Award, Zap, Target
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [trips, setTrips] = useState<Trip[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(30)
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'trips' | 'savings' | 'stats' | 'insights'>('trips')

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

  // Derived analytics for Insights tab
  const insights = useMemo(() => {
    if (trips.length === 0) return null
    const bestTrip = trips.reduce((a, b) => (a.safety_score >= b.safety_score ? a : b))
    const longestTrip = trips.reduce((a, b) => (a.distance_miles >= b.distance_miles ? a : b))
    const shortestTrip = trips.reduce((a, b) => (a.distance_miles <= b.distance_miles ? a : b))
    const routeCount: Record<string, number> = {}
    trips.forEach(t => {
      const key = `${t.origin} → ${t.destination}`
      routeCount[key] = (routeCount[key] || 0) + 1
    })
    const topRoute = Object.entries(routeCount).sort((a, b) => b[1] - a[1])[0]
    const tripsPerWeek = dateRange > 0 ? (trips.length / (dateRange / 7)) : 0
    const totalGems = trips.reduce((s, t) => s + (t.gems_earned || 0), 0)
    return {
      bestTrip,
      longestTrip,
      shortestTrip,
      topRoute: topRoute ? { name: topRoute[0], count: topRoute[1] } : null,
      tripsPerWeek: Math.round(tripsPerWeek * 10) / 10,
      totalGems,
    }
  }, [trips, dateRange])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20'
    if (score >= 75) return 'text-amber-600 bg-amber-100 dark:text-yellow-400 dark:bg-yellow-500/20'
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20'
  }

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white'
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200'
  const textPrimary = isDark ? 'text-white' : 'text-slate-800'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600'
  const contentBg = isDark ? 'bg-slate-900' : 'bg-slate-50'
  const filterInactive = isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
  const tripCardBg = isDark ? 'bg-slate-800' : 'bg-white'
  const tripCardBorder = isDark ? 'border-slate-700' : 'border-slate-200'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-2" onClick={onClose}>
      <div className={`w-full max-w-md h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-xl ${isDark ? 'bg-slate-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Trip Analytics</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors" data-testid="close-trip-analytics">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Quick Stats */}
          {analytics && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.total_trips}</p>
                <p className="text-white/90 text-[9px]">Trips</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.total_distance_miles.toFixed(0)}</p>
                <p className="text-white/90 text-[9px]">Miles</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{analytics.avg_safety_score}</p>
                <p className="text-white/90 text-[9px]">Avg Score</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-emerald-200 font-bold text-sm">${analytics.money_saved_dollars.toFixed(0)}</p>
                <p className="text-white/90 text-[9px]">Saved</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            {(['trips', 'savings', 'stats', 'insights'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-medium capitalize ${activeTab === tab ? 'bg-white text-blue-600' : 'text-white'}`}
                data-testid={`tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className={`px-4 py-3 flex gap-2 ${isDark ? 'bg-slate-800/50' : 'bg-white border-b border-slate-200'}`}>
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateRange === days ? 'bg-blue-600 text-white' : filterInactive}`}
              data-testid={`range-${days}`}
            >
              {days === 7 ? '7 Days' : days === 30 ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-auto p-4 ${contentBg}`}>
          {loading ? (
            <div className={`text-center py-8 ${textSecondary}`}>Loading analytics...</div>
          ) : (
            <>
              {/* Trips Tab */}
              {activeTab === 'trips' && (
                <div className="space-y-2">
                  {trips.length === 0 ? (
                    <div className="text-center py-8">
                      <Car className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} size={40} />
                      <p className={textSecondary}>No trips recorded yet</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Start driving to see your analytics!</p>
                    </div>
                  ) : (
                    trips.map(trip => (
                      <div key={trip.id} className={`${tripCardBg} rounded-xl overflow-hidden border ${tripCardBorder}`} data-testid={`trip-${trip.id}`}>
                        <button
                          className="w-full p-3 text-left"
                          onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={`flex items-center gap-2 text-xs ${textSecondary}`}>
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
                            <MapPin size={14} className="text-emerald-500 flex-shrink-0" />
                            <span className={`text-sm truncate ${textPrimary}`}>{trip.origin}</span>
                            <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                            <span className={`text-sm truncate ${textPrimary}`}>{trip.destination}</span>
                            {expandedTrip === trip.id ? <ChevronUp size={14} className="text-slate-400 ml-auto" /> : <ChevronDown size={14} className="text-slate-400 ml-auto" />}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className={`flex items-center gap-3 ${textSecondary}`}>
                              <span>{trip.distance_miles.toFixed(1)} mi</span>
                              <span>•</span>
                              <span>{trip.duration_minutes} min</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Gem size={12} />
                              <span>+{Math.round(trip.gems_earned)}</span>
                            </div>
                          </div>
                        </button>
                        {expandedTrip === trip.id && (
                          <div className={`px-3 pb-3 pt-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} grid grid-cols-3 gap-2`}>
                            <div className={`${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-lg p-2 text-center`}>
                              <Fuel className="mx-auto text-amber-500 mb-1" size={14} />
                              <p className={`text-xs font-medium ${textPrimary}`}>{trip.fuel_used_gallons.toFixed(2)} gal</p>
                              <p className="text-[9px] text-slate-500">Fuel Used</p>
                            </div>
                            <div className={`${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-lg p-2 text-center`}>
                              <TrendingUp className="mx-auto text-blue-500 mb-1" size={14} />
                              <p className={`text-xs font-medium ${textPrimary}`}>{trip.avg_speed_mph} mph</p>
                              <p className="text-[9px] text-slate-500">Avg Speed</p>
                            </div>
                            <div className={`${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} rounded-lg p-2 text-center`}>
                              <Gem className="mx-auto text-purple-500 mb-1" size={14} />
                              <p className={`text-xs font-medium ${textPrimary}`}>+{trip.xp_earned}</p>
                              <p className="text-[9px] text-slate-500">XP Earned</p>
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
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 text-center">
                    <Leaf className="mx-auto text-white mb-2" size={32} />
                    <p className="text-emerald-100 text-xs mb-1">Total Savings</p>
                    <p className="text-white text-3xl font-bold">${analytics.money_saved_dollars.toFixed(2)}</p>
                    <p className="text-emerald-200 text-xs mt-2">Based on your efficient driving vs. avg vehicle</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${cardBg} rounded-xl p-4 text-center border ${cardBorder}`}>
                      <Fuel className="mx-auto text-amber-500 mb-2" size={24} />
                      <p className={`font-bold text-lg ${textPrimary}`}>{analytics.fuel_saved_gallons.toFixed(1)}</p>
                      <p className={`text-xs ${textSecondary}`}>Gallons Saved</p>
                    </div>
                    <div className={`${cardBg} rounded-xl p-4 text-center border ${cardBorder}`}>
                      <Leaf className="mx-auto text-emerald-500 mb-2" size={24} />
                      <p className={`font-bold text-lg ${textPrimary}`}>{analytics.co2_saved_lbs.toFixed(0)}</p>
                      <p className={`text-xs ${textSecondary}`}>lbs CO2 Avoided</p>
                    </div>
                  </div>
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`font-medium ${textPrimary}`}>Fuel Efficiency</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">{analytics.avg_mpg} MPG</p>
                    </div>
                    <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${Math.min((analytics.avg_mpg / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <div className={`flex justify-between mt-2 text-xs ${textSecondary}`}>
                      <span>0 MPG</span>
                      <span>Nat'l Avg: 25.4</span>
                      <span>50 MPG</span>
                    </div>
                  </div>
                  <p className={`text-xs text-center ${textSecondary}`}>Savings calculated vs. average US vehicle (25.4 MPG)</p>
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && analytics && (
                <div className="space-y-3">
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <p className={`text-xs mb-3 ${textSecondary}`}>Distance & Time</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{analytics.total_distance_miles.toFixed(0)}</p>
                        <p className={`text-xs ${textSecondary}`}>Total Miles</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{analytics.total_duration_hours.toFixed(1)}</p>
                        <p className={`text-xs ${textSecondary}`}>Hours Driven</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <p className={`text-xs mb-3 ${textSecondary}`}>Fuel Consumption</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{analytics.total_fuel_gallons.toFixed(1)}</p>
                        <p className={`text-xs ${textSecondary}`}>Gallons Used</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${textPrimary}`}>{analytics.avg_mpg}</p>
                        <p className={`text-xs ${textSecondary}`}>Avg MPG</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <p className={`text-xs mb-3 ${textSecondary}`}>Safety & Rewards</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.avg_safety_score}</p>
                        <p className={`text-xs ${textSecondary}`}>Avg Safety Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(analytics.total_gems_earned)}</p>
                        <p className={`text-xs ${textSecondary}`}>Gems Earned</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Insights Tab — new */}
              {activeTab === 'insights' && (
                insights ? (
                <div className="space-y-3">
                  <p className={`text-xs font-medium ${textSecondary} mb-2`}>Highlights from the last {dateRange} days</p>
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="text-amber-500" size={18} />
                      <span className={`font-medium ${textPrimary}`}>Best trip</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{insights.bestTrip.origin} → {insights.bestTrip.destination}</p>
                    <p className={`text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400`}>Score {insights.bestTrip.safety_score}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{insights.bestTrip.date} • {insights.bestTrip.distance_miles.toFixed(1)} mi</p>
                  </div>
                  <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="text-blue-500" size={18} />
                      <span className={`font-medium ${textPrimary}`}>Longest trip</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{insights.longestTrip.origin} → {insights.longestTrip.destination}</p>
                    <p className={`text-lg font-bold mt-1 ${textPrimary}`}>{insights.longestTrip.distance_miles.toFixed(1)} mi</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{insights.longestTrip.duration_minutes} min</p>
                  </div>
                  {insights.topRoute && (
                    <div className={`${cardBg} rounded-xl p-4 border ${cardBorder}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="text-purple-500" size={18} />
                        <span className={`font-medium ${textPrimary}`}>Most driven route</span>
                      </div>
                      <p className={`text-sm ${textSecondary} break-words`}>{insights.topRoute.name}</p>
                      <p className={`text-lg font-bold mt-1 text-purple-600 dark:text-purple-400`}>{insights.topRoute.count} trips</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`${cardBg} rounded-xl p-3 text-center border ${cardBorder}`}>
                      <p className={`text-xl font-bold ${textPrimary}`}>{insights.tripsPerWeek}</p>
                      <p className={`text-[10px] ${textSecondary}`}>Trips per week</p>
                    </div>
                    <div className={`${cardBg} rounded-xl p-3 text-center border ${cardBorder}`}>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{Math.round(insights.totalGems)}</p>
                      <p className={`text-[10px] ${textSecondary}`}>Gems this period</p>
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className={`mx-auto mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} size={40} />
                    <p className={textSecondary}>No data yet</p>
                    <p className="text-xs text-slate-500 mt-1">Complete a few trips to see insights.</p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
