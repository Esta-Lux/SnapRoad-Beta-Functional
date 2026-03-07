/**
 * Apple Maps-style route preview panel.
 * Shows destination info, ETA, distance, step list, and a GO button.
 */

import { useState } from 'react'
import {
  X, Clock, MapPin, Navigation, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, RefreshCw, Zap,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types (mirroring NavigationState from index.tsx)                    */
/* ------------------------------------------------------------------ */

interface NavigationStep {
  instruction: string
  distance: string
  distanceMeters: number
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

interface RoutePreviewProps {
  data: RoutePreviewData
  destinationName?: string
  destinationAddress?: string
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

function trafficColor(traffic: string): string {
  if (traffic === 'heavy') return 'text-red-400'
  if (traffic === 'moderate') return 'text-amber-400'
  return 'text-emerald-400'
}

function trafficDot(traffic: string): string {
  if (traffic === 'heavy') return 'bg-red-400'
  if (traffic === 'moderate') return 'bg-amber-400'
  return 'bg-emerald-400'
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

export default function RoutePreview({ data, destinationName, destinationAddress, onGo, onCancel }: RoutePreviewProps) {
  const [showSteps, setShowSteps] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="w-full max-w-md bg-white rounded-t-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.1)] border border-gray-100 border-b-0 pointer-events-auto animate-slide-up overflow-hidden"
        style={{ maxHeight: '65vh' }}
      >
        {/* Drag handle - Baidu-style */}
        <div className="pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
        </div>

        {/* Close */}
        <button onClick={onCancel} className="absolute top-3 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X size={16} className="text-slate-600" />
        </button>

        {/* Destination */}
        <div className="px-4 pb-3">
          <h2 className="text-lg font-bold text-slate-800 truncate pr-10">{destinationName || data.destination?.name || 'Destination'}</h2>
          {destinationAddress && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{destinationAddress}</p>
          )}
        </div>

        {/* ETA card - light Baidu-style */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{data.duration.text}</p>
                  <p className="text-xs text-slate-500">{data.distance.text}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Arrive {arrivalTime(data.duration.seconds)}</p>
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  <div className={`w-2 h-2 rounded-full ${trafficDot(data.traffic)}`} />
                  <span className={`text-xs font-medium capitalize ${trafficColor(data.traffic)}`}>{data.traffic}</span>
                </div>
              </div>
            </div>
            {data.routeName && (
              <p className="text-xs text-slate-500 mt-2">via {data.routeName}</p>
            )}
          </div>
        </div>

        {/* Steps toggle */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between py-2 text-sm text-slate-600"
          >
            <span className="font-medium">{data.steps.length} steps</span>
            {showSteps ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
        </div>

        {/* Steps list */}
        {showSteps && (
          <div className="px-4 pb-3 max-h-40 overflow-y-auto space-y-1">
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

        {/* GO button */}
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={onGo}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <Navigation size={22} className="text-white" />
            <span className="text-white text-lg font-bold tracking-wide">GO</span>
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 mt-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
