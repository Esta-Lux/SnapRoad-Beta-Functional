/**
 * Speed indicator widget for map overlay.
 * Shows user speed + optional speed limit sign (US style).
 */

import type { DrivingMode } from '@/core/types'

interface SpeedIndicatorProps {
  velocityMs: number
  mode?: DrivingMode
  speedLimitMph?: number
  className?: string
}

export default function SpeedIndicator({
  velocityMs,
  mode = 'adaptive',
  speedLimitMph,
  className = '',
}: SpeedIndicatorProps) {
  const mph = Math.round(velocityMs * 2.237)

  const ring =
    mode === 'sport'
      ? 'border-red-500/60 text-red-500'
      : mode === 'calm'
        ? 'border-blue-400/60 text-blue-500'
        : 'border-gray-300 text-slate-900'

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div
        className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white/95 backdrop-blur border-2 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${ring}`}
      >
        <span className="text-base font-bold tabular-nums leading-none">{mph}</span>
        <span className="text-[8px] text-slate-400 mt-0.5">mph</span>
      </div>
      {speedLimitMph != null && (
        <div className="w-12 bg-white rounded-sm border-2 border-slate-800 flex flex-col items-center py-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
          <span className="text-[6px] font-bold text-slate-800 leading-none tracking-tight">SPEED</span>
          <span className="text-[6px] font-bold text-slate-800 leading-none tracking-tight">LIMIT</span>
          <span className="text-sm font-black text-slate-900 leading-none mt-0.5 tabular-nums">{speedLimitMph}</span>
        </div>
      )}
    </div>
  )
}
