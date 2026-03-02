/**
 * Route info bar: ETA, distance remaining, and route name shown during navigation.
 */

import { Clock, Route, MapPin } from 'lucide-react'
import type { DrivingMode } from '@/core/types'

interface RouteInfoBarProps {
  distanceMiles: number
  etaMinutes: number
  destination?: string
  mode?: DrivingMode
}

export default function RouteInfoBar({ distanceMiles, etaMinutes, destination, mode = 'adaptive' }: RouteInfoBarProps) {
  const accent =
    mode === 'sport' ? 'border-red-500/40 bg-red-500/10' :
    mode === 'calm' ? 'border-blue-500/40 bg-blue-500/10' :
    'border-emerald-500/40 bg-emerald-500/10'

  const iconAccent =
    mode === 'sport' ? 'text-red-400/70' :
    mode === 'calm' ? 'text-blue-400/70' :
    'text-emerald-400/70'

  const fmtDist = distanceMiles < 0.1 ? `${Math.round(distanceMiles * 5280)} ft` : `${distanceMiles.toFixed(1)} mi`
  const fmtEta = etaMinutes < 1 ? '<1 min' : etaMinutes < 60 ? `${Math.round(etaMinutes)} min` : `${Math.floor(etaMinutes / 60)}h ${Math.round(etaMinutes % 60)}m`

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur border shadow-lg transition-colors duration-300 ${accent}`}>
      <div className="flex items-center gap-1.5">
        <Clock size={14} className={iconAccent} />
        <span className="text-sm font-semibold text-white tabular-nums">{fmtEta}</span>
      </div>
      <div className="w-px h-4 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <Route size={14} className={iconAccent} />
        <span className="text-sm font-medium text-white/80 tabular-nums">{fmtDist}</span>
      </div>
      {destination && (
        <>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={14} className="text-white/60 shrink-0" />
            <span className="text-xs text-white/60 truncate">{destination}</span>
          </div>
        </>
      )}
    </div>
  )
}
