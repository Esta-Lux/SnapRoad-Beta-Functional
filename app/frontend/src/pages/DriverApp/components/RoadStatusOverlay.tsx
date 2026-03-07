import { useState } from 'react'
import { X, AlertTriangle, Construction, Clock, CheckCircle } from 'lucide-react'

interface RoadSegment {
  id: string
  name: string
  status: 'clear' | 'moderate' | 'heavy' | 'closed'
  reason?: string
  estimatedDelay?: number // minutes
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

interface RoadStatusOverlayProps {
  selectedRoad: RoadSegment | null
  onClose: () => void
}

// Mock road segments for Columbus, OH area
export const MOCK_ROAD_SEGMENTS: RoadSegment[] = [
  {
    id: 'i70-downtown',
    name: 'I-70 Downtown',
    status: 'heavy',
    reason: 'Rush hour traffic',
    estimatedDelay: 15,
    startLat: 39.9612,
    startLng: -83.0100,
    endLat: 39.9612,
    endLng: -82.9800,
  },
  {
    id: 'i71-north',
    name: 'I-71 North',
    status: 'moderate',
    reason: 'Construction zone',
    estimatedDelay: 8,
    startLat: 39.9700,
    startLng: -82.9988,
    endLat: 40.0000,
    endLng: -82.9988,
  },
  {
    id: 'high-st',
    name: 'High Street',
    status: 'closed',
    reason: 'Water main break',
    estimatedDelay: 0,
    startLat: 39.9800,
    startLng: -83.0060,
    endLat: 39.9900,
    endLng: -83.0060,
  },
  {
    id: 'broad-st',
    name: 'Broad Street',
    status: 'clear',
    startLat: 39.9612,
    startLng: -83.0200,
    endLat: 39.9612,
    endLng: -82.9700,
  },
  {
    id: 'i270-west',
    name: 'I-270 West',
    status: 'moderate',
    reason: 'Accident reported',
    estimatedDelay: 12,
    startLat: 39.9400,
    startLng: -83.0500,
    endLat: 39.9800,
    endLng: -83.0800,
  },
]

// Helper to get status color
export const getStatusColor = (status: RoadSegment['status']) => {
  switch (status) {
    case 'clear': return 'transparent'
    case 'moderate': return '#eab308' // yellow
    case 'heavy': return '#ef4444' // red
    case 'closed': return '#1f2937' // dark/black
  }
}

export const getStatusLabel = (status: RoadSegment['status']) => {
  switch (status) {
    case 'clear': return 'Clear'
    case 'moderate': return 'Moderate Traffic'
    case 'heavy': return 'Heavy Traffic'
    case 'closed': return 'Road Closed'
  }
}

export default function RoadStatusOverlay({ selectedRoad, onClose }: RoadStatusOverlayProps) {
  if (!selectedRoad) return null

  const StatusIcon = selectedRoad.status === 'closed' 
    ? AlertTriangle 
    : selectedRoad.status === 'heavy' 
      ? Clock 
      : selectedRoad.status === 'moderate'
        ? Construction
        : CheckCircle

  const statusColors = {
    clear: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    heavy: 'bg-red-500/20 text-red-400 border-red-500/30',
    closed: 'bg-slate-700 text-slate-300 border-slate-600',
  }

  return (
    <div className="absolute bottom-24 left-4 right-4 z-20">
      <div className={`rounded-2xl p-4 border ${statusColors[selectedRoad.status]} backdrop-blur-lg`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              selectedRoad.status === 'closed' ? 'bg-slate-600' :
              selectedRoad.status === 'heavy' ? 'bg-red-500/30' :
              selectedRoad.status === 'moderate' ? 'bg-amber-500/30' :
              'bg-emerald-500/30'
            }`}>
              <StatusIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white">{selectedRoad.name}</h3>
              <p className={`text-sm ${
                selectedRoad.status === 'closed' ? 'text-red-400' :
                selectedRoad.status === 'heavy' ? 'text-red-400' :
                selectedRoad.status === 'moderate' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {getStatusLabel(selectedRoad.status)}
              </p>
            </div>
          </div>
          
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Details */}
        {selectedRoad.reason && (
          <p className="text-slate-300 text-sm mb-2">
            {selectedRoad.reason}
          </p>
        )}

        {selectedRoad.estimatedDelay !== undefined && selectedRoad.estimatedDelay > 0 && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Clock size={14} />
            <span>+{selectedRoad.estimatedDelay} min delay</span>
          </div>
        )}

        {selectedRoad.status === 'closed' && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            <p className="text-red-400 text-sm">
              This road is currently closed. Please find an alternate route.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Component to render road status indicators on map
export function RoadStatusMarkers({ 
  roads, 
  onSelectRoad 
}: { 
  roads: RoadSegment[]
  onSelectRoad: (road: RoadSegment) => void 
}) {
  // Filter out clear roads (they don't need indicators)
  const visibleRoads = roads.filter(r => r.status !== 'clear')
  
  return (
    <>
      {visibleRoads.map(road => {
        const color = getStatusColor(road.status)
        // Position marker at midpoint of road segment
        const midLat = (road.startLat + road.endLat) / 2
        const midLng = (road.startLng + road.endLng) / 2
        
        // Convert to screen position (mock - in real map this would be handled by Mapbox)
        // Using relative positioning for demo
        const top = 30 + (40 - midLat) * 1000
        const left = 50 + (midLng + 83) * 1000
        
        return (
          <button
            key={road.id}
            onClick={() => onSelectRoad(road)}
            className="absolute z-10 group"
            style={{
              top: `${Math.max(20, Math.min(60, top))}%`,
              left: `${Math.max(10, Math.min(90, left))}%`,
            }}
            data-testid={`road-status-${road.id}`}
          >
            <div 
              className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-125 ${
                road.status === 'closed' ? 'bg-slate-800' :
                road.status === 'heavy' ? 'bg-red-500 animate-pulse' :
                'bg-amber-500'
              }`}
            />
            {/* Hover tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {road.name}
              </div>
            </div>
          </button>
        )
      })}
    </>
  )
}

/*
  MAPBOX INTEGRATION NOTES:
  --------------------------
  1. Add traffic layer from Mapbox:
     <VectorSource id="traffic" url="mapbox://mapbox.mapbox-traffic-v1">
       <LineLayer
         id="traffic-lines"
         sourceLayerID="traffic"
         style={{
           lineColor: [
             'match', ['get', 'congestion'],
             'low', '#4ade80',      // green
             'moderate', '#eab308', // yellow
             'heavy', '#f97316',    // orange
             'severe', '#ef4444',   // red
             '#888888'              // default gray
           ],
           lineWidth: 4,
           lineOpacity: 0.8,
         }}
       />
     </VectorSource>

  2. For road closures, use Mapbox Incidents API or custom source:
     const closures = await fetch('https://api.mapbox.com/incidents/v1/...')
     
  3. Custom road status from your backend:
     - Store road statuses in Firestore/Supabase
     - Fetch and overlay as GeoJSON layer
     
  4. Real-time updates with WebSocket:
     const ws = new WebSocket('wss://your-api/road-status')
     ws.onmessage = (e) => updateRoadStatus(JSON.parse(e.data))
*/
