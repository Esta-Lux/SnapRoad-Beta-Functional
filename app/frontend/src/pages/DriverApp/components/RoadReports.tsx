import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  AlertTriangle, Construction, Car, Shield, Cloud, MapPin, 
  ThumbsUp, X, Camera, Plus, Clock, ChevronLeft, Trash2, Send
} from 'lucide-react'

interface RoadReport {
  id: number
  user_id: string
  type: string
  title: string
  description: string
  lat: number
  lng: number
  upvotes: number
  upvoters: string[]
  created_at: string
  expires_at: string
  verified: boolean
  photo_url?: string
}

interface RoadReportsProps {
  isOpen: boolean
  onClose: () => void
  onCreateReport: (report: { type: string; title: string; description: string; lat: number; lng: number }) => Promise<any>
  onUpvote: (reportId: number) => Promise<any>
  currentUserId: string
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

const REPORT_TYPES = [
  { type: 'hazard', label: 'Hazard', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/20' },
  { type: 'accident', label: 'Accident', icon: Car, color: 'text-red-500', bg: 'bg-red-500/20' },
  { type: 'construction', label: 'Construction', icon: Construction, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { type: 'police', label: 'Police', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/20' },
  { type: 'weather', label: 'Weather', icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-500/20' },
]

export default function RoadReports({ isOpen, onClose, onCreateReport, onUpvote, currentUserId }: RoadReportsProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [reports, setReports] = useState<RoadReport[]>([])
  const [myReports, setMyReports] = useState<RoadReport[]>([])
  const [activeTab, setActiveTab] = useState<'nearby' | 'my'>('nearby')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_reports: 0, total_upvotes: 0, gems_from_upvotes: 0 })

  const bg = isLight ? 'bg-slate-50' : 'bg-[#0a0a0f]'
  const headerBg = isLight ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-br from-slate-800 via-slate-900 to-[#0a0a0f]'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const statsBarBg = isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5'
  const tabInactive = isLight ? 'text-slate-500' : 'text-slate-400'
  const listBg = isLight ? 'bg-slate-50' : 'bg-[#0a0a0f]'
  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-800/80 border-white/10'
  
  // Create form state
  const [newReport, setNewReport] = useState({
    type: 'hazard',
    title: '',
    description: '',
    lat: 39.9612,  // Default: Columbus, OH
    lng: -82.9988,
  })

  useEffect(() => {
    if (isOpen) {
      loadReports()
    }
  }, [isOpen])

  const loadReports = async () => {
    setLoading(true)
    try {
      const [allRes, myRes] = await Promise.all([
        fetch(`${API_URL}/api/reports`).then(r => r.json()),
        fetch(`${API_URL}/api/reports/my`).then(r => r.json())
      ])
      
      if (allRes.success) setReports(Array.isArray(allRes.data) ? allRes.data : [])
      if (myRes.success) {
        setMyReports(Array.isArray(myRes.data) ? myRes.data : [])
        setStats(myRes.stats && typeof myRes.stats === 'object' ? myRes.stats : { total_reports: 0, total_upvotes: 0, gems_from_upvotes: 0 })
      }
    } catch (e) {
      console.log('Error loading reports')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReport = async () => {
    if (!newReport.title.trim()) return
    
    try {
      const result = await onCreateReport(newReport)
      if (result?.success) {
        setShowCreate(false)
        setNewReport({ type: 'hazard', title: '', description: '', lat: 39.9612, lng: -82.9988 })
        loadReports()
      }
    } catch (e) {
      console.log('Error creating report')
    }
  }

  const handleUpvote = async (reportId: number) => {
    try {
      await onUpvote(reportId)
      loadReports()
    } catch (e) {
      console.log('Error upvoting')
    }
  }

  const getReportIcon = (type: string) => {
    const config = REPORT_TYPES.find(t => t.type === type)
    return config || REPORT_TYPES[0]
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  if (!isOpen) return null

  const reportList = activeTab === 'nearby' ? reports : myReports
  const safeReportList = Array.isArray(reportList) ? reportList : []

  return (
    <div className={`fixed inset-0 ${bg} z-50 flex flex-col`}>
      {/* Header - theme-aware */}
      <div className={`${headerBg} px-4 py-4 flex items-center gap-3 border-b ${isLight ? 'border-white/20' : 'border-white/10'}`}>
        <button onClick={onClose} className="text-white/90 hover:text-white p-1" data-testid="reports-close">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Road Reports</h1>
          <p className="text-white/80 text-xs">Help other drivers stay safe</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl flex items-center gap-2 border border-white/30 transition-colors"
          data-testid="create-report-btn"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">+ Report</span>
        </button>
      </div>

      {/* Stats Bar - theme-aware */}
      <div className={`px-4 py-3 flex items-center justify-around border-b ${statsBarBg}`}>
        <div className="text-center">
          <p className={`font-bold ${textPrimary}`}>{stats.total_reports ?? 0}</p>
          <p className={`text-xs ${textMuted}`}>Reports</p>
        </div>
        <div className="text-center">
          <p className={`font-bold ${textPrimary}`}>{stats.total_upvotes ?? 0}</p>
          <p className={`text-xs ${textMuted}`}>Upvotes</p>
        </div>
        <div className="text-center">
          <p className={`font-bold flex items-center justify-center gap-1 ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
            💎 {stats.gems_from_upvotes ?? 0}
          </p>
          <p className={`text-xs ${textMuted}`}>Gems Earned</p>
        </div>
      </div>

      {/* Tabs - theme-aware */}
      <div className={`flex border-b ${isLight ? 'bg-white border-slate-200' : 'bg-black/10 border-white/5'}`}>
        <button 
          onClick={() => setActiveTab('nearby')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'nearby' ? (isLight ? 'text-amber-600 border-b-2 border-amber-500' : 'text-amber-400 border-b-2 border-amber-400') : tabInactive
          }`}
          data-testid="tab-nearby"
        >
          Nearby Reports
        </button>
        <button 
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'my' ? (isLight ? 'text-amber-600 border-b-2 border-amber-500' : 'text-amber-400 border-b-2 border-amber-400') : tabInactive
          }`}
          data-testid="tab-my-reports"
        >
          My Reports
        </button>
      </div>

      {/* Reports List - theme-aware */}
      <div className={`flex-1 overflow-auto p-4 space-y-3 ${listBg}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          safeReportList.map(report => {
            const typeConfig = getReportIcon(report.type)
            const Icon = typeConfig.icon
            const upvoters = Array.isArray(report.upvoters) ? report.upvoters : []
            const hasUpvoted = upvoters.includes(currentUserId)
            const isOwn = report.user_id === currentUserId
            const lat = Number(report.lat)
            const lng = Number(report.lng)
            
            return (
              <div 
                key={report.id}
                className={`${cardBg} rounded-xl p-4 border shadow-lg`}
                data-testid={`report-${report.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                    <Icon size={20} className={typeConfig.color} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {report.photo_url && (
                      <img src={report.photo_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                    )}
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium text-sm truncate ${textPrimary}`}>{report.title}</h3>
                      {report.verified && (
                        <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${textMuted}`}>{report.description}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                        <Clock size={12} />
                        {formatTimeAgo(report.created_at)}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${textMuted}`}>
                        <MapPin size={12} />
                        {!Number.isNaN(lat) && !Number.isNaN(lng) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : '—'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => !isOwn && !hasUpvoted && handleUpvote(report.id)}
                    disabled={isOwn || hasUpvoted}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                      hasUpvoted 
                        ? 'bg-amber-500/20 text-amber-500' 
                        : isOwn 
                          ? (isLight ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                          : (isLight ? 'bg-slate-200 hover:bg-amber-100 text-slate-600 hover:text-amber-600' : 'bg-slate-700 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400')
                    }`}
                    data-testid={`upvote-${report.id}`}
                  >
                    <ThumbsUp size={16} className={hasUpvoted ? 'fill-current' : ''} />
                    <span className="text-xs font-medium">{report.upvotes ?? 0}</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
        
        {!loading && safeReportList.length === 0 && (
          <div className="text-center py-8">
            <MapPin className={`mx-auto mb-2 ${textMuted}`} size={32} />
            <p className={`text-sm ${textMuted}`}>No reports yet</p>
            <p className={`text-xs mt-1 ${textMuted}`}>Be the first to help other drivers!</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className={`fixed inset-0 z-50 flex items-end justify-center ${isLight ? 'bg-black/40' : 'bg-black/60'}`}>
          <div className={`w-full max-w-lg rounded-t-3xl p-6 animate-slide-up border-t ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-lg ${textPrimary}`}>New Report</h2>
              <button onClick={() => setShowCreate(false)} className={textMuted}>
                <X size={24} />
              </button>
            </div>

            <p className={`text-xs mb-2 ${textMuted}`}>Report Type</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {REPORT_TYPES.map(t => (
                <button
                  key={t.type}
                  onClick={() => setNewReport(prev => ({ ...prev, type: t.type }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    newReport.type === t.type 
                      ? `${t.bg} ${t.color} border border-current` 
                      : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'
                  }`}
                  data-testid={`type-${t.type}`}
                >
                  <t.icon size={16} />
                  <span className="text-sm">{t.label}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={newReport.title}
              onChange={e => setNewReport(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief title (e.g., 'Pothole on Main St')"
              className={`w-full px-4 py-3 rounded-xl mb-3 resize-none ${isLight ? 'bg-slate-100 text-slate-900 placeholder:text-slate-500 border border-slate-200' : 'bg-slate-700 text-white placeholder:text-slate-500'}`}
              data-testid="report-title-input"
            />

            <textarea
              value={newReport.description}
              onChange={e => setNewReport(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details (optional)"
              rows={3}
              className={`w-full px-4 py-3 rounded-xl mb-3 resize-none ${isLight ? 'bg-slate-100 text-slate-900 placeholder:text-slate-500 border border-slate-200' : 'bg-slate-700 text-white placeholder:text-slate-500'}`}
              data-testid="report-description-input"
            />

            <button className={`w-full px-4 py-3 rounded-xl mb-4 flex items-center justify-center gap-2 ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-700 text-slate-300'}`}>
              <Camera size={18} />
              <span className="text-sm">Add Photo (coming soon)</span>
            </button>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-amber-600 text-sm font-medium">+500 XP for posting</p>
              <p className="text-amber-600/80 text-xs">+10 gems for each upvote you receive</p>
            </div>

            <button
              onClick={handleCreateReport}
              disabled={!newReport.title.trim()}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                newReport.title.trim()
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : isLight ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              data-testid="submit-report-btn"
            >
              <Send size={18} />
              Post Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
