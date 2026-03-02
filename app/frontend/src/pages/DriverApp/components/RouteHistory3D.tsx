import { useState, useEffect, useRef } from 'react'
import { 
  X, Map, Route, Calendar, Shield, TrendingUp, Filter,
  ChevronDown, ChevronUp, MapPin, Clock, Gem
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
  last_traveled: string | null
  coordinates: { lat: number; lng: number }[]
}

interface RouteHistory3DProps {
  isOpen: boolean
  onClose: () => void
}

// Simple 3D-ish map visualization using CSS transforms
function RouteMap({ routes, selectedRoute, onSelectRoute }: { 
  routes: RouteData[]
  selectedRoute: string | null
  onSelectRoute: (id: string) => void 
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 45, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Center point (Columbus, OH)
  const center = { lat: 39.9612, lng: -82.9988 }
  const scale = 3000 // Pixels per degree

  const latLngToXY = (lat: number, lng: number) => ({
    x: (lng - center.lng) * scale + 150,
    y: (center.lat - lat) * scale + 150
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setRotation(prev => ({
      x: Math.max(20, Math.min(70, prev.x - dy * 0.3)),
      y: prev.y + dx * 0.3
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div 
      ref={mapRef}
      className="w-full h-64 bg-slate-800/50 rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing"
      style={{ perspective: '1000px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="absolute inset-0 transition-transform duration-100"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateZ(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Grid lines for 3D effect */}
        <svg className="absolute inset-0 w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Route paths */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
          {routes.map((route, index) => {
            if (route.coordinates.length < 2) return null
            
            const points = route.coordinates.map(c => latLngToXY(c.lat, c.lng))
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            
            const isSelected = selectedRoute === route.id
            const baseColor = route.avg_safety_score >= 90 ? '#22c55e' : route.avg_safety_score >= 75 ? '#3b82f6' : '#f59e0b'
            const opacity = 0.3 + route.color_intensity * 0.7

            return (
              <g key={route.id}>
                {/* Glow effect */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={baseColor}
                  strokeWidth={isSelected ? 12 : 6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity * 0.3}
                  style={{ filter: 'blur(4px)' }}
                />
                {/* Main path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={baseColor}
                  strokeWidth={isSelected ? 4 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isSelected ? 1 : opacity}
                  className="cursor-pointer transition-all"
                  onClick={() => onSelectRoute(route.id)}
                />
                {/* Start point */}
                <circle
                  cx={points[0]?.x}
                  cy={points[0]?.y}
                  r={isSelected ? 6 : 4}
                  fill={baseColor}
                  opacity={isSelected ? 1 : opacity}
                />
                {/* End point */}
                <circle
                  cx={points[points.length - 1]?.x}
                  cy={points[points.length - 1]?.y}
                  r={isSelected ? 6 : 4}
                  fill={baseColor}
                  stroke="white"
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={isSelected ? 1 : opacity}
                />
              </g>
            )
          })}
        </svg>

        {/* Center marker (current location) */}
        <div 
          className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"
          style={{ 
            left: 'calc(50% - 8px)', 
            top: 'calc(50% - 8px)',
            transform: 'translateZ(20px)'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <p className="text-slate-500 text-[10px]">Drag to rotate view</p>
      </div>
    </div>
  )
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
        setRoutes(data.data.routes || [])
        setTotalStats({
          totalRoutes: data.data.total_unique_routes,
          totalTrips: data.data.total_trips,
          totalDistance: data.data.total_distance
        })
      }
    } catch (e) {
      console.log('Could not load route history')
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="w-full max-w-md h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Map className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Route History</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center" data-testid="close-route-history">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Stats */}
          {totalStats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{totalStats.totalRoutes}</p>
                <p className="text-purple-200 text-[10px]">Unique Routes</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{totalStats.totalTrips}</p>
                <p className="text-purple-200 text-[10px]">Total Trips</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold">{totalStats.totalDistance?.toFixed(0)}</p>
                <p className="text-purple-200 text-[10px]">Miles</p>
              </div>
            </div>
          )}
        </div>

        {/* 3D Map View */}
        <div className="p-4 pb-2">
          <RouteMap 
            routes={routes} 
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />
        </div>

        {/* Selected Route Info */}
        {selectedRouteData && (
          <div className="mx-4 mb-2 bg-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Route size={14} className="text-purple-400" />
              <p className="text-white font-medium text-sm truncate">{selectedRouteData.route_name}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="text-white font-bold">{selectedRouteData.total_trips}</p>
                <p className="text-slate-500">trips</p>
              </div>
              <div>
                <p className="text-white font-bold">{selectedRouteData.total_distance_miles.toFixed(0)}</p>
                <p className="text-slate-500">miles</p>
              </div>
              <div>
                <p className={`font-bold ${getScoreColor(selectedRouteData.avg_safety_score)}`}>{selectedRouteData.avg_safety_score}</p>
                <p className="text-slate-500">avg score</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">{selectedRouteData.last_traveled?.split('-').slice(1).join('/')}</p>
                <p className="text-slate-500">last trip</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-2 flex items-center gap-2">
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
                className={`px-2 py-1 rounded-full text-[10px] font-medium ${sortBy === opt.key ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-lg"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading routes...</div>
          ) : sortedRoutes.length === 0 ? (
            <div className="text-center py-8">
              <Route className="mx-auto text-slate-600 mb-2" size={40} />
              <p className="text-slate-400">No routes recorded yet</p>
              <p className="text-slate-500 text-xs mt-1">Start driving to build your route history!</p>
            </div>
          ) : (
            sortedRoutes.map((route, index) => (
              <button
                key={route.id}
                onClick={() => setSelectedRoute(route.id === selectedRoute ? null : route.id)}
                className={`w-full bg-slate-800 rounded-xl p-3 text-left transition-all ${selectedRoute === route.id ? 'ring-2 ring-purple-500' : ''}`}
                data-testid={`route-${index}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: route.avg_safety_score >= 90 ? '#22c55e' : route.avg_safety_score >= 75 ? '#3b82f6' : '#f59e0b',
                        opacity: 0.3 + route.color_intensity * 0.7
                      }}
                    />
                    <span className="text-slate-400 text-xs">#{index + 1}</span>
                  </div>
                  <div className={`text-xs font-medium ${getScoreColor(route.avg_safety_score)}`}>
                    <Shield size={10} className="inline mr-1" />
                    {route.avg_safety_score}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-white text-sm truncate">{route.origin}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-white text-sm truncate">{route.destination}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>{route.total_trips} trips</span>
                    <span>•</span>
                    <span>{route.total_distance_miles.toFixed(0)} mi</span>
                  </div>
                  {route.last_traveled && (
                    <span className="text-slate-500">Last: {route.last_traveled}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
