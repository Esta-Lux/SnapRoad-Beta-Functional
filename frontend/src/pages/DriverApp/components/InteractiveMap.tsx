import { useState, useRef } from 'react'
import { 
  Gem, Navigation, Minus, Plus, Locate, Compass
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
  const [zoom, setZoom] = useState(15)
  const [center, setCenter] = useState(userLocation)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lat: 0, lng: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

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
              data-testid={`offer-marker-${offer.id}`}
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

      {/* Map Controls */}
      <div className="absolute right-3 bottom-32 z-30 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
          data-testid="map-zoom-in"
        >
          <Plus className="text-white" size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
          data-testid="map-zoom-out"
        >
          <Minus className="text-white" size={18} />
        </button>
        <button
          onClick={handleRecenter}
          className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
          data-testid="map-recenter"
        >
          <Locate className="text-white" size={18} />
        </button>
      </div>

      {/* Compass */}
      <div className="absolute right-3 top-16 z-20">
        <div className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
          <Compass className="text-white" size={18} />
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute left-3 bottom-32 z-20 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-lg">
        <span className="text-white text-xs font-mono">Zoom: {zoom}</span>
      </div>

      {/* Navigation Indicator */}
      {isNavigating && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Navigation className="animate-pulse" size={16} />
          <span className="text-sm font-medium">Navigating...</span>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 left-2 z-20 text-[10px] text-slate-500">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
