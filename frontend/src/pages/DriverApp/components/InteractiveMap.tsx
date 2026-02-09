import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Gem, Navigation, MapPin, Minus, Plus, Locate } from 'lucide-react'

// Fix Leaflet marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Offer {
  id: number
  business_name: string
  discount_percent: number
  gems_reward: number
  lat: number
  lng: number
  business_type?: string
}

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  isNavigating: boolean
  onOfferClick: (offer: Offer) => void
  carCategory?: string
  carColor?: string
}

// Custom car icon SVG
const createCarIcon = (color: string = '#3b82f6') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      <path d="M12 6 L16 12 L12 18 L8 12 Z" fill="white"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'custom-car-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Custom gem marker icon
const createGemIcon = (discount: number) => {
  const color = discount >= 15 ? '#10b981' : '#3b82f6'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="15" fill="${color}" filter="url(#glow)" opacity="0.9"/>
      <circle cx="20" cy="20" r="12" fill="${color}"/>
      <polygon points="20,8 24,16 20,24 16,16" fill="white" opacity="0.9"/>
      <text x="20" y="33" font-size="8" fill="white" text-anchor="middle" font-weight="bold">${discount}%</text>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'gem-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// Map Controls Component
function MapControls({ userLocation }: { userLocation: { lat: number; lng: number } }) {
  const map = useMap()
  
  const handleZoomIn = () => map.zoomIn()
  const handleZoomOut = () => map.zoomOut()
  const handleRecenter = () => map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1 })
  
  return (
    <div className="absolute right-3 bottom-32 z-[1000] flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800"
      >
        <Plus className="text-white" size={18} />
      </button>
      <button
        onClick={handleZoomOut}
        className="w-10 h-10 bg-slate-900/95 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800"
      >
        <Minus className="text-white" size={18} />
      </button>
      <button
        onClick={handleRecenter}
        className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600"
      >
        <Locate className="text-white" size={18} />
      </button>
    </div>
  )
}

// Map Auto-Update Component
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  
  useEffect(() => {
    // Only update on significant position change
  }, [center, zoom, map])
  
  return null
}

export default function InteractiveMap({ 
  userLocation, 
  offers, 
  isNavigating,
  onOfferClick,
  carColor = '#3b82f6'
}: InteractiveMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)
  
  // Columbus, OH area - centered on user
  const center: [number, number] = [userLocation.lat, userLocation.lng]
  
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
        whenReady={() => setMapReady(true)}
      >
        {/* OpenStreetMap Tile Layer - Dark Mode */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* User Location Circle (accuracy indicator) */}
        <Circle
          center={center}
          radius={100}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
          }}
        />
        
        {/* User Car Marker */}
        <Marker 
          position={center} 
          icon={createCarIcon(carColor)}
        >
          <Popup className="custom-popup">
            <div className="text-center p-1">
              <p className="font-semibold text-sm">You are here</p>
              <p className="text-xs text-slate-500">Columbus, OH</p>
            </div>
          </Popup>
        </Marker>
        
        {/* Offer Markers */}
        {offers.filter(o => !o.redeemed).slice(0, 8).map((offer, index) => {
          // Calculate offset position for demo
          const offsetLat = userLocation.lat + (Math.sin(index * 0.8) * 0.008)
          const offsetLng = userLocation.lng + (Math.cos(index * 0.8) * 0.01)
          
          return (
            <Marker
              key={offer.id}
              position={[offer.lat || offsetLat, offer.lng || offsetLng]}
              icon={createGemIcon(offer.discount_percent || 10)}
              eventHandlers={{
                click: () => onOfferClick(offer),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[150px]">
                  <p className="font-semibold text-sm">{offer.business_name}</p>
                  <p className="text-emerald-500 font-bold">{offer.discount_percent}% off</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Gem size={12} className="text-cyan-500" />
                    +{offer.gems_reward} gems
                  </p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onOfferClick(offer) }}
                    className="mt-2 w-full bg-emerald-500 text-white text-xs py-1.5 rounded-lg hover:bg-emerald-600"
                  >
                    View Offer
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Map Controls */}
        <MapControls userLocation={userLocation} />
        
        {/* Map Updater */}
        <MapUpdater center={center} zoom={15} />
      </MapContainer>
      
      {/* Navigation Indicator */}
      {isNavigating && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1001] bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Navigation className="animate-pulse" size={16} />
          <span className="text-sm font-medium">Navigating...</span>
        </div>
      )}
      
      {/* Custom Styles */}
      <style>{`
        .custom-car-icon {
          background: none !important;
          border: none !important;
        }
        .gem-marker-icon {
          background: none !important;
          border: none !important;
          cursor: pointer;
        }
        .gem-marker-icon:hover {
          transform: scale(1.1);
          transition: transform 0.2s;
        }
        .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: white;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-tip {
          background: #1e293b;
        }
        .leaflet-popup-close-button {
          color: white !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
      `}</style>
    </div>
  )
}
