interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

/**
 * Safe fallback picker for admin offer coordinates.
 * Avoids map-lib runtime crashes in production bundles.
 */
export default function OfferLocationPicker({ lat, lng, onChange }: Readonly<Props>) {
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const coordText = hasCoords ? `${lat},${lng}` : ''
  const mapsHref = hasCoords
    ? `https://www.google.com/maps?q=${encodeURIComponent(coordText)}`
    : 'https://www.google.com/maps'

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <div className="h-[260px] w-full bg-slate-900/50 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-xs text-slate-300">
          Map preview is disabled for stability. Use the latitude/longitude fields above.
        </p>
        {hasCoords ? (
          <p className="text-[11px] text-emerald-300">
            Current pin: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">No coordinates selected yet.</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(39.9612, -82.9988)}
            className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Use Columbus center
          </button>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
      <div className="px-4 py-3 text-xs text-slate-400 bg-slate-900/60">
        Save Allocation after updating coordinates.
      </div>
    </div>
  )
}
