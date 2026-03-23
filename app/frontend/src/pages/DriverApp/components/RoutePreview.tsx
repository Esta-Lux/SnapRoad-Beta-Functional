/**
 * Premium route preview panel: destination, Fastest/Eco/Shortest, ETA, traffic, Start Navigation.
 */

import { useState } from 'react'
import {
  X, Navigation, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, RefreshCw, Zap, MapPin, Gauge,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavigationStep {
  instruction: string
  distance: string
  distanceMeters?: number
  maneuver: string
  lat?: number
  lng?: number
}

interface RoutePreviewData {
  destination?: { lat: number; lng: number; name?: string }
  steps: NavigationStep[]
  polyline: { lat: number; lng: number }[]
  duration: { text: string; seconds: number }
  distance: { text: string; meters: number }
  traffic: string
  routeName?: string
}

export interface RouteOption {
  id: string
  label: string
}

interface RoutePreviewProps {
  data: RoutePreviewData
  destinationName?: string
  destinationAddress?: string
  routeOptions?: RouteOption[]
  selectedRouteId?: string
  onRouteSelect?: (id: string) => void
  onGo: () => void
  onCancel: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function arrivalTime(seconds: number): string {
  const now = new Date()
  now.setSeconds(now.getSeconds() + seconds)
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function maneuverIcon(m: string) {
  switch (m) {
    case 'turn-right': return <ChevronRight size={16} className="text-slate-600" />
    case 'turn-left': return <ChevronLeft size={16} className="text-slate-600" />
    case 'u-turn': return <RefreshCw size={16} className="text-slate-600" />
    case 'merge': return <Zap size={16} className="text-slate-600" />
    case 'arrive': return <MapPin size={16} className="text-slate-600" />
    default: return <Navigation size={16} className="text-slate-600" />
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_ROUTE_OPTIONS: RouteOption[] = [
  { id: 'fastest', label: 'Fastest' },
  { id: 'eco', label: 'Eco' },
]

export default function RoutePreview({
  data,
  destinationName,
  destinationAddress,
  routeOptions = DEFAULT_ROUTE_OPTIONS,
  selectedRouteId = 'fastest',
  onRouteSelect,
  onGo,
  onCancel,
}: RoutePreviewProps) {
  const [showSteps, setShowSteps] = useState(false)

  const trafficLabel = data.traffic && data.traffic !== 'normal' ? (
    data.traffic === 'heavy' || data.traffic === 'congestion' ? 'Heavy traffic' :
    data.traffic === 'moderate' ? 'Moderate traffic' :
    data.traffic === 'closed' ? 'Route closed' : 'Light traffic'
  ) : null
  const trafficColor = data.traffic === 'heavy' || data.traffic === 'congestion' ? 'text-amber-600' :
    data.traffic === 'moderate' ? 'text-amber-500' :
    data.traffic === 'closed' ? 'text-red-600' : 'text-emerald-600'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pointer-events-auto overflow-hidden transition-all duration-300 ease-in-out border-t border-slate-200/80"
        style={{ maxHeight: '70vh' }}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-1 px-4">
          <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Close X - top right */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-4 w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
          aria-label="Close"
        >
          <X size={18} className="text-slate-600" />
        </button>

        {/* Destination - premium header */}
        <div className="px-5 pb-4">
          <h2 className="text-xl font-bold text-slate-900 truncate pr-12">
            {destinationName || data.destination?.name || 'Destination'}
          </h2>
          {destinationAddress && (
            <p className="text-sm text-slate-500 truncate mt-0.5">{destinationAddress}</p>
          )}
        </div>

        {/* Route options: Fastest, Eco, Shortest */}
        <div className="px-5 pb-4 flex gap-2">
          {routeOptions.map((opt) => {
            const selected = opt.id === selectedRouteId
            return (
              <button
                key={opt.id}
                onClick={() => onRouteSelect?.(opt.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selected
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* ETA, distance, arrive - prominent */}
        <div className="px-5 pb-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-slate-900">{data.duration.text}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-600 font-medium">{data.distance.text}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Arrive {arrivalTime(data.duration.seconds)}
          </p>
          {/* Traffic / route status */}
          {trafficLabel && (
            <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${trafficColor}`}>
              <Gauge size={14} />
              {trafficLabel}
            </div>
          )}
        </div>

        {/* Start Navigation - premium CTA */}
        <div className="px-5 py-5">
          <button
            onClick={onGo}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-blue-500/25 font-semibold text-white text-base"
          >
            <Navigation size={22} className="text-white" />
            Start Navigation
          </button>
        </div>

        {/* Steps toggle */}
        <div className="px-5 pb-4">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between py-2.5 text-sm text-slate-600 rounded-xl hover:bg-slate-50"
          >
            <span className="font-medium">{data.steps.length} steps</span>
            {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showSteps && (
          <div className="px-5 pb-5 max-h-44 overflow-y-auto space-y-1 border-t border-slate-100 pt-3">
            {data.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {maneuverIcon(step.maneuver)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{step.instruction}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.distance}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
