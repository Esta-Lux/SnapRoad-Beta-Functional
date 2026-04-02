import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export default function OfferLocationPicker({ lat, lng, onChange }: Props) {
  const center: [number, number] = [
    typeof lat === 'number' ? lat : 39.9612,
    typeof lng === 'number' ? lng : -82.9988,
  ]

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <MapContainer center={center} zoom={13} style={{ height: 260, width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {typeof lat === 'number' && typeof lng === 'number' && (
          <CircleMarker center={[lat, lng]} radius={10} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.7 }} />
        )}
      </MapContainer>
      <div className="px-4 py-3 text-xs text-slate-400 bg-slate-900/60">
        Click anywhere on the map to update offer coordinates.
      </div>
    </div>
  )
}
