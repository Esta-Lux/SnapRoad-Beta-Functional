import { useState, useEffect } from 'react'
import {
  X, Route, Shield, Filter, MapPin, Clock, ChevronRight
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface RouteData {
  id: string
  route_name: string
  origin: string
  destination: string
  total_trips: number
  total_distance_miles: number
  avg_safety_score: number
  color_intensity: number
  last_traveled?: string | null
  coordinates: { lat: number; lng: number }[]
}

interface RouteHistory3DProps {
  isOpen: boolean
  onClose: () => void
}

export default function RouteHistory3D({ isOpen, onClose }: RouteHistory3DProps) {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'trips' | 'distance' | 'recent'>('trips')
  const [dateRange, setDateRange] = useState(90)
  const [totalStats, setTotalStats] = useState<any>(null)

  useEffect(() => {
    if (isOpen) loadRoutes()
  }, [isOpen, dateRange])

  const loadRoutes = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/routes/history-3d?days=${dateRange}`)
      const data = await res.json()
      if (data.success) {
        const routeList = data.data.routes || []
        setRoutes(routeList)
        const totalMiles = routeList.reduce((sum: number, r: RouteData) => sum + (r.total_distance_miles || 0), 0)
        setTotalStats({
          totalRoutes: data.data.total_unique_routes ?? routeList.length,
          totalTrips: data.data.total_trips ?? routeList.reduce((s: number, r: RouteData) => s + (r.total_trips || 0), 0),
          totalDistance: data.data.total_distance ?? totalMiles
        })
      }
    } catch (e) {
    }
    setLoading(false)
  }

  const sortedRoutes = [...routes].sort((a, b) => {
    if (sortBy === 'trips') return b.total_trips - a.total_trips
    if (sortBy === 'distance') return b.total_distance_miles - a.total_distance_miles
    return (b.last_traveled || '').localeCompare(a.last_traveled || '')
  })

  const selectedRouteData = routes.find(r => r.id === selectedRoute)

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 75) return 'text-blue-400'
    return 'text-amber-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header — keeps brand accent */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Route className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Route History</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors" data-testid="close-route-history">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Stats — white-on-purple for contrast */}
          {totalStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/15 rounded-lg p-2.5 text-center">
                <p className="text-white font-bold text-lg">{totalStats.totalRoutes}</p>
                <p className="text-white/90 text-[10px]">Unique Routes</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2.5 text-center">
                <p className="text-white font-bold text-lg">{totalStats.totalTrips}</p>
                <p className="text-white/90 text-[10px]">Total Trips</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2.5 text-center">
                <p className="text-white font-bold text-lg">{totalStats.totalDistance != null ? Number(totalStats.totalDistance).toFixed(0) : '—'}</p>
                <p className="text-white/90 text-[10px]">Miles</p>
              </div>
            </div>
          )}
        </div>

        {/* Content area — light background aligned with app */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          {/* Selected Route — detailed card */}
          {selectedRouteData && (
            <div className="mx-4 mt-4 mb-2 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Route size={16} className="text-purple-500 flex-shrink-0" />
                <p className="text-slate-800 font-semibold text-sm">{selectedRouteData.route_name}</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-[10px]">From</p>
                    <p className="text-slate-700 break-words">{selectedRouteData.origin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-500 uppercase tracking-wide text-[10px]">To</p>
                    <p className="text-slate-700 break-words">{selectedRouteData.destination}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mt-3 pt-3 border-t border-slate-200">
                <div>
                  <p className="text-slate-800 font-bold">{selectedRouteData.total_trips}</p>
                  <p className="text-slate-500 text-[10px]">Trips</p>
                </div>
                <div>
                  <p className="text-slate-800 font-bold">{selectedRouteData.total_distance_miles.toFixed(1)}</p>
                  <p className="text-slate-500 text-[10px]">Miles</p>
                </div>
                <div>
                  <p className={`font-bold ${getScoreColor(selectedRouteData.avg_safety_score)}`}>{selectedRouteData.avg_safety_score}</p>
                  <p className="text-slate-500 text-[10px]">Safety</p>
                </div>
                <div>
                  {selectedRouteData.last_traveled ? (
                    <>
                      <p className="text-slate-700 font-medium text-[11px]">{selectedRouteData.last_traveled}</p>
                      <p className="text-slate-500 text-[10px]">Last trip</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400">—</p>
                      <p className="text-slate-500 text-[10px]">Last trip</p>
                    </>
                  )}
                </div>
              </div>
              {selectedRouteData.coordinates?.length >= 2 && (
                <p className="text-slate-500 text-[10px] mt-2">Path points: {selectedRouteData.coordinates.length}</p>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="px-4 py-3 flex items-center gap-2 bg-white border-y border-slate-200">
            <Filter size={14} className="text-slate-500" />
            <div className="flex gap-1 flex-1">
              {[
                { key: 'trips', label: 'Most Trips' },
                { key: 'distance', label: 'Distance' },
                { key: 'recent', label: 'Recent' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key as any)}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-colors ${sortBy === opt.key ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-1.5 rounded-lg focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>

          {/* Routes List — detailed */}
          <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
            <p className="text-slate-600 text-xs font-medium px-1 pb-1">Route history ({sortedRoutes.length})</p>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading routes...</div>
            ) : sortedRoutes.length === 0 ? (
              <div className="text-center py-8">
                <Route className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-600">No routes recorded yet</p>
                <p className="text-slate-500 text-xs mt-1">Start driving to build your route history!</p>
              </div>
            ) : (
              sortedRoutes.map((route, index) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route.id === selectedRoute ? null : route.id)}
                  className={`w-full bg-white rounded-xl p-3 text-left transition-all border ${selectedRoute === route.id ? 'ring-2 ring-purple-500 border-purple-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'}`}
                  data-testid={`route-${index}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-slate-500 text-[10px] font-medium">#{index + 1}</span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${getScoreColor(route.avg_safety_score)}`}>
                      <Shield size={10} />
                      {route.avg_safety_score} safety
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-2">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-xs break-words line-clamp-2">{route.origin}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-xs break-words line-clamp-2">{route.destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{route.total_trips} trips</span>
                    <span>{route.total_distance_miles.toFixed(1)} mi</span>
                    {route.last_traveled && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {route.last_traveled}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end mt-1">
                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${selectedRoute === route.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
