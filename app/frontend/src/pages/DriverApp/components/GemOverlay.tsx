import { useState, useEffect } from 'react'
import { Gem, Sparkles } from 'lucide-react'

interface RouteGem {
  id: string
  lat: number
  lng: number
  value: number
  collected: boolean
}

interface GemOverlayProps {
  tripId: string | null
  isNavigating: boolean
  onGemCollected?: (gem: RouteGem) => void
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function GemOverlay({ tripId, isNavigating, onGemCollected }: GemOverlayProps) {
  const [gems, setGems] = useState<RouteGem[]>([])
  const [collectedCount, setCollectedCount] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<any>(null)

  // Generate gems when navigation starts
  useEffect(() => {
    if (isNavigating && tripId) {
      generateGems()
    }
    if (!isNavigating && tripId && gems.length > 0) {
      fetchSummary()
    }
  }, [isNavigating, tripId])

  // Simulate collecting gems while driving
  useEffect(() => {
    if (!isNavigating || gems.length === 0) return
    const interval = setInterval(() => {
      setGems(prev => {
        const uncollected = prev.filter(g => !g.collected)
        if (uncollected.length === 0) return prev
        const toCollect = uncollected[0]
        collectGem(toCollect)
        return prev.map(g => g.id === toCollect.id ? { ...g, collected: true } : g)
      })
    }, 4000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [isNavigating, gems])

  const generateGems = async () => {
    // Mock route points along a path
    const routePoints = Array.from({ length: 20 }, (_, i) => ({
      lat: 39.96 + i * 0.001,
      lng: -82.99 - i * 0.0005,
    }))
    try {
      const res = await fetch(`${API_URL}/api/gems/generate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, route_points: routePoints }),
      })
      const data = await res.json()
      if (data.success) {
        setGems(data.data.gems)
        setCollectedCount(0)
        setTotalValue(0)
      }
    } catch { /* silently ignore */ }
  }

  const collectGem = async (gem: RouteGem) => {
    try {
      await fetch(`${API_URL}/api/gems/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, gem_id: gem.id }),
      })
      setCollectedCount(c => c + 1)
      setTotalValue(v => v + gem.value)
      onGemCollected?.(gem)
    } catch { /* silently ignore */ }
  }

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/gems/trip-summary/${tripId}`)
      const data = await res.json()
      if (data.success) {
        setSummaryData(data.data)
        setShowSummary(true)
      }
    } catch { /* silently ignore */ }
  }

  if (!isNavigating && !showSummary) return null

  // Trip end summary
  if (showSummary && summaryData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="gem-trip-summary">
        <div className="bg-[#0d1b2a] rounded-2xl p-6 mx-4 max-w-sm w-full border border-cyan-500/20 shadow-xl shadow-cyan-500/10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Trip Complete!</h3>
            <p className="text-white/50 text-sm mb-6">Here's what you earned</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-cyan-400">{summaryData.gems_collected}</p>
                <p className="text-white/40 text-xs">Gems Collected</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-emerald-400">+{summaryData.gems_value}</p>
                <p className="text-white/40 text-xs">Gems Earned</p>
              </div>
            </div>
            <p className="text-white/30 text-xs mb-4">
              New balance: {summaryData.new_balance} gems
            </p>
            <button
              onClick={() => setShowSummary(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold"
              data-testid="gem-summary-close"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // During navigation - small gem counter
  return (
    <div className="absolute top-20 right-4 z-30" data-testid="gem-counter">
      <div className="bg-[#0d1b2a]/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-emerald-500/20 flex items-center gap-2">
        <Gem size={16} className="text-emerald-400" />
        <span className="text-emerald-400 font-bold text-sm">{collectedCount}</span>
        <span className="text-white/30 text-xs">+{totalValue}</span>
      </div>
    </div>
  )
}
