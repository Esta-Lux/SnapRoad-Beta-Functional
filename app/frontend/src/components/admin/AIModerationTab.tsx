// AI Moderation Tab - Ryan's Live Moderation System
// =============================================

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Eye, Zap, CheckCircle, XCircle, MapPin, Clock, EyeOff,
  SlidersHorizontal
} from 'lucide-react'
import { Incident, IncidentTab, AIModerationTabProps } from '@/types/admin'

// Mock data and constants
const STATUS_BADGES: Record<string, string> = {
  new: 'bg-[#E6ECF5] text-[#0B1220]',
  blurred: 'bg-[#0084FF]/10 text-[#0084FF]',
  review: 'bg-[#0084FF]/10 text-[#0084FF]',
  approved: 'bg-[#00FFD7]/10 text-[#00FFD7]',
  rejected: 'bg-[#FF5A5A]/10 text-[#FF5A5A]',
}

const INCIDENTS_MOCK: Incident[] = [
  { id: 1, type: 'Speeding (85mph in 65)', confidence: 94, status: 'new', blurred: false, location: 'I-70 E, Columbus OH', reportedAt: '2 min ago' },
  { id: 2, type: 'Hard Braking Event', confidence: 88, status: 'new', blurred: true, location: 'High St & Broad, Columbus', reportedAt: '8 min ago' },
  { id: 3, type: 'Reckless Lane Change', confidence: 96, status: 'review', blurred: true, location: 'I-270 S, Exit 17', reportedAt: '15 min ago' },
  { id: 4, type: 'Phone Usage Detected', confidence: 91, status: 'new', blurred: false, location: '5th Ave, Columbus OH', reportedAt: '22 min ago' },
  { id: 5, type: 'Red Light Violation', confidence: 83, status: 'review', blurred: false, location: 'Broad & 4th, Columbus', reportedAt: '31 min ago' },
  { id: 6, type: 'Road Obstruction', confidence: 79, status: 'approved', blurred: false, location: 'Morse Rd, Columbus', reportedAt: '1 hr ago' },
  { id: 7, type: 'Aggressive Tailgating', confidence: 90, status: 'new', blurred: true, location: 'I-71 N, near Dublin', reportedAt: '45 min ago' },
  { id: 8, type: 'Wrong Way Driver', confidence: 99, status: 'review', blurred: false, location: 'SR-315 N, Columbus', reportedAt: '2 hrs ago' },
  { id: 9, type: 'Sharp Cornering', confidence: 76, status: 'rejected', blurred: false, location: 'Riverside Dr, Columbus', reportedAt: '3 hrs ago' },
]

const WS_BASE = (() => {
  const apiUrl = (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '')
  const httpBase = apiUrl || 'http://localhost:8001'
  return httpBase.replace(/^https/, 'wss').replace(/^http:\/\//, 'ws://')
})()

export default function AIModerationTab({ theme }: AIModerationTabProps) {
  const [activeModTab, setActiveModTab] = useState<IncidentTab>('new')
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS_MOCK)
  const [confidenceThreshold, setConfidenceThreshold] = useState(80)
  const [wsStatus, setWsStatus] = useState<'live' | 'connecting' | 'offline'>('offline')
  const [adminCount, setAdminCount] = useState(1)
  const [liveToast, setLiveToast] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<number | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null
    let retryTimeout: number

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_BASE}/api/ws/admin/moderation`)
        wsRef.current = ws

        ws.onopen = () => {
          setWsStatus('live')
          setLiveToast('Connected to moderation queue')
          setTimeout(() => setLiveToast(null), 3000)

          // Start ping/pong
          pingRef.current = window.setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }))
            }
          }, 30000)
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data)
          if (msg.type === 'pong') return
          
          if (msg.type === 'incident_new') {
            setIncidents(prev => [msg.incident, ...prev])
            setLiveToast(`New incident: ${msg.incident.type}`)
            setTimeout(() => setLiveToast(null), 4000)
            setActiveModTab('new')
          } else if (msg.type === 'moderation_update') {
            setIncidents(prev => prev.map(i =>
              i.id === msg.incident_id ? { ...i, status: msg.outcome } : i
            ))
          } else if (msg.type === 'admin_count') {
            setAdminCount(msg.count)
          }
        }

        ws.onclose = () => {
          setWsStatus('offline')
          if (pingRef.current) window.clearInterval(pingRef.current)
          retryTimeout = window.setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          setWsStatus('offline')
        }
      } catch (err) {
        console.error('WebSocket connection failed:', err)
        setWsStatus('offline')
        retryTimeout = window.setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      ws?.close()
      if (pingRef.current) window.clearInterval(pingRef.current)
      window.clearTimeout(retryTimeout)
    }
  }, [])

  const handleModeration = (id: number, outcome: 'approved' | 'rejected') => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: outcome } : i))
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'moderate', incident_id: id, outcome }))
    }
  }

  const simulateIncident = async () => {
    const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''
    await fetch(`${API_BASE}/api/admin/moderation/simulate`, { method: 'POST' })
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (activeModTab === 'blurred') return i.blurred
      return i.status === activeModTab
    }).filter(i => i.confidence >= confidenceThreshold)
  }, [incidents, activeModTab, confidenceThreshold])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  return (
    <div className="space-y-6">
      {/* Live Toast */}
      {liveToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#0084FF] text-white px-5 py-3 rounded-2xl shadow-2xl animate-slide-up">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="font-medium text-sm">{liveToast}</span>
        </div>
      )}

      {/* Header Row with Live Badge + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* WebSocket Status Badge */}
          <div data-testid="ws-status-badge"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              wsStatus === 'live'
                ? 'border-[#00DFA2]/40 bg-[#00DFA2]/10 text-[#00DFA2]'
                : wsStatus === 'connecting'
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                  : 'border-[#FF5A5A]/40 bg-[#FF5A5A]/10 text-[#FF5A5A]'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              wsStatus === 'live' ? 'bg-[#00DFA2] animate-pulse' :
              wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
              'bg-[#FF5A5A]'
            }`} />
            {wsStatus === 'live' ? `Live · ${adminCount} admin${adminCount !== 1 ? 's' : ''} online` :
             wsStatus === 'connecting' ? 'Connecting...' : 'Offline – retrying'}
          </div>
        </div>
        {/* Simulate Incident button */}
        <button onClick={simulateIncident} data-testid="simulate-incident-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084FF]/10 border border-[#0084FF]/20 text-[#0084FF] text-sm font-semibold hover:bg-[#0084FF]/20 transition-all">
          <Zap size={14} />Generate Test Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {(['new', 'blurred', 'review', 'approved', 'rejected'] as IncidentTab[]).map(tab => {
          const count = incidents.filter(i => tab === 'blurred' ? i.blurred : i.status === tab).length
          const colors: Record<string, string> = { new: '#0084FF', blurred: '#8B5CF6', review: '#F59E0B', approved: '#00FFD7', rejected: '#FF5A5A' }
          return (
            <button key={tab} onClick={() => setActiveModTab(tab)}
              data-testid={`mod-tab-${tab}`}
              className={`p-4 rounded-2xl border transition-all text-left ${activeModTab === tab ? 'border-[#0084FF] ring-1 ring-[#0084FF]/30' : card}`}>
              <div className="text-2xl font-bold mb-1" style={{ color: colors[tab] }}>{count}</div>
              <div className={`text-xs capitalize ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>{tab}</div>
            </button>
          )
        })}
      </div>

      {/* Confidence Slider */}
      <div className={`p-5 rounded-2xl border ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className={isDark ? 'text-white/60' : 'text-[#4B5C74]'} />
            <span className={`text-sm ${isDark ? 'text-white/80' : 'text-[#0B1220]'}`}>Confidence Threshold</span>
          </div>
          <span className="text-[#0084FF] font-semibold">{confidenceThreshold}%</span>
        </div>
        <input type="range" min="0" max="100" value={confidenceThreshold}
          onChange={e => setConfidenceThreshold(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #0084FF ${confidenceThreshold}%, ${isDark ? '#334155' : '#E6ECF5'} ${confidenceThreshold}%)` }} />
        <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Showing incidents above {confidenceThreshold}% confidence</p>
      </div>

      {/* Incidents Grid */}
      {filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {filteredIncidents.map(incident => {
            const canModerate = incident.status === 'new' || incident.status === 'review'
            const isNew = incident.reportedAt === 'just now'
            return (
              <div key={incident.id} data-testid={`incident-${incident.id}`}
                className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${card} ${isNew ? 'ring-1 ring-[#0084FF]/40' : ''}`}>
                {isNew && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF] animate-pulse" />
                    <span className="text-[#0084FF] text-xs font-semibold">Live</span>
                  </div>
                )}
                {/* Image Preview */}
                <div className={`relative w-full h-36 rounded-xl mb-4 overflow-hidden ${isDark ? 'bg-slate-700/50' : 'bg-[#F5F8FA]'}`}>
                  <img src={`https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&auto=format&fit=crop`}
                    alt="Incident" className="w-full h-full object-cover" />
                  {incident.blurred && (
                    <div className="absolute inset-0 backdrop-blur-xl bg-black/40 flex items-center justify-center">
                      <EyeOff size={24} className="text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium">
                    {incident.confidence}%
                  </div>
                </div>

                <div className="flex items-start justify-between mb-2">
                  <p className={`text-sm font-medium flex-1 mr-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{incident.type}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] shrink-0 ${STATUS_BADGES[incident.status]}`}>
                    {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-xs mb-4 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                  <MapPin size={10} />{incident.location}
                  <span className="mx-1">·</span>
                  <Clock size={10} />{incident.reportedAt}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleModeration(incident.id, 'approved')} disabled={!canModerate}
                    className={`flex-1 h-11 rounded-xl bg-[#00FFD7] text-[#0B1220] text-sm font-semibold flex items-center justify-center gap-2 transition-all ${canModerate ? 'hover:opacity-90' : 'opacity-30 cursor-not-allowed'}`}>
                    <CheckCircle size={16} />Approve
                  </button>
                  <button onClick={() => handleModeration(incident.id, 'rejected')} disabled={!canModerate}
                    className={`flex-1 h-11 rounded-xl bg-[#FF5A5A] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${canModerate ? 'hover:opacity-90' : 'opacity-30 cursor-not-allowed'}`}>
                    <XCircle size={16} />Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`text-center py-12 rounded-2xl border ${card}`}>
          <Eye size={48} className={isDark ? 'text-white/20' : 'text-[#4B5C74]'} />
          <p className={`mt-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>No incidents match current filters</p>
        </div>
      )}
    </div>
  )
}
