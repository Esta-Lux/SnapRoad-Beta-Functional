import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Gem, Navigation, Locate, Mic
} from 'lucide-react'

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

interface UserCar {
  category: string
  variant: string
  color: string
}

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  isNavigating: boolean
  onOfferClick: (offer: Offer) => void
  carColor?: string
  userCar?: UserCar
  onOrionClick?: () => void
  onRecenter?: () => void
}

// Car icon SVG based on category
const CarIcon = ({ category, color, size = 32 }: { category: string; color: string; size?: number }) => {
  const getCarPath = () => {
    switch (category) {
      case 'suv':
        return (
          <g transform={`scale(${size / 40})`}>
            {/* SUV body */}
            <rect x="8" y="14" width="24" height="14" rx="3" fill={color} />
            <rect x="10" y="8" width="20" height="10" rx="2" fill={color} />
            {/* Windows */}
            <rect x="12" y="10" width="6" height="6" rx="1" fill="#1e293b" opacity="0.8" />
            <rect x="20" y="10" width="8" height="6" rx="1" fill="#1e293b" opacity="0.8" />
            {/* Wheels */}
            <circle cx="13" cy="28" r="4" fill="#1e293b" />
            <circle cx="27" cy="28" r="4" fill="#1e293b" />
            <circle cx="13" cy="28" r="2" fill="#475569" />
            <circle cx="27" cy="28" r="2" fill="#475569" />
          </g>
        )
      case 'truck':
        return (
          <g transform={`scale(${size / 40})`}>
            {/* Truck cab */}
            <rect x="4" y="12" width="14" height="14" rx="2" fill={color} />
            <rect x="6" y="8" width="10" height="8" rx="2" fill={color} />
            {/* Truck bed */}
            <rect x="18" y="14" width="18" height="12" rx="2" fill={color} opacity="0.9" />
            {/* Window */}
            <rect x="7" y="9" width="8" height="5" rx="1" fill="#1e293b" opacity="0.8" />
            {/* Wheels */}
            <circle cx="11" cy="26" r="4" fill="#1e293b" />
            <circle cx="30" cy="26" r="4" fill="#1e293b" />
            <circle cx="11" cy="26" r="2" fill="#475569" />
            <circle cx="30" cy="26" r="2" fill="#475569" />
          </g>
        )
      default: // sedan
        return (
          <g transform={`scale(${size / 40})`}>
            {/* Sedan body */}
            <ellipse cx="20" cy="22" rx="16" ry="6" fill={color} />
            <ellipse cx="20" cy="16" rx="10" ry="5" fill={color} />
            {/* Windows */}
            <ellipse cx="15" cy="15" rx="4" ry="3" fill="#1e293b" opacity="0.8" />
            <ellipse cx="25" cy="15" rx="4" ry="3" fill="#1e293b" opacity="0.8" />
            {/* Wheels */}
            <circle cx="10" cy="24" r="4" fill="#1e293b" />
            <circle cx="30" cy="24" r="4" fill="#1e293b" />
            <circle cx="10" cy="24" r="2" fill="#475569" />
            <circle cx="30" cy="24" r="2" fill="#475569" />
          </g>
        )
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {getCarPath()}
    </svg>
  )
}

// Navigation arrow
const NavArrow = ({ color, size = 28 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path 
      d="M12 2L4 20L12 16L20 20L12 2Z" 
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export default function InteractiveMap({ 
  userLocation, 
  offers, 
  isNavigating,
  onOfferClick,
  carColor = '#3b82f6',
  userCar,
  onOrionClick,
  onRecenter
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(14)
  const [center, setCenter] = useState(userLocation)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: 0, lng: 0 })
  const [mapSize, setMapSize] = useState({ width: 400, height: 600 })
  const mapRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)

  // Update map size on resize
  useEffect(() => {
    const updateSize = () => {
      if (mapRef.current) {
        setMapSize({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Calculate tile coordinates
  const lon2tile = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z)
  const lat2tile = (lat: number, z: number) => ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, z)

  const handleRecenter = useCallback(() => {
    setCenter(userLocation)
    onRecenter?.()
  }, [userLocation, onRecenter])

  // Mouse/Touch drag handling
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      // Pinch zoom start
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      lastTouchDistance.current = distance
      return
    }
    
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY, lat: center.lat, lng: center.lng })
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY)
      
      if (lastTouchDistance.current !== null) {
        const delta = distance - lastTouchDistance.current
        if (Math.abs(delta) > 10) {
          setZoom(prev => Math.max(10, Math.min(18, prev + (delta > 0 ? 0.5 : -0.5))))
          lastTouchDistance.current = distance
        }
      }
      return
    }
    
    if (!isDragging) return
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const dx = clientX - dragStart.x
    const dy = clientY - dragStart.y
    
    const metersPerPixel = 156543.03392 * Math.cos(dragStart.lat * Math.PI / 180) / Math.pow(2, zoom)
    const dLng = (dx * metersPerPixel) / 111320
    const dLat = (dy * metersPerPixel) / 110540
    
    setCenter({
      lat: dragStart.lat + dLat,
      lng: dragStart.lng - dLng
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    lastTouchDistance.current = null
  }

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.5 : 0.5
    setZoom(prev => Math.max(10, Math.min(18, prev + delta)))
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map) {
      map.addEventListener('wheel', handleWheel, { passive: false })
      return () => map.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Generate spread out offers
  const visibleOffers = offers.filter(o => !o.redeemed).slice(0, 5).map((offer, index) => {
    const angle = (index / 5) * 2 * Math.PI + Math.PI / 6
    const distance = 0.015 + (index % 2) * 0.008
    const lat = offer.lat || userLocation.lat + Math.sin(angle) * distance
    const lng = offer.lng || userLocation.lng + Math.cos(angle) * distance * 1.2
    return { ...offer, lat, lng }
  })

  // Convert lat/lng to pixel position
  const latLngToPixel = (lat: number, lng: number) => {
    const targetX = lon2tile(lng, zoom) * 256
    const targetY = lat2tile(lat, zoom) * 256
    const centerX = lon2tile(center.lng, zoom) * 256
    const centerY = lat2tile(center.lat, zoom) * 256
    
    return {
      x: (targetX - centerX) + mapSize.width / 2,
      y: (targetY - centerY) + mapSize.height / 2
    }
  }

  // Generate tiles
  const getTiles = () => {
    const tiles = []
    const centerTileX = lon2tile(center.lng, zoom)
    const centerTileY = lat2tile(center.lat, zoom)
    
    const tilesX = Math.ceil(mapSize.width / 256) + 2
    const tilesY = Math.ceil(mapSize.height / 256) + 2
    
    const startX = Math.floor(centerTileX) - Math.floor(tilesX / 2)
    const startY = Math.floor(centerTileY) - Math.floor(tilesY / 2)
    
    const offsetX = (centerTileX - Math.floor(centerTileX)) * 256
    const offsetY = (centerTileY - Math.floor(centerTileY)) * 256
    
    for (let dx = 0; dx < tilesX; dx++) {
      for (let dy = 0; dy < tilesY; dy++) {
        const x = startX + dx
        const y = startY + dy
        
        const wrappedX = ((x % Math.pow(2, zoom)) + Math.pow(2, zoom)) % Math.pow(2, zoom)
        
        if (y >= 0 && y < Math.pow(2, zoom)) {
          tiles.push({
            key: `${x}-${y}-${zoom}`,
            url: `https://c.basemaps.cartocdn.com/dark_all/${zoom}/${Math.floor(wrappedX)}/${Math.floor(y)}.png`,
            left: (dx - Math.floor(tilesX / 2)) * 256 - offsetX + mapSize.width / 2,
            top: (dy - Math.floor(tilesY / 2)) * 256 - offsetY + mapSize.height / 2
          })
        }
      }
    }
    return tiles
  }

  const tiles = getTiles()

  // Get user marker position (always centered)
  const userPos = latLngToPixel(userLocation.lat, userLocation.lng)

  return (
    <div 
      className="absolute inset-0 z-0 overflow-hidden bg-slate-900 select-none" 
      ref={mapRef}
      style={{ touchAction: 'none' }}
    >
      {/* Map Tiles */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            className="absolute pointer-events-none"
            style={{
              width: 256,
              height: 256,
              left: tile.left,
              top: tile.top,
            }}
            draggable={false}
          />
        ))}

        {/* User Location Marker - Positioned based on actual user location */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: userPos.x,
            top: userPos.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 15
          }}
        >
          {/* Pulse ring */}
          <div 
            className="absolute rounded-full bg-blue-500/20 animate-pulse"
            style={{ width: 50, height: 50, left: -25, top: -25 }}
          />
          {/* User marker - Car or Arrow based on selection */}
          <div 
            className="absolute rounded-full shadow-lg flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              left: -18,
              top: -18,
              background: 'white',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
          >
            {userCar ? (
              <CarIcon category={userCar.category} color={carColor} size={28} />
            ) : (
              <NavArrow color={carColor} size={24} />
            )}
          </div>
        </div>

        {/* Offer Markers */}
        {visibleOffers.map((offer) => {
          const pos = latLngToPixel(offer.lat, offer.lng)
          
          if (pos.x < -50 || pos.x > mapSize.width + 50 || pos.y < -50 || pos.y > mapSize.height + 50) {
            return null
          }
          
          return (
            <button
              key={offer.id}
              onClick={(e) => { e.stopPropagation(); onOfferClick(offer) }}
              className="absolute group"
              style={{ 
                left: pos.x, 
                top: pos.y, 
                transform: 'translate(-50%, -50%)',
                zIndex: 20
              }}
              data-testid={`offer-marker-${offer.id}`}
            >
              <div className="relative">
                <div 
                  className="absolute rounded-full opacity-40"
                  style={{
                    background: offer.discount_percent >= 15 ? '#10b981' : '#3b82f6',
                    width: 36, 
                    height: 36, 
                    left: -2, 
                    top: -2,
                    filter: 'blur(8px)'
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
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {offer.discount_percent}%
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Floating Controls - Right Side */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-2">
        {/* Orion Voice Button */}
        <button
          onClick={onOrionClick}
          className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:from-purple-400 hover:to-indigo-500 active:scale-95 transition-all"
          data-testid="orion-map-btn"
        >
          <Mic className="text-white" size={20} />
        </button>
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="w-11 h-11 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
          data-testid="map-recenter"
        >
          <Locate className="text-white" size={20} />
        </button>
      </div>

      {/* Navigation Indicator */}
      {isNavigating && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Navigation className="animate-pulse" size={16} />
          <span className="text-sm font-medium">Navigating...</span>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-1 left-1 z-20 text-[8px] text-slate-600/50">
        © OSM
      </div>
    </div>
  )
}
