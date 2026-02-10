import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Gem, Navigation, MapPin, Minus, Plus, Locate, Compass, Search, X,
  ChevronUp, ChevronDown, Volume2, Clock, ArrowUp, ArrowRight, 
  ArrowLeft, CornerUpRight, CornerUpLeft, Flag
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Offer {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  business_type?: string
  redeemed?: boolean
}

interface LocationSuggestion {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  type: string
  distance_km?: number
}

interface NavigationStep {
  instruction: string
  distance: string
  duration: string
  maneuver: string
}

interface NavigationData {
  destination: { lat: number; lng: number; name: string }
  distance: { text: string; miles: number }
  duration: { text: string; minutes: number }
  steps: NavigationStep[]
  traffic: string
}

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  isNavigating: boolean
  onOfferClick: (offer: Offer) => void
  carColor?: string
  onSearch?: (query: string, location?: { lat: number; lng: number }) => void
  onStartNavigation?: (destination: LocationSuggestion) => void
}

export default function InteractiveMap({ 
  userLocation, 
  offers, 
  isNavigating,
  onOfferClick,
  carColor = '#3b82f6',
  onSearch,
  onStartNavigation
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(15)
  const [center, setCenter] = useState(userLocation)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: 0, lng: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<LocationSuggestion | null>(null)
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null)
  const [showTurnByTurn, setShowTurnByTurn] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const mapRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Search locations from backend
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        q: query,
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        limit: '8'
      })
      const res = await fetch(`${API_URL}/api/map/search?${params}`)
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.data)
      }
    } catch (e) {
      console.error('Search error:', e)
    }
    setIsSearching(false)
  }, [userLocation])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (searchQuery.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(searchQuery)
      }, 300)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchLocations])

  // Fetch directions when destination is selected
  const fetchDirections = async (destination: LocationSuggestion) => {
    try {
      const params = new URLSearchParams({
        origin_lat: userLocation.lat.toString(),
        origin_lng: userLocation.lng.toString(),
        dest_lat: destination.lat.toString(),
        dest_lng: destination.lng.toString(),
        dest_name: destination.name
      })
      const res = await fetch(`${API_URL}/api/map/directions?${params}`)
      const data = await res.json()
      if (data.success) {
        setNavigationData(data.data)
        setShowTurnByTurn(true)
        setCurrentStepIndex(0)
      }
    } catch (e) {
      console.error('Directions error:', e)
    }
  }

  const handleSelectLocation = (location: LocationSuggestion) => {
    setCenter({ lat: location.lat, lng: location.lng })
    setZoom(16)
    setSearchQuery(location.name)
    setShowSuggestions(false)
    setSelectedDestination(location)
    onSearch?.(location.name, { lat: location.lat, lng: location.lng })
    // Fetch directions to the selected location
    fetchDirections(location)
  }

  const handleStartNavigation = () => {
    if (selectedDestination) {
      onStartNavigation?.(selectedDestination)
    }
  }

  const handleEndNavigation = () => {
    setNavigationData(null)
    setShowTurnByTurn(false)
    setSelectedDestination(null)
    setSearchQuery('')
    setCurrentStepIndex(0)
  }

  // Get maneuver icon
  const getManeuverIcon = (maneuver: string) => {
    switch (maneuver) {
      case 'turn-right': return <CornerUpRight className="text-white" size={24} />
      case 'turn-left': return <CornerUpLeft className="text-white" size={24} />
      case 'straight': return <ArrowUp className="text-white" size={24} />
      case 'arrive': return <Flag className="text-white" size={24} />
      default: return <ArrowUp className="text-white" size={24} />
    }
  }

  // Calculate tile coordinates
  const lon2tile = (lon: number, zoom: number) => Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
  const lat2tile = (lat: number, zoom: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))

  const handleZoomIn = () => setZoom(Math.min(zoom + 1, 18))
  const handleZoomOut = () => setZoom(Math.max(zoom - 1, 10))
  const handleRecenter = () => setCenter(userLocation)

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY, lat: center.lat, lng: center.lng })
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const dx = clientX - dragStart.x
    const dy = clientY - dragStart.y
    
    const scale = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom)
    const newLng = dragStart.lng - (dx * scale / 111320)
    const newLat = dragStart.lat + (dy * scale / 110540)
    
    setCenter({ lat: newLat, lng: newLng })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Generate visible offers with positions
  const visibleOffers = offers.filter(o => !o.redeemed).slice(0, 8).map((offer, index) => {
    const lat = offer.lat || userLocation.lat + (Math.sin(index * 0.8) * 0.008)
    const lng = offer.lng || userLocation.lng + (Math.cos(index * 0.8) * 0.01)
    return { ...offer, lat, lng }
  })

  // Convert lat/lng to pixel position relative to map center
  const latLngToPixel = (lat: number, lng: number) => {
    const scale = Math.pow(2, zoom) * 256
    const worldX = ((lng + 180) / 360) * scale
    const worldY = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * scale
    
    const centerWorldX = ((center.lng + 180) / 360) * scale
    const centerWorldY = ((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2) * scale
    
    const mapWidth = mapRef.current?.clientWidth || 400
    const mapHeight = mapRef.current?.clientHeight || 600
    
    return {
      x: (worldX - centerWorldX) + mapWidth / 2,
      y: (worldY - centerWorldY) + mapHeight / 2
    }
  }

  // Generate tile URLs for the current view
  const getTiles = () => {
    const tiles = []
    const centerX = lon2tile(center.lng, zoom)
    const centerY = lat2tile(center.lat, zoom)
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = centerX + dx
        const y = centerY + dy
        tiles.push({
          x, y, zoom,
          url: `https://c.basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y}.png`,
          left: dx * 256,
          top: dy * 256
        })
      }
    }
    return tiles
  }

  const tiles = getTiles()

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900" ref={mapRef}>
      {/* Map Tiles Container */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ touchAction: 'none' }}
      >
        {/* Tiles */}
        <div 
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {tiles.map((tile) => (
            <img
              key={`${tile.x}-${tile.y}-${tile.zoom}`}
              src={tile.url}
              alt=""
              className="absolute select-none"
              style={{
                width: 256,
                height: 256,
                left: tile.left,
                top: tile.top,
                imageRendering: 'crisp-edges'
              }}
              draggable={false}
            />
          ))}
        </div>

        {/* User Location Marker */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div 
            className="absolute rounded-full bg-blue-500/20 border-2 border-blue-500/50"
            style={{ width: 80, height: 80, left: -40, top: -40 }}
          />
          <div 
            className="absolute rounded-full shadow-lg flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              left: -16,
              top: -16,
              background: carColor,
              border: '3px solid white'
            }}
          >
            <Navigation className="text-white" size={16} />
          </div>
        </div>

        {/* Destination Marker */}
        {selectedDestination && (
          <div
            className="absolute z-15"
            style={{
              ...(() => {
                const pos = latLngToPixel(selectedDestination.lat, selectedDestination.lng)
                return { left: pos.x, top: pos.y }
              })(),
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Flag className="text-white" size={18} />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-red-500" />
            </div>
          </div>
        )}

        {/* Offer Markers */}
        {visibleOffers.map((offer) => {
          const pos = latLngToPixel(offer.lat, offer.lng)
          const isVisible = pos.x > -50 && pos.x < (mapRef.current?.clientWidth || 400) + 50 &&
                           pos.y > -50 && pos.y < (mapRef.current?.clientHeight || 600) + 50
          
          if (!isVisible) return null
          
          return (
            <button
              key={offer.id}
              onClick={(e) => { e.stopPropagation(); onOfferClick(offer) }}
              className="absolute z-20 group"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-75"
                  style={{
                    background: offer.discount_percent >= 15 ? '#10b981' : '#3b82f6',
                    width: 40, height: 40, left: -4, top: -4,
                  }}
                />
                <div 
                  className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${offer.discount_percent >= 15 ? '#10b981' : '#3b82f6'}, ${offer.discount_percent >= 15 ? '#059669' : '#2563eb'})`
                  }}
                >
                  <Gem className="text-white" size={14} />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {offer.discount_percent}%
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Turn-by-Turn Navigation Panel */}
      {showTurnByTurn && navigationData && (
        <div className="absolute top-0 left-0 right-0 z-40">
          {/* Current Step */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                {getManeuverIcon(navigationData.steps[currentStepIndex]?.maneuver || 'straight')}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">
                  {navigationData.steps[currentStepIndex]?.instruction || 'Continue'}
                </p>
                <p className="text-blue-100 text-sm">
                  {navigationData.steps[currentStepIndex]?.distance} • {navigationData.steps[currentStepIndex]?.duration}
                </p>
              </div>
              <button 
                onClick={handleEndNavigation}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
              >
                <X className="text-white" size={20} />
              </button>
            </div>
          </div>

          {/* ETA Bar */}
          <div className="bg-slate-900/95 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="text-emerald-400" size={16} />
                <span className="text-white font-semibold">{navigationData.duration.text}</span>
              </div>
              <div className="text-slate-400">•</div>
              <span className="text-slate-300">{navigationData.distance.text}</span>
              <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                navigationData.traffic === 'light' ? 'bg-emerald-500/20 text-emerald-400' :
                navigationData.traffic === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {navigationData.traffic} traffic
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp className="text-white" size={16} />
              </button>
              <button 
                onClick={() => setCurrentStepIndex(Math.min(navigationData.steps.length - 1, currentStepIndex + 1))}
                disabled={currentStepIndex === navigationData.steps.length - 1}
                className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown className="text-white" size={16} />
              </button>
              <button className="w-8 h-8 bg-slate-700/50 rounded-full flex items-center justify-center">
                <Volume2 className="text-white" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className={`absolute right-3 ${showTurnByTurn ? 'bottom-32' : 'bottom-32'} z-30 flex flex-col gap-2`}>
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus className="text-white" size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Minus className="text-white" size={18} />
        </button>
        <button
          onClick={handleRecenter}
          className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
        >
          <Locate className="text-white" size={18} />
        </button>
      </div>

      {/* Search Bar - Hidden during turn-by-turn */}
      {!showTurnByTurn && (
        <div className="absolute top-3 left-3 right-3 z-30">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search destination..."
                data-testid="map-search-input"
                className="w-full bg-slate-900/95 backdrop-blur text-white placeholder-slate-400 pl-10 pr-10 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500/50 shadow-lg text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowSuggestions(false); setSuggestions([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || isSearching) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur rounded-xl border border-white/10 shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 text-sm mt-2">Searching...</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectLocation(suggestion)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-white/5 text-left transition-colors"
                      data-testid={`search-result-${suggestion.id}`}
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="text-blue-400" size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{suggestion.name}</p>
                        <p className="text-slate-400 text-xs truncate">{suggestion.address}</p>
                      </div>
                      {suggestion.distance_km && (
                        <span className="text-slate-500 text-xs">{suggestion.distance_km} km</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compass */}
      <div className={`absolute right-3 ${showTurnByTurn ? 'top-36' : 'top-16'} z-30`}>
        <div className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Compass className="text-white" size={18} />
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute left-3 bottom-32 z-30 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-lg">
        <span className="text-white text-xs font-mono">Zoom: {zoom}</span>
      </div>

      {/* Start Navigation Button */}
      {selectedDestination && !showTurnByTurn && (
        <div className="absolute bottom-24 left-3 right-3 z-30">
          <div className="bg-slate-900/95 backdrop-blur rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="text-red-400" size={18} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{selectedDestination.name}</p>
                <p className="text-slate-400 text-xs">{selectedDestination.address}</p>
              </div>
            </div>
            <button
              onClick={handleStartNavigation}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-blue-400 hover:to-blue-500"
              data-testid="start-navigation-btn"
            >
              <Navigation size={18} />
              Start Navigation
            </button>
          </div>
        </div>
      )}

      {/* Simple Navigation Indicator (fallback) */}
      {isNavigating && !showTurnByTurn && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Navigation className="animate-pulse" size={16} />
          <span className="text-sm font-medium">Navigating...</span>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 left-2 z-30 text-[10px] text-slate-500">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
