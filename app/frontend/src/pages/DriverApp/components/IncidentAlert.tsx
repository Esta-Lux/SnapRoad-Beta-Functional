import { useEffect, useState } from 'react'
import { X, AlertTriangle, Shield, Construction, CloudSnow, Car, Eye } from 'lucide-react'

const INCIDENT_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; color: string; bg: string; emoji: string; label: string }
> = {
  police: { icon: Shield, color: '#4A90D9', bg: 'from-blue-500/20 to-blue-600/10', emoji: '🚔', label: 'Police Reported' },
  accident: { icon: Car, color: '#D04040', bg: 'from-red-500/20 to-red-600/10', emoji: '🚗', label: 'Accident' },
  crash: { icon: Car, color: '#D04040', bg: 'from-red-500/20 to-red-600/10', emoji: '🚗', label: 'Crash Reported' },
  hazard: { icon: AlertTriangle, color: '#E07830', bg: 'from-orange-500/20 to-orange-600/10', emoji: '⚠️', label: 'Road Hazard' },
  construction: { icon: Construction, color: '#F59E0B', bg: 'from-amber-500/20 to-amber-600/10', emoji: '🚧', label: 'Construction Zone' },
  weather: { icon: CloudSnow, color: '#6BA5D7', bg: 'from-sky-500/20 to-sky-600/10', emoji: '❄️', label: 'Weather Hazard' },
  pothole: { icon: AlertTriangle, color: '#E07830', bg: 'from-orange-500/20 to-orange-600/10', emoji: '🕳️', label: 'Pothole' },
  closure: { icon: AlertTriangle, color: '#D04040', bg: 'from-red-500/20 to-red-600/10', emoji: '🚫', label: 'Road Closed' },
  camera: { icon: Eye, color: '#7A6A9A', bg: 'from-purple-500/20 to-purple-600/10', emoji: '📷', label: 'Speed Camera' },
}

interface IncidentAlertProps {
  incident: {
    id: number
    type: string
    title: string
    distance: number
    lat: number
    lng: number
  } | null
  onDismiss: () => void
  onThankReporter?: () => void
  onNotThere?: () => void
  isLight?: boolean
}

export default function IncidentAlert({ incident, onDismiss, onThankReporter, onNotThere, isLight }: IncidentAlertProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!!incident)
  }, [incident])

  if (!incident) return null

  const config = INCIDENT_CONFIG[(incident.type || '').toLowerCase()] || INCIDENT_CONFIG.hazard
  const distText =
    incident.distance < 0.1 ? `${Math.round(incident.distance * 5280)} ft` : `${incident.distance.toFixed(1)} mi`

  return (
    <div
      className={`fixed top-0 right-0 z-[1050] transition-all duration-500 ease-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ top: 'calc(env(safe-area-inset-top, 44px) + 80px)', right: 16, maxWidth: 340 }}
    >
      <div
        className={`rounded-2xl overflow-hidden shadow-2xl border backdrop-blur-xl ${
          isLight ? 'bg-white/95 border-slate-200/50' : 'bg-slate-900/95 border-white/10'
        }`}
      >
        <div className="h-1" style={{ background: config.color }} />

        <div className="p-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${config.bg}`}
            >
              <span className="text-xl">{config.emoji}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{config.label}</h4>
                <button
                  onClick={onDismiss}
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/10 text-white/40'
                  }`}
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {incident.title || config.label} — <strong>{distText} ahead</strong>
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={onThankReporter}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white/80'
                  }`}
                >
                  👍 Thanks
                </button>
                <button
                  onClick={onNotThere ?? onDismiss}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white/80'
                  }`}
                >
                  Not there
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

