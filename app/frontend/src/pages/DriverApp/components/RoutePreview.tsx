/**
 * Baidu Maps-style route preview panel.
 * Bottom sheet: destination, route options, ETA/distance, Start Navigation.
 */

import { useState } from 'react'
import {
  X, Clock, Navigation, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, RefreshCw, Zap, MapPin,
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
  { id: 'shortest', label: 'Shortest' },
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] pointer-events-auto overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: '65vh' }}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
        </div>

        {/* Close X - top right */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors rounded-full"
        >
          <X size={16} className="text-slate-600" />
        </button>

        {/* Destination name - bold at top */}
        <div className="px-4 pb-3">
          <h2 className="text-lg font-bold text-slate-800 truncate pr-10">
            {destinationName || data.destination?.name || 'Destination'}
          </h2>
          {destinationAddress && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{destinationAddress}</p>
          )}
        </div>

        {/* Route option pills */}
        <div className="px-4 pb-4 flex gap-2">
          {routeOptions.map((opt) => {
            const selected = opt.id === selectedRouteId
            return (
              <button
                key={opt.id}
                onClick={() => onRouteSelect?.(opt.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selected
                    ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                    : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* ETA / Distance - clean layout above button; Arrive time prominent */}
        <div className="px-4 pb-4">
          <p className="text-[13px] text-slate-500">
            <span className="font-semibold text-slate-800">{data.duration.text}</span>
            {' • '}
            <span>{data.distance.text}</span>
          </p>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Arrive {arrivalTime(data.duration.seconds)}
          </p>
        </div>

        {/* Start Navigation - full-width blue, pulse; only X cancels */}
        <div className="px-4 pb-6">
          <button
            onClick={onGo}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.12)] animate-pulse"
          >
            <Navigation size={22} className="text-white" />
            <span className="text-white text-lg font-bold tracking-wide">Start Navigation</span>
          </button>
        </div>

        {/* Steps toggle (collapsed by default) */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between py-2 text-sm text-slate-600"
          >
            <span className="font-medium">{data.steps.length} steps</span>
            {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showSteps && (
          <div className="px-4 pb-4 max-h-40 overflow-y-auto space-y-1 transition-all duration-300">
            {data.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {maneuverIcon(step.maneuver)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{step.instruction}</p>
                  <p className="text-[11px] text-slate-500">{step.distance}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
