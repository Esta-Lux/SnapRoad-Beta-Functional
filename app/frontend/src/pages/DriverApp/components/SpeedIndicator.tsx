/**
 * Speed indicator widget for map overlay.
 * Adapts styling to driving mode.
 */

import type { DrivingMode } from '@/core/types'

interface SpeedIndicatorProps {
  velocityMs: number
  mode?: DrivingMode
  className?: string
}

export default function SpeedIndicator({ velocityMs, mode = 'adaptive', className = '' }: SpeedIndicatorProps) {
  const mph = Math.round(velocityMs * 2.237)

  const ring =
    mode === 'sport' ? 'border-red-500/60 text-red-300' :
    mode === 'calm' ? 'border-blue-400/60 text-blue-300' :
    'border-emerald-400/60 text-white'

  return (
    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full bg-slate-900/85 backdrop-blur border-2 transition-colors duration-300 ${ring} ${className}`}>
      <span className="text-base font-bold tabular-nums leading-none">{mph}</span>
      <span className="text-[8px] opacity-50 mt-0.5">mph</span>
    </div>
  )
}
