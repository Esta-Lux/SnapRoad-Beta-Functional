import { useState, useRef, useEffect } from 'react'
import { 
  Gem, Navigation, Minus, Plus, Locate
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

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  isNavigating: boolean
  onOfferClick: (offer: Offer) => void
  carColor?: string
}

export default function InteractiveMap({ 
  userLocation, 
  offers, 
  isNavigating,
  onOfferClick,
  carColor = '#3b82f6'
}: InteractiveMapProps) {
  const [zoom, setZoom] = useState(14)
  const [center, setCenter] = useState(userLocation)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: 0, lng: 0 })
  const [mapSize, setMapSize] = useState({ width: 400, height: 600 })
  const mapRef = useRef<HTMLDivElement>(null)

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

  const handleZoomIn = () => setZoom(Math.min(zoom + 1, 18))
  const handleZoomOut = () => setZoom(Math.max(zoom - 1, 10))
  const handleRecenter = () => setCenter(userLocation)

  // Improved drag handling
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY, lat: center.lat, lng: center.lng })
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const dx = clientX - dragStart.x
    const dy = clientY - dragStart.y
    
    // Convert pixel movement to lat/lng based on zoom level
    const metersPerPixel = 156543.03392 * Math.cos(dragStart.lat * Math.PI / 180) / Math.pow(2, zoom)
    const dLng = (dx * metersPerPixel) / 111320
    const dLat = (dy * metersPerPixel) / 110540
    
    setCenter({
      lat: dragStart.lat + dLat,
      lng: dragStart.lng - dLng
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Generate spread out offers (much wider spread)
  const visibleOffers = offers.filter(o => !o.redeemed).slice(0, 5).map((offer, index) => {
    // Spread gems in a wider circle around user
    const angle = (index / 5) * 2 * Math.PI + Math.PI / 6
    const distance = 0.015 + (index % 2) * 0.008 // Varying distances
    const lat = offer.lat || userLocation.lat + Math.sin(angle) * distance
    const lng = offer.lng || userLocation.lng + Math.cos(angle) * distance * 1.2
    return { ...offer, lat, lng }
  })

  // Convert lat/lng to pixel position
  const latLngToPixel = (lat: number, lng: number) => {
    const scale = Math.pow(2, zoom) * 256
    
    const targetX = lon2tile(lng, zoom) * 256
    const targetY = lat2tile(lat, zoom) * 256
    const centerX = lon2tile(center.lng, zoom) * 256
    const centerY = lat2tile(center.lat, zoom) * 256
    
    return {
      x: (targetX - centerX) + mapSize.width / 2,
      y: (targetY - centerY) + mapSize.height / 2
    }
  }

  // Generate tiles for the visible area
  const getTiles = () => {
    const tiles = []
    const centerTileX = lon2tile(center.lng, zoom)
    const centerTileY = lat2tile(center.lat, zoom)
    
    // Calculate how many tiles we need
    const tilesX = Math.ceil(mapSize.width / 256) + 2
    const tilesY = Math.ceil(mapSize.height / 256) + 2
    
    const startX = Math.floor(centerTileX) - Math.floor(tilesX / 2)
    const startY = Math.floor(centerTileY) - Math.floor(tilesY / 2)
    
    // Offset to position tiles correctly
    const offsetX = (centerTileX - Math.floor(centerTileX)) * 256
    const offsetY = (centerTileY - Math.floor(centerTileY)) * 256
    
    for (let dx = 0; dx < tilesX; dx++) {
      for (let dy = 0; dy < tilesY; dy++) {
        const x = startX + dx
        const y = startY + dy
        
        // Wrap tile coordinates
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

        {/* User Location Marker - Always centered */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: mapSize.width / 2,
            top: mapSize.height / 2,
            transform: 'translate(-50%, -50%)',
            zIndex: 15
          }}
        >
          {/* Pulse ring */}
          <div 
            className="absolute rounded-full bg-blue-500/20 animate-pulse"
            style={{ width: 60, height: 60, left: -30, top: -30 }}
          />
          {/* User dot */}
          <div 
            className="absolute rounded-full shadow-lg flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              left: -14,
              top: -14,
              background: carColor,
              border: '3px solid white',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
          >
            <Navigation className="text-white" size={14} style={{ transform: 'rotate(0deg)' }} />
          </div>
        </div>

        {/* Offer Markers - Spread out */}
        {visibleOffers.map((offer) => {
          const pos = latLngToPixel(offer.lat, offer.lng)
          
          // Only render if on screen
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
                {/* Subtle glow */}
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
                {/* Gem icon */}
                <div 
                  className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${offer.discount_percent >= 15 ? '#10b981' : '#3b82f6'}, ${offer.discount_percent >= 15 ? '#059669' : '#2563eb'})`
                  }}
                >
                  <Gem className="text-white" size={14} />
                </div>
                {/* Discount label */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {offer.discount_percent}%
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Minimal Map Controls - Bottom right */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur rounded-lg flex items-center justify-center shadow-md hover:bg-slate-800 active:scale-95 transition-all"
          data-testid="map-zoom-in"
        >
          <Plus className="text-white" size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur rounded-lg flex items-center justify-center shadow-md hover:bg-slate-800 active:scale-95 transition-all"
          data-testid="map-zoom-out"
        >
          <Minus className="text-white" size={16} />
        </button>
        <button
          onClick={handleRecenter}
          className="w-9 h-9 bg-blue-500/90 backdrop-blur rounded-lg flex items-center justify-center shadow-md hover:bg-blue-600 active:scale-95 transition-all mt-1"
          data-testid="map-recenter"
        >
          <Locate className="text-white" size={16} />
        </button>
      </div>

      {/* Attribution - Very subtle */}
      <div className="absolute bottom-1 left-1 z-20 text-[8px] text-slate-600/50">
        © OSM
      </div>
    </div>
  )
}
