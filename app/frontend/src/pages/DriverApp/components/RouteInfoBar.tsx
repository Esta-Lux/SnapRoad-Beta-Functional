/**
 * Route info bar: ETA, arrival time, distance remaining shown during navigation.
 * Baidu-style: clean white/slate card, horizontal layout.
 */

function arrivalTimeFromEta(etaMinutes: number): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + Math.round(etaMinutes))
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface RouteInfoBarProps {
  distanceMiles: number
  etaMinutes: number
  destination?: string
  mode?: 'calm' | 'adaptive' | 'sport'
}

export default function RouteInfoBar({
  distanceMiles,
  etaMinutes,
  destination,
}: RouteInfoBarProps) {
  const fmtDist =
    distanceMiles < 0.1
      ? `${Math.round(distanceMiles * 5280)} ft`
      : `${distanceMiles.toFixed(1)} mi`
  const fmtEta =
    etaMinutes < 1
      ? '<1 min'
      : etaMinutes < 60
        ? `${Math.round(etaMinutes)} min`
        : `${Math.floor(etaMinutes / 60)}h ${Math.round(etaMinutes % 60)}m`
  const arriveAt = arrivalTimeFromEta(etaMinutes)

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-gray-100 transition-all duration-300 ease-in-out">
      <div>
        <p className="text-[13px] text-slate-500">Arrive</p>
        <p className="text-lg font-semibold text-slate-800 tabular-nums">{arriveAt}</p>
      </div>
      <div className="w-px h-8 bg-slate-200" />
      <div>
        <p className="text-[13px] text-slate-500">Distance</p>
        <p className="text-lg font-semibold text-slate-800 tabular-nums">{fmtDist}</p>
      </div>
      <div className="w-px h-8 bg-slate-200" />
      <div>
        <p className="text-[13px] text-slate-500">Time</p>
        <p className="text-lg font-semibold text-slate-800 tabular-nums">{fmtEta}</p>
      </div>
      {destination && (
        <>
          <div className="w-px h-8 bg-slate-200" />
          <div className="min-w-0 flex-1 truncate">
            <p className="text-[13px] text-slate-500 truncate">{destination}</p>
          </div>
        </>
      )}
    </div>
  )
}
