import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, Fuel, Plus, TrendingUp, TrendingDown, DollarSign, Droplet, Calendar, BarChart3, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface FuelEntry {
  id: number
  date: string
  station: string
  price_per_gallon: number
  gallons: number
  total: number
  odometer: number
}

interface FuelTrackerProps {
  isOpen: boolean
  onClose: () => void
  isPremium: boolean
}

export default function FuelTracker({ isOpen, onClose, isPremium }: FuelTrackerProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [tab, setTab] = useState<'history' | 'log' | 'trends' | 'prices' | 'analytics'>('history')
  const [history, setHistory] = useState<FuelEntry[]>([])
  const [stats, setStats] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [trendStats, setTrendStats] = useState<any>(null)
  const [prices, setPrices] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    station: '',
    price_per_gallon: '',
    gallons: '',
    total: ''
  })
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    if (isOpen && isPremium) {
      loadHistory()
      loadTrends()
      loadPrices()
      loadAnalytics()
    }
  }, [isOpen, isPremium])

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fuel/history`)
      const data = await res.json()
      if (data.success) {
        setHistory(data.data)
        setStats(data.stats)
      }
    } catch (e) {
      console.log('Could not load fuel history')
    }
  }

  const loadTrends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fuel/trends`)
      const data = await res.json()
      if (data.success) {
        setTrends(data.data)
        setTrendStats(data)
      }
    } catch (e) {
      console.log('Could not load trends')
    }
  }

  const loadPrices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fuel/prices`)
      if (res.ok) {
        const data = await res.json()
        setPrices(data.data ?? data.prices ?? [])
      }
    } catch { /* prices unavailable */ }
  }

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fuel/analytics`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data.data ?? data)
      }
    } catch { /* analytics unavailable */ }
  }

  const handleLog = async () => {
    if (!logForm.price_per_gallon || !logForm.gallons || !logForm.total) {
      toast.error('Please fill in all required fields')
      return
    }

    setLogging(true)
    try {
      const res = await fetch(`${API_URL}/api/fuel/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: logForm.date,
          station: logForm.station || 'Unknown',
          price_per_gallon: parseFloat(logForm.price_per_gallon),
          gallons: parseFloat(logForm.gallons),
          total: parseFloat(logForm.total)
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setLogForm({ date: new Date().toISOString().split('T')[0], station: '', price_per_gallon: '', gallons: '', total: '' })
        loadHistory()
        setTab('history')
      }
    } catch (e) {
      toast.error('Could not log purchase')
    }
    setLogging(false)
  }

  // Auto-calculate total
  useEffect(() => {
    if (logForm.price_per_gallon && logForm.gallons) {
      const total = parseFloat(logForm.price_per_gallon) * parseFloat(logForm.gallons)
      setLogForm(prev => ({ ...prev, total: total.toFixed(2) }))
    }
  }, [logForm.price_per_gallon, logForm.gallons])

  if (!isOpen) return null

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-2`} onClick={onClose}>
      <div className={`w-full max-w-md h-[85vh] ${modalBg} rounded-2xl overflow-hidden flex flex-col shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fuel className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Fuel Tracker</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">${stats.this_month.spent}</p>
                <p className="text-amber-200 text-[9px]">This Month</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{stats.this_month.gallons}g</p>
                <p className="text-amber-200 text-[9px]">Gallons</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">${stats.avg_price}</p>
                <p className="text-amber-200 text-[9px]">Avg/gal</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-white font-bold text-sm">{stats.avg_mpg}</p>
                <p className="text-amber-200 text-[9px]">MPG</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto">
            {(['history', 'log', 'trends', 'prices', 'analytics'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2.5 py-2 rounded-lg text-[10px] font-medium capitalize whitespace-nowrap ${tab === t ? 'bg-white text-amber-600' : 'bg-white/10 text-white'}`}>
                {t === 'log' ? '+ Log' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {tab === 'history' && (
            <div className="space-y-2">
              {history.map(entry => (
                <div key={entry.id} className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{entry.station}</p>
                      <p className="text-slate-400 text-xs">{entry.date}</p>
                    </div>
                    <p className="text-amber-400 font-bold">${entry.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Droplet size={10} /> {entry.gallons}g
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={10} /> ${entry.price_per_gallon.toFixed(2)}/gal
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'log' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Date</label>
                <input type="date" value={logForm.date}
                  onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Station (optional)</label>
                <input type="text" placeholder="e.g., Shell, Chevron" value={logForm.station}
                  onChange={e => setLogForm({ ...logForm, station: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Price/Gallon *</label>
                  <div className="bg-slate-800 rounded-xl px-3 py-2 flex items-center">
                    <span className="text-slate-400 mr-1">$</span>
                    <input type="number" step="0.01" placeholder="3.29" value={logForm.price_per_gallon}
                      onChange={e => setLogForm({ ...logForm, price_per_gallon: e.target.value })}
                      className="flex-1 bg-transparent text-white text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Gallons *</label>
                  <input type="number" step="0.1" placeholder="12.5" value={logForm.gallons}
                    onChange={e => setLogForm({ ...logForm, gallons: e.target.value })}
                    className="w-full bg-slate-800 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1 block">Total Cost *</label>
                <div className="bg-slate-800 rounded-xl px-3 py-2 flex items-center">
                  <span className="text-slate-400 mr-1">$</span>
                  <input type="number" step="0.01" placeholder="41.13" value={logForm.total}
                    onChange={e => setLogForm({ ...logForm, total: e.target.value })}
                    className="flex-1 bg-transparent text-white text-sm outline-none" />
                </div>
              </div>

              <button onClick={handleLog} disabled={logging}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus size={16} /> {logging ? 'Logging...' : 'Log Fuel Purchase'}
              </button>
            </div>
          )}

          {tab === 'trends' && trendStats && (
            <div>
              {/* Price Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-emerald-400 font-bold">${trendStats.lowest}</p>
                  <p className="text-slate-400 text-[10px]">30d Low</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-white font-bold">${trendStats.avg_price}</p>
                  <p className="text-slate-400 text-[10px]">Average</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-red-400 font-bold">${trendStats.highest}</p>
                  <p className="text-slate-400 text-[10px]">30d High</p>
                </div>
              </div>

              {/* Simple Chart */}
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-white font-medium mb-3">30-Day Price Trend</p>
                <div className="h-32 flex items-end gap-0.5">
                  {trends.slice(-30).map((t, i) => {
                    const min = trendStats.lowest
                    const max = trendStats.highest
                    const height = ((t.price - min) / (max - min)) * 100
                    return (
                      <div key={i} className="flex-1 bg-amber-500 rounded-t transition-all hover:bg-amber-400"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${t.date}: $${t.price}`} />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-slate-500 text-[10px]">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              <p className="text-slate-500 text-xs text-center mt-3">
                Prices based on your local area
              </p>
            </div>
          )}

          {tab === 'prices' && (
            <div className="space-y-2">
              {prices.length > 0 ? prices.map((p: any, i: number) => (
                <div key={i} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.station || p.name || 'Station'}</p>
                    <p className="text-slate-400 text-[10px]">{p.address || p.distance || ''}</p>
                  </div>
                  <p className="text-amber-400 font-bold text-sm">${(p.price ?? p.price_per_gallon ?? 0).toFixed(2)}</p>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Fuel className="text-slate-600 mx-auto mb-2" size={28} />
                  <p className="text-slate-400 text-sm">No nearby fuel prices available</p>
                </div>
              )}
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-3">
              {analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-emerald-400 font-bold text-lg">{analytics.avg_mpg ?? analytics.efficiency ?? '—'}</p>
                      <p className="text-slate-400 text-[10px]">Avg MPG</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-amber-400 font-bold text-lg">${analytics.monthly_spend ?? analytics.total_spend ?? '—'}</p>
                      <p className="text-slate-400 text-[10px]">Monthly Spend</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-blue-400 font-bold text-lg">{analytics.total_gallons ?? '—'}</p>
                      <p className="text-slate-400 text-[10px]">Total Gallons</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-purple-400 font-bold text-lg">{analytics.fill_ups ?? '—'}</p>
                      <p className="text-slate-400 text-[10px]">Fill-ups</p>
                    </div>
                  </div>
                  {analytics.recommendation && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <p className="text-emerald-400 text-xs font-medium mb-1">Tip</p>
                      <p className="text-slate-300 text-xs">{analytics.recommendation}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="text-slate-600 mx-auto mb-2" size={28} />
                  <p className="text-slate-400 text-sm">Analytics loading...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
