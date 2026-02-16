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

// Color mapping
const COLOR_MAP: Record<string, string> = {
  'ocean-blue': '#3b82f6',
  'midnight-black': '#1e293b',
  'pearl-white': '#f1f5f9',
  'racing-red': '#ef4444',
  'forest-green': '#22c55e',
  'sunset-gold': '#fbbf24',
}

// 3D Car SVG Component with perspective and shadows
const Car3DMarker = ({ category, color, size = 40 }: { category: string; color: string; size?: number }) => {
  const carColor = COLOR_MAP[color] || color || '#3b82f6'
  const shadowColor = `${carColor}66`
  const highlightColor = '#ffffff'
  
  const renderCar = () => {
    switch (category) {
      case 'suv':
        return (
          <g>
            {/* Shadow */}
            <ellipse cx="20" cy="36" rx="14" ry="3" fill="rgba(0,0,0,0.4)" />
            
            {/* Body base */}
            <path d="M6 24 L6 30 Q6 32 8 32 L32 32 Q34 32 34 30 L34 24 Q34 20 32 18 L28 18 L28 14 Q28 12 26 12 L14 12 Q12 12 12 14 L12 18 L8 18 Q6 20 6 24Z" 
              fill={carColor} />
            
            {/* Body highlight (3D effect) */}
            <path d="M8 24 L8 20 Q8 18 10 18 L30 18 Q32 18 32 20 L32 24" 
              fill={`${carColor}ee`} stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" />
            
            {/* Roof */}
            <path d="M12 18 L12 12 Q12 10 14 10 L26 10 Q28 10 28 12 L28 18" 
              fill={carColor} />
            <path d="M13 11 L27 11" stroke={highlightColor} strokeWidth="0.8" strokeOpacity="0.5" />
            
            {/* Windows */}
            <rect x="13" y="11" width="5" height="6" rx="1" fill="#0f172a" opacity="0.9" />
            <rect x="19" y="11" width="8" height="6" rx="1" fill="#0f172a" opacity="0.9" />
            
            {/* Window reflections */}
            <path d="M14 12 L17 12 L14 16Z" fill="rgba(255,255,255,0.2)" />
            <path d="M20 12 L26 12 L20 16Z" fill="rgba(255,255,255,0.2)" />
            
            {/* Front grill */}
            <rect x="8" y="26" width="24" height="2" rx="0.5" fill="#1e293b" />
            <rect x="10" y="26.5" width="20" height="1" rx="0.5" fill="#374151" />
            
            {/* Headlights */}
            <circle cx="10" cy="24" r="2" fill="#fef3c7" />
            <circle cx="10" cy="24" r="1.5" fill="#fef08a" />
            <circle cx="30" cy="24" r="2" fill="#fef3c7" />
            <circle cx="30" cy="24" r="1.5" fill="#fef08a" />
            
            {/* Wheels with 3D effect */}
            <circle cx="12" cy="32" r="4" fill="#1e293b" />
            <circle cx="12" cy="32" r="3" fill="#374151" />
            <circle cx="12" cy="32" r="1.5" fill="#6b7280" />
            <circle cx="28" cy="32" r="4" fill="#1e293b" />
            <circle cx="28" cy="32" r="3" fill="#374151" />
            <circle cx="28" cy="32" r="1.5" fill="#6b7280" />
          </g>
        )
      case 'truck':
        return (
          <g>
            {/* Shadow */}
            <ellipse cx="22" cy="36" rx="16" ry="3" fill="rgba(0,0,0,0.4)" />
            
            {/* Truck bed */}
            <path d="M18 20 L18 30 Q18 32 20 32 L36 32 Q38 32 38 30 L38 20 Q38 18 36 18 L20 18 Q18 18 18 20Z" 
              fill={carColor} opacity="0.9" />
            <path d="M19 19 L37 19" stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.4" />
            
            {/* Cabin */}
            <path d="M4 22 L4 30 Q4 32 6 32 L16 32 L16 18 L6 18 Q4 18 4 20Z" 
              fill={carColor} />
            
            {/* Cabin roof */}
            <path d="M6 18 L6 12 Q6 10 8 10 L14 10 Q16 10 16 12 L16 18" 
              fill={carColor} />
            <path d="M7 11 L15 11" stroke={highlightColor} strokeWidth="0.8" strokeOpacity="0.5" />
            
            {/* Window */}
            <rect x="7" y="11" width="8" height="6" rx="1" fill="#0f172a" opacity="0.9" />
            <path d="M8 12 L14 12 L8 16Z" fill="rgba(255,255,255,0.2)" />
            
            {/* Headlight */}
            <circle cx="6" cy="24" r="2" fill="#fef3c7" />
            <circle cx="6" cy="24" r="1.5" fill="#fef08a" />
            
            {/* Wheels */}
            <circle cx="10" cy="32" r="4" fill="#1e293b" />
            <circle cx="10" cy="32" r="3" fill="#374151" />
            <circle cx="10" cy="32" r="1.5" fill="#6b7280" />
            <circle cx="32" cy="32" r="4" fill="#1e293b" />
            <circle cx="32" cy="32" r="3" fill="#374151" />
            <circle cx="32" cy="32" r="1.5" fill="#6b7280" />
          </g>
        )
      default: // sedan
        return (
          <g>
            {/* Shadow */}
            <ellipse cx="20" cy="36" rx="14" ry="3" fill="rgba(0,0,0,0.4)" />
            
            {/* Body base with 3D curve */}
            <path d="M4 26 Q4 32 8 32 L32 32 Q36 32 36 26 L36 24 Q36 20 32 20 L8 20 Q4 20 4 24Z" 
              fill={carColor} />
            
            {/* Body top highlight */}
            <path d="M6 24 Q6 21 10 21 L30 21 Q34 21 34 24" 
              fill={`${carColor}dd`} stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.4" />
            
            {/* Roof/cabin */}
            <path d="M10 20 L12 12 Q13 10 16 10 L24 10 Q27 10 28 12 L30 20" 
              fill={carColor} />
            <path d="M13 11 L27 11" stroke={highlightColor} strokeWidth="1" strokeOpacity="0.5" />
            
            {/* Windows */}
            <path d="M13 12 L14 18 L18 18 L18 12Z" fill="#0f172a" opacity="0.9" />
            <path d="M20 12 L20 18 L27 18 L26 12Z" fill="#0f172a" opacity="0.9" />
            
            {/* Window reflections */}
            <path d="M14 13 L17 13 L15 17Z" fill="rgba(255,255,255,0.15)" />
            <path d="M21 13 L25 13 L22 17Z" fill="rgba(255,255,255,0.15)" />
            
            {/* Hood line */}
            <path d="M10 20 L8 24" stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" />
            <path d="M30 20 L32 24" stroke={highlightColor} strokeWidth="0.5" strokeOpacity="0.3" />
            
            {/* Front grill */}
            <rect x="8" y="27" width="24" height="2" rx="0.5" fill="#1e293b" />
            
            {/* Headlights with glow */}
            <circle cx="8" cy="25" r="2.5" fill="#fef3c7" />
            <circle cx="8" cy="25" r="1.8" fill="#fef08a" />
            <circle cx="32" cy="25" r="2.5" fill="#fef3c7" />
            <circle cx="32" cy="25" r="1.8" fill="#fef08a" />
            
            {/* Wheels with 3D depth */}
            <circle cx="11" cy="32" r="4" fill="#1e293b" />
            <circle cx="11" cy="32" r="3.2" fill="#374151" />
            <circle cx="11" cy="32" r="1.5" fill="#6b7280" />
            <ellipse cx="11" cy="31.5" rx="1" ry="0.5" fill="#9ca3af" opacity="0.5" />
            
            <circle cx="29" cy="32" r="4" fill="#1e293b" />
            <circle cx="29" cy="32" r="3.2" fill="#374151" />
            <circle cx="29" cy="32" r="1.5" fill="#6b7280" />
            <ellipse cx="29" cy="31.5" rx="1" ry="0.5" fill="#9ca3af" opacity="0.5" />
          </g>
        )
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
      {renderCar()}
    </svg>
  )
}

// Navigation Arrow for when no car is selected
const NavArrow3D = ({ color, size = 36 }: { color: string; size?: number }) => {
  const arrowColor = COLOR_MAP[color] || color || '#3b82f6'
  
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
      {/* Shadow */}
      <ellipse cx="18" cy="32" rx="8" ry="2" fill="rgba(0,0,0,0.3)" />
      
      {/* Arrow body with 3D effect */}
      <path 
        d="M18 4 L6 28 L18 22 L30 28 Z" 
        fill={arrowColor}
        stroke="white"
        strokeWidth="2"
      />
      
      {/* Highlight */}
      <path 
        d="M18 6 L9 25 L18 20 L18 6Z" 
        fill="rgba(255,255,255,0.2)"
      />
      
      {/* Inner detail */}
      <path 
        d="M18 10 L12 24 L18 20 L24 24 Z" 
        fill={`${arrowColor}dd`}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
    </svg>
  )
}

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

  const lon2tile = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z)
  const lat2tile = (lat: number, z: number) => ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, z)

  const handleRecenter = useCallback(() => {
    setCenter(userLocation)
    onRecenter?.()
  }, [userLocation, onRecenter])

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
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

  const visibleOffers = offers.filter(o => !o.redeemed).slice(0, 5).map((offer, index) => {
    const angle = (index / 5) * 2 * Math.PI + Math.PI / 6
    const distance = 0.015 + (index % 2) * 0.008
    const lat = offer.lat || userLocation.lat + Math.sin(angle) * distance
    const lng = offer.lng || userLocation.lng + Math.cos(angle) * distance * 1.2
    return { ...offer, lat, lng }
  })

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

        {/* User Location Marker - 3D Car or Arrow */}
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
            className="absolute rounded-full animate-pulse"
            style={{ 
              width: 60, 
              height: 60, 
              left: -30, 
              top: -30,
              background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0) 70%)'
            }}
          />
          
          {/* 3D Car or Arrow marker */}
          <div 
            className="absolute"
            style={{
              left: -20,
              top: -20,
            }}
          >
            {userCar?.category ? (
              <Car3DMarker 
                category={userCar.category} 
                color={userCar.color || 'ocean-blue'} 
                size={40} 
              />
            ) : (
              <NavArrow3D color={carColor} size={40} />
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
          className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:from-purple-400 hover:to-indigo-500 active:scale-95 transition-all"
          data-testid="orion-map-btn"
          style={{ boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}
        >
          <Mic className="text-white" size={22} />
        </button>
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="w-12 h-12 bg-slate-900/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all border border-white/10"
          data-testid="map-recenter"
        >
          <Locate className="text-white" size={22} />
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
