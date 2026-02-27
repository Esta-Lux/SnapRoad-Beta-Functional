import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Building2, Gift, Calendar, Plus, TrendingUp,
  Settings, Bell, LogOut, Search, Filter, Edit2, Trash2,
  BarChart3, Eye, Zap, Check, X, MapPin, Clock, Star,
  AlertTriangle, Gem, Car, Trophy, ChevronRight, Download,
  Sparkles, ArrowRight, ChevronLeft, HelpCircle, Crown, Activity,
  Upload, FileText, Image, RefreshCw, Globe, EyeOff, CheckCircle,
  XCircle, SlidersHorizontal, Sun, Moon, MoreVertical, Wifi, WifiOff
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import toast, { Toaster } from 'react-hot-toast'
import { NotificationCenter, useNotifications, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'
import { useTheme } from '@/contexts/ThemeContext'
import { adminApi } from '@/services/adminApi'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useUsers } from '@/hooks/useUsers'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useIncidents } from '@/hooks/useIncidents'
import type { AdminIncident, IncidentTab, WebSocketStatus, AdminUser } from '@/types/admin'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Event {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'special'
  gems_multiplier: number
  xp_bonus: number
  start_date: string
  end_date: string
  status: 'active' | 'scheduled' | 'ended'
}

interface User {
  id: string
  name: string
  email: string
  plan: 'basic' | 'premium'
  safety_score: number
  gems: number
  level: number
  status: 'active' | 'suspended'
}

interface Partner {
  id: string
  business_name: string
  email: string
  offers_count: number
  total_redemptions: number
  status: 'active' | 'pending' | 'suspended'
}

// Onboarding Component
function OnboardingWalkthrough({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0)
  
  const steps = [
    { title: 'Welcome, Administrator', description: 'You have full control over the SnapRoad platform. Manage users, partners, events, and monitor platform health.', icon: Shield, color: 'from-purple-500 to-pink-500' },
    { title: 'User & Partner Management', description: 'View all drivers, their safety scores, and manage business partners. Approve or suspend accounts as needed.', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { title: 'Create Offers for Businesses', description: 'Help your partners succeed by creating offers on their behalf with AI-generated promotional images.', icon: Gift, color: 'from-emerald-500 to-teal-500' },
    { title: 'Export & Import Data', description: 'Easily export user and offer data to CSV/JSON, or import bulk data to quickly set up new partners.', icon: FileText, color: 'from-amber-500 to-orange-500' },
  ]

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${currentStep.color} rounded-full blur-3xl opacity-30`} />
          <button onClick={onSkip} data-testid="skip-tour-btn" className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10">Skip Tour</button>
          <div className="relative p-8">
            <div className={`w-20 h-20 bg-gradient-to-br ${currentStep.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
              <currentStep.icon className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
            <p className="text-slate-300 text-base leading-relaxed mb-8">{currentStep.description}</p>
            <div className="flex items-center gap-2 mb-6">
              {steps.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-purple-400' : 'w-2 bg-slate-600'}`} />))}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && (<button onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl bg-slate-700/50 text-white font-medium hover:bg-slate-700 flex items-center gap-2"><ChevronLeft size={18} />Back</button>)}
              <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()} className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90`}>
                {step < steps.length - 1 ? (<>Next<ArrowRight size={18} /></>) : (<>Start Managing<Sparkles size={18} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Image Generator Modal
function ImageGeneratorModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (imageUrl: string) => void }) {
  const [prompt, setPrompt] = useState('')
  const [offerType, setOfferType] = useState('retail')
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt) return
    setGenerating(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_URL}/api/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, offer_type: offerType })
      })
      const data = await res.json()
      
      if (data.success && data.data?.image_base64) {
        setGeneratedImage(data.data.image_base64)
      } else {
        setError(data.message || 'Failed to generate image')
      }
    } catch (e) {
      setError('Network error - please try again')
    }
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2"><Image className="text-purple-400" size={24} />AI Image Generator</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Offer Type</label>
                <select value={offerType} onChange={(e) => setOfferType(e.target.value)} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white">
                  <option value="gas">Gas Station</option>
                  <option value="cafe">Cafe / Coffee</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="carwash">Car Wash</option>
                  <option value="retail">Retail / Shopping</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1 block">Describe the Offer</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 20% off premium coffee drinks..." rows={3} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Generated" className="w-full h-48 object-cover rounded-xl" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleGenerate} disabled={generating || !prompt} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {generating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {generating ? 'Generating...' : 'Generate'}
                </button>
                {generatedImage && (
                  <button onClick={() => { onGenerate(generatedImage); onClose() }} className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2">
                    <Check size={18} />Use Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Create Offer for Business Modal
function CreateOfferModal({ onClose, partners }: { onClose: () => void; partners: Partner[] }) {
  const [formData, setFormData] = useState({
    business_name: '',
    business_id: '',
    business_type: 'retail',
    description: '',
    discount_percent: 15,
    base_gems: 50,
    lat: 39.9612,
    lng: -82.9988,
    expires_hours: 24
  })
  const [showImageGenerator, setShowImageGenerator] = useState(false)
  const [offerImage, setOfferImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/offers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.success) onClose()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <>
      {showImageGenerator && <ImageGeneratorModal onClose={() => setShowImageGenerator(false)} onGenerate={(url) => setOfferImage(url)} />}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-xl">Create Offer for Business</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {offerImage && (
                  <div className="relative mb-4">
                    <img src={offerImage} alt="Offer" className="w-full h-32 object-cover rounded-xl" />
                    <button type="button" onClick={() => setOfferImage(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button>
                  </div>
                )}
                <button type="button" onClick={() => setShowImageGenerator(true)} className="w-full border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 flex items-center justify-center gap-2">
                  <Image size={20} />Generate AI Image
                </button>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Select Partner or Enter Name</label>
                  <select value={formData.business_id} onChange={(e) => {
                    const partner = partners.find(p => p.id === e.target.value)
                    setFormData({ ...formData, business_id: e.target.value, business_name: partner?.business_name || '' })
                  }} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-2">
                    <option value="">-- Select Partner --</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.business_name}</option>)}
                  </select>
                  <input type="text" placeholder="Or enter business name manually" value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Business Type</label>
                  <select value={formData.business_type} onChange={(e) => setFormData({ ...formData, business_type: e.target.value })} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white">
                    <option value="gas">Gas Station</option>
                    <option value="cafe">Cafe</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="carwash">Car Wash</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the offer..." rows={2} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Discount %</label>
                    <input type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Gems Reward</label>
                    <input type="number" value={formData.base_gems} onChange={(e) => setFormData({ ...formData, base_gems: Number(e.target.value) })} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Expires In (hours)</label>
                  <input type="number" value={formData.expires_hours} onChange={(e) => setFormData({ ...formData, expires_hours: Number(e.target.value) })} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl hover:from-purple-400 hover:to-pink-400 font-semibold flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                    Create Offer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Export Modal
function ExportModal({ onClose }: { onClose: () => void }) {
  const [exportType, setExportType] = useState<'offers' | 'users'>('offers')
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [loading, setLoading] = useState(false)
  const [exportData, setExportData] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/export/${exportType}?format=${format}`)
      const data = await res.json()
      if (data.success) {
        setExportData(format === 'json' ? JSON.stringify(data.data, null, 2) : data.data)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleDownload = () => {
    if (!exportData) return
    const blob = new Blob([exportData], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snaproad_${exportType}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2"><Download className="text-emerald-400" size={24} />Export Data</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Data Type</label>
                <div className="flex gap-3">
                  <button onClick={() => setExportType('offers')} className={`flex-1 py-3 rounded-xl font-medium ${exportType === 'offers' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-400'}`}>Offers</button>
                  <button onClick={() => setExportType('users')} className={`flex-1 py-3 rounded-xl font-medium ${exportType === 'users' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-400'}`}>Users</button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Format</label>
                <div className="flex gap-3">
                  <button onClick={() => setFormat('json')} className={`flex-1 py-3 rounded-xl font-medium ${format === 'json' ? 'bg-blue-500 text-white' : 'bg-slate-700/50 text-slate-400'}`}>JSON</button>
                  <button onClick={() => setFormat('csv')} className={`flex-1 py-3 rounded-xl font-medium ${format === 'csv' ? 'bg-blue-500 text-white' : 'bg-slate-700/50 text-slate-400'}`}>CSV</button>
                </div>
              </div>

              {exportData && (
                <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-auto">
                  <pre className="text-slate-300 text-xs">{exportData.substring(0, 500)}...</pre>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {!exportData ? (
                  <button onClick={handleExport} disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
                    Generate Export
                  </button>
                ) : (
                  <>
                    <button onClick={() => setExportData(null)} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl">Reset</button>
                    <button onClick={handleDownload} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Download size={18} />Download
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Import Modal
function ImportModal({ onClose }: { onClose: () => void }) {
  const [importData, setImportData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const handleImport = async () => {
    setLoading(true)
    try {
      const offers = JSON.parse(importData)
      const res = await fetch(`${API_URL}/api/admin/import/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers: Array.isArray(offers) ? offers : [offers] })
      })
      const data = await res.json()
      if (data.success) setResult(data.data)
    } catch (e) {
      setResult({ imported: 0, errors: ['Invalid JSON format'] })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2"><Upload className="text-blue-400" size={24} />Import Offers</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Paste JSON Data</label>
                <textarea value={importData} onChange={(e) => setImportData(e.target.value)} placeholder='[{"business_name": "...", "business_type": "cafe", "description": "...", "base_gems": 50}]' rows={6} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-mono text-xs resize-none" />
              </div>

              {result && (
                <div className={`rounded-xl p-4 ${result.imported > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className={result.imported > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {result.imported > 0 ? `✓ Imported ${result.imported} offers` : '✗ Import failed'}
                  </p>
                  {result.errors.length > 0 && <p className="text-red-400 text-sm mt-1">{result.errors.join(', ')}</p>}
                </div>
              )}

              <button onClick={handleImport} disabled={loading || !importData} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                Import Offers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Admin Dashboard
// Admin Offers List - fetches and displays all offers
function AdminOffersList() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadOffers() }, [])

  const loadOffers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/offers`)
      const data = await res.json()
      if (data.success) setOffers(data.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  if (loading) return <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto" /></div>

  return (
    <div className="space-y-2">
      {offers.map(o => (
        <div key={o.id} className="bg-slate-800/50 rounded-xl border border-white/5 p-4 flex items-center gap-4" data-testid={`admin-offer-${o.id}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${o.offer_url ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
            {o.offer_url ? <Globe size={18} className="text-blue-400" /> : <Gift size={18} className="text-emerald-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium truncate">{o.business_name}</p>
              {o.offer_url && <span className="text-blue-400 bg-blue-500/10 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">3rd Party</span>}
              {o.is_admin_offer && <span className="text-purple-400 bg-purple-500/10 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">Admin</span>}
            </div>
            <p className="text-slate-500 text-xs truncate">{o.description}</p>
            {o.address && <p className="text-slate-600 text-xs truncate flex items-center gap-1"><MapPin size={10} />{o.address}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-emerald-400 font-bold text-sm">{o.discount_percent}% off</p>
            <p className="text-slate-500 text-xs flex items-center gap-1"><Gem size={10} className="text-cyan-400" />+{o.gems_reward}</p>
          </div>
        </div>
      ))}
      {offers.length === 0 && <p className="text-slate-500 text-center py-8">No offers yet</p>}
    </div>
  )
}

// =============================================
// SUPABASE MIGRATION BANNER
// =============================================
function SupabaseMigrationBanner() {
  const [expanded, setExpanded] = useState(false)
  const [dbPassword, setDbPassword] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string; help?: string } | null>(null)
  const [status, setStatus] = useState<{ connected: boolean; migration_needed: boolean } | null>(null)
  const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/supabase/status`)
      .then(r => r.json())
      .then(d => setStatus(d.data))
      .catch(() => {})
  }, [])

  const runMigration = async () => {
    if (!dbPassword.trim()) return
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/supabase/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_password: dbPassword }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) setStatus(prev => prev ? { ...prev, migration_needed: false } : null)
    } catch {
      setResult({ success: false, error: 'Network error' })
    }
    setRunning(false)
  }

  // Only show if migration is needed
  if (!status || !status.migration_needed) return null

  return (
    <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} data-testid="migration-banner-toggle"
        className="w-full flex items-center justify-between p-5 hover:bg-amber-500/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-amber-300 font-semibold text-sm">Supabase Migration Needed</p>
            <p className="text-amber-400/70 text-xs">The database tables haven't been created yet. Click to set up.</p>
          </div>
        </div>
        <ChevronRight size={16} className={`text-amber-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <div className="bg-slate-900/50 rounded-xl p-4 text-xs text-slate-400 space-y-1">
            <p className="text-white font-medium text-sm mb-2">How to get your database password:</p>
            <p>1. Go to <a href="https://supabase.com/dashboard/project/cuseezsdaqlbwlxnjsyr/settings/database" target="_blank" rel="noopener noreferrer" className="text-[#0084FF] underline">Supabase Dashboard → Project Settings → Database</a></p>
            <p>2. Find the <strong className="text-white">"Database password"</strong> section</p>
            <p>3. Copy or reset your password and paste it below</p>
          </div>

          <div className="flex gap-3">
            <input
              type="password"
              value={dbPassword}
              onChange={e => setDbPassword(e.target.value)}
              placeholder="Enter your Supabase database password..."
              data-testid="migration-db-password"
              className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
            <button onClick={runMigration} disabled={running || !dbPassword}
              data-testid="run-migration-btn"
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-900 font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {running ? <><RefreshCw size={14} className="animate-spin" />Running...</> : <><Zap size={14} />Run Migration</>}
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-xl border ${result.success ? 'border-[#00DFA2]/30 bg-[#00DFA2]/5 text-[#00DFA2]' : 'border-[#FF5A5A]/30 bg-[#FF5A5A]/5 text-[#FF5A5A]'}`}>
              <div className="flex items-center gap-2 mb-1">
                {result.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span className="font-semibold text-sm">{result.success ? 'Migration Successful!' : 'Migration Failed'}</span>
              </div>
              <p className="text-xs opacity-80">{result.message || result.error}</p>
              {result.help && <p className="text-xs mt-2 text-amber-400">{result.help}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// AI MODERATION TYPES & DATA
// =============================================
const STATUS_BADGES: Record<string, string> = {
  new: 'bg-[#E6ECF5] text-[#0B1220]',
  blurred: 'bg-[#0084FF]/10 text-[#0084FF]',
  review: 'bg-[#0084FF]/10 text-[#0084FF]',
  approved: 'bg-[#00FFD7]/10 text-[#00FFD7]',
  rejected: 'bg-[#FF5A5A]/10 text-[#FF5A5A]',
}

function AIModerationTab({ theme }: { theme: 'dark' | 'light' }) {
  const [activeModTab, setActiveModTab] = useState<IncidentTab>('new')
  const [confidenceThreshold, setConfidenceThreshold] = useState(80)
  const [liveToast, setLiveToast] = useState<string | null>(null)

  // Use our custom hooks
  const {
    incidents,
    addIncident,
    updateIncidentStatus,
    moderateIncident,
    simulateIncident: doSimulateIncident,
    filterByTab,
    getTabCounts,
  } = useIncidents()

  // WebSocket hook with auto-reconnect and status indicator
  const { status: wsStatus, adminCount, sendModeration, reconnect } = useWebSocket({
    onIncident: (incident) => {
      addIncident({ ...incident, reportedAt: 'just now' })
      setLiveToast(`New incident: ${incident.type}`)
      toast.success(`New incident: ${incident.type}`, { duration: 4000 })
      setTimeout(() => setLiveToast(null), 4000)
      setActiveModTab('new')
    },
    onModerationUpdate: (incidentId, outcome) => {
      updateIncidentStatus(incidentId, outcome)
      toast.info(`Incident ${incidentId} ${outcome} by another admin`)
    },
    onBacklog: (backlogIncidents) => {
      backlogIncidents.forEach(inc => addIncident(inc))
    },
  })

  const handleModeration = async (id: number, outcome: 'approved' | 'rejected') => {
    updateIncidentStatus(id, outcome)
    sendModeration(id, outcome)
    await moderateIncident(id, outcome)
    toast.success(`Incident ${outcome}`)
  }

  const handleSimulateIncident = async () => {
    const loadingToast = toast.loading('Generating test incident...')
    const incident = await doSimulateIncident()
    toast.dismiss(loadingToast)
    if (incident) {
      toast.success('Test incident generated!')
    } else {
      toast.error('Failed to generate incident')
    }
  }

  const filteredIncidents = useMemo(() => {
    return filterByTab(activeModTab, confidenceThreshold)
  }, [filterByTab, activeModTab, confidenceThreshold])

  const tabCounts = getTabCounts()
  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  return (
    <div className="space-y-6">
      {/* Header Row with Live Badge + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* WebSocket Status Badge with reconnect button */}
          <div data-testid="ws-status-badge"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              wsStatus === 'live'
                ? 'border-[#00DFA2]/40 bg-[#00DFA2]/10 text-[#00DFA2]'
                : wsStatus === 'connecting'
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                  : 'border-[#FF5A5A]/40 bg-[#FF5A5A]/10 text-[#FF5A5A]'
            }`}>
            {wsStatus === 'live' ? (
              <Wifi size={12} className="text-[#00DFA2]" />
            ) : wsStatus === 'connecting' ? (
              <RefreshCw size={12} className="animate-spin text-amber-400" />
            ) : (
              <WifiOff size={12} className="text-[#FF5A5A]" />
            )}
            {wsStatus === 'live' ? `Live · ${adminCount} admin${adminCount !== 1 ? 's' : ''} online` :
             wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
          {wsStatus === 'offline' && (
            <button onClick={reconnect} className="text-xs text-blue-400 hover:text-blue-300 underline">
              Retry connection
            </button>
          )}
        </div>
        {/* Simulate Incident button */}
        <button onClick={handleSimulateIncident} data-testid="simulate-incident-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0084FF]/10 border border-[#0084FF]/20 text-[#0084FF] text-sm font-semibold hover:bg-[#0084FF]/20 transition-all">
          <Zap size={14} />Generate Test Incident
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {(['new', 'blurred', 'review', 'approved', 'rejected'] as IncidentTab[]).map(tab => {
          const count = tabCounts[tab]
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
                    data-testid={`approve-btn-${incident.id}`}
                    className={`flex-1 h-11 rounded-xl bg-[#00FFD7] text-[#0B1220] text-sm font-semibold flex items-center justify-center gap-2 transition-all ${canModerate ? 'hover:opacity-90' : 'opacity-30 cursor-not-allowed'}`}>
                    <CheckCircle size={16} />Approve
                  </button>
                  <button onClick={() => handleModeration(incident.id, 'rejected')} disabled={!canModerate}
                    data-testid={`reject-btn-${incident.id}`}
                    className={`flex-1 h-11 rounded-xl bg-[#FF5A5A] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${canModerate ? 'hover:opacity-90' : 'opacity-30 cursor-not-allowed'}`}>
                    <XCircle size={16} />Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`p-16 rounded-2xl border text-center ${card}`}>
          <Eye size={32} className={`mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-[#4B5C74]'}`} />
          <p className={isDark ? 'text-white/60' : 'text-[#0B1220]'}>No incidents in this queue</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/30' : 'text-[#8A9BB6]'}`}>Try lowering the confidence threshold, switching tabs, or generating a test incident</p>
        </div>
      )}
    </div>
  )
}

// =============================================
// USERS TAB WITH LIVE API
// =============================================
function FigmaUsersTab({ theme, onExport }: { theme: 'dark' | 'light'; onExport: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('All Plans')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const isDark = theme === 'dark'

  // Use the real API hook
  const { users, loading, error, source, total, refetch, filterUsers } = useUsers()

  // Filter users based on search and filters
  const filtered = useMemo(() => {
    return filterUsers({ search: searchTerm, plan: planFilter, status: statusFilter })
  }, [filterUsers, searchTerm, planFilter, statusFilter])

  // Calculate plan stats from actual data
  const planStats = useMemo(() => {
    const stats = {
      total: users.length,
      free: users.filter(u => u.plan === 'free' || u.plan === 'basic').length,
      premium: users.filter(u => u.plan === 'premium').length,
      family: users.filter(u => u.plan === 'family').length,
    }
    return stats
  }, [users])

  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const inputBg = isDark ? 'bg-slate-700/50 border-white/10 text-white placeholder-slate-500' : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220] placeholder-[#4B5C74]'
  const thText = isDark ? 'text-white/50' : 'text-[#4B5C74]'
  const tdText = isDark ? 'text-white' : 'text-[#0B1220]'
  const trHover = isDark ? 'hover:bg-white/[0.02] border-white/5' : 'hover:bg-[#F5F8FA] border-[#E6ECF5]'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-8 rounded-2xl border text-center ${card}`}>
        <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-400 font-medium mb-2">Failed to load users</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-400">
          <RefreshCw size={14} className="inline mr-2" />Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Data Source Badge */}
      {source && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${source === 'supabase' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {source === 'supabase' ? 'Live Data' : 'Demo Data'}
          </span>
          <button onClick={refetch} className="text-xs text-blue-400 hover:text-blue-300">
            <RefreshCw size={12} className="inline mr-1" />Refresh
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: total.toLocaleString() },
          { label: 'Free Plan', value: planStats.free.toLocaleString() },
          { label: 'Premium', value: planStats.premium.toLocaleString() },
          { label: 'Family Plans', value: planStats.family.toLocaleString() },
        ].map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${card}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-[#4B5C74]'}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-[#4B5C74]'}`} size={18} />
            <input type="text" placeholder="Search by name or email..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} data-testid="admin-user-search"
              className={`w-full h-10 pl-10 pr-4 rounded-xl border text-sm ${inputBg}`} />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            data-testid="plan-filter"
            className={`h-10 px-4 rounded-xl border text-sm ${inputBg}`}>
            {['All Plans', 'Free', 'Premium', 'Family'].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            data-testid="status-filter"
            className={`h-10 px-4 rounded-xl border text-sm ${inputBg}`}>
            {['All Status', 'Active', 'Suspended'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={onExport} className="h-10 px-5 rounded-xl bg-[#0084FF] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90" data-testid="export-users-btn">
            <Download size={14} />Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'bg-slate-700/30 border-white/5' : 'bg-[#F5F8FA] border-[#E6ECF5]'}`}>
              <tr>
                {['Name', 'Email', 'Plan', 'Safety', 'Gems', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-5 py-3 text-left text-xs font-medium ${thText}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`} className={`border-b transition-colors ${trHover}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#004A93] to-[#0084FF] flex items-center justify-center text-white text-xs font-bold">
                        {(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <span className={`text-sm font-medium ${tdText}`}>{user.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium capitalize ${
                      user.plan === 'family' ? 'bg-[#00DFA2]/10 text-[#00DFA2]' :
                      user.plan === 'premium' ? 'bg-[#0084FF]/10 text-[#0084FF]' :
                      isDark ? 'bg-white/10 text-white/60' : 'bg-[#E6ECF5] text-[#4B5C74]'
                    }`}>{user.plan}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-bold ${user.safety_score >= 90 ? 'text-[#00DFA2]' : user.safety_score >= 70 ? 'text-amber-400' : 'text-[#FF5A5A]'}`}>
                      {user.safety_score}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-sm font-medium text-cyan-400`}>
                    <span className="flex items-center gap-1"><Gem size={12} />{(user.gems || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium capitalize ${
                      user.status === 'active' ? 'bg-[#00DFA2]/10 text-[#00DFA2]' : 'bg-[#FF5A5A]/10 text-[#FF5A5A]'
                    }`}>{user.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                      data-testid={`user-actions-${user.id}`}
                      className={`p-1 rounded-lg transition-colors ${isDark ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-[#4B5C74] hover:text-[#0B1220] hover:bg-[#F5F8FA]'}`}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length === 0 && (
        <p className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-[#4B5C74]'}`}>No users match your search</p>
      )}
    </div>
  )
}

// =============================================
// MAIN ADMIN DASHBOARD
// =============================================
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'partners' | 'events' | 'offers' | 'aiModeration'>('overview')
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  
  const [stats] = useState({ total_users: 12450, premium_users: 3240, total_partners: 156, active_offers: 847, total_trips: 89420, avg_safety_score: 87 })
  const [users, setUsers] = useState<User[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('admin_onboarding_complete')
    if (!hasSeenOnboarding) setShowOnboarding(true)
    loadData()
    
    // Start demo notifications every 60 seconds for admin
    const stopNotifications = notificationService.startDemoNotifications(60000)
    return () => stopNotifications()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Load admin analytics
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics`)
      const data = await res.json()
      if (data.success) setAnalytics(data.data)
    } catch (e) { console.error(e) }

    setUsers([
      { id: '1', name: 'John Smith', email: 'john@example.com', plan: 'premium', safety_score: 95, gems: 12450, level: 45, status: 'active' },
      { id: '2', name: 'Sarah Wilson', email: 'sarah@example.com', plan: 'basic', safety_score: 88, gems: 3420, level: 23, status: 'active' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com', plan: 'premium', safety_score: 92, gems: 8750, level: 38, status: 'active' },
      { id: '4', name: 'Emily Davis', email: 'emily@example.com', plan: 'basic', safety_score: 78, gems: 1560, level: 12, status: 'suspended' },
    ])
    setPartners([
      { id: '1', business_name: 'Shell Gas Station', email: 'shell@partner.com', offers_count: 5, total_redemptions: 2340, status: 'active' },
      { id: '2', business_name: 'Starbucks Downtown', email: 'starbucks@partner.com', offers_count: 3, total_redemptions: 1567, status: 'active' },
      { id: '3', business_name: 'Quick Shine Car Wash', email: 'quickshine@partner.com', offers_count: 2, total_redemptions: 890, status: 'pending' },
    ])
    setEvents([
      { id: '1', title: 'Safe Driver Weekend', description: 'Double gems for all safe trips!', type: 'weekly', gems_multiplier: 2, xp_bonus: 500, start_date: '2025-02-08', end_date: '2025-02-10', status: 'active' },
      { id: '2', title: "Valentine's Safety Special", description: 'Share the road, share the love!', type: 'special', gems_multiplier: 1.5, xp_bonus: 1000, start_date: '2025-02-14', end_date: '2025-02-14', status: 'scheduled' },
    ])
    setLoading(false)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('admin_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {showOnboarding && <OnboardingWalkthrough onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
      {showCreateOfferModal && <CreateOfferModal onClose={() => setShowCreateOfferModal(false)} partners={partners} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}

      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <span className="text-white font-bold text-lg">SnapRoad</span>
              <span className="text-purple-400 text-xs block font-medium">Admin Console</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-auto">
          <div className="space-y-2">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'users', icon: Users, label: 'Users', badge: stats.total_users.toLocaleString() },
              { id: 'partners', icon: Building2, label: 'Partners', badge: stats.total_partners.toString() },
              { id: 'events', icon: Calendar, label: 'Events' },
              { id: 'offers', icon: Gift, label: 'All Offers' },
              { id: 'aiModeration', icon: Eye, label: 'AI Moderation', badge: '9' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {item.badge && <span className="bg-slate-700/50 text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">{item.badge}</span>}
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
            <button onClick={() => setShowHelp(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
              <HelpCircle size={20} /><span className="font-medium">Help & Tour</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
              <Settings size={20} /><span className="font-medium">Settings</span>
            </button>
            <button onClick={() => setShowNotifications(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
              <Bell size={20} /><span className="font-medium">Notifications</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-white/5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Crown className="text-white" size={18} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Super Admin</p>
                <p className="text-purple-400 text-xs">Full Access</p>
              </div>
              <button onClick={toggleTheme} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors" data-testid="theme-toggle-btn" title="Toggle theme">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
          <button onClick={() => navigate('/')} data-testid="logout-btn" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10">
            <LogOut size={20} /><span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} userPlan="premium" onLogout={() => navigate('/')} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} appType="admin" />

      {/* Main Content */}
      <main className="ml-72 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'partners' && 'Partner Management'}
              {activeTab === 'events' && 'Events & Promotions'}
              {activeTab === 'offers' && 'All Offers'}
              {activeTab === 'aiModeration' && 'AI Moderation Queue'}
            </h1>
            <p className="text-slate-400">Full control over the SnapRoad platform</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'offers' && (
              <>
                <button onClick={() => setShowImportModal(true)} className="bg-slate-800 border border-white/10 text-white font-medium px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-700">
                  <Upload size={18} />Import
                </button>
                <button onClick={() => setShowExportModal(true)} className="bg-slate-800 border border-white/10 text-white font-medium px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-slate-700">
                  <Download size={18} />Export
                </button>
                <button onClick={() => setShowCreateOfferModal(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25">
                  <Plus size={18} />Create Offer
                </button>
              </>
            )}
            {activeTab === 'events' && (
              <button onClick={() => setShowCreateEventModal(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2">
                <Plus size={20} />Create Event
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Total Users', value: analytics.summary.total_users.toLocaleString(), icon: Users, color: 'blue', sub: `${analytics.summary.premium_users.toLocaleString()} premium`, trend: '+8%' },
                    { label: 'Partners', value: analytics.summary.total_offers.toLocaleString(), icon: Building2, color: 'emerald', sub: `${stats.active_offers} active offers`, trend: '+12%' },
                    { label: 'Avg Safety Score', value: analytics.summary.avg_safety_score.toString(), icon: Shield, color: 'purple', sub: `${analytics.summary.total_redemptions.toLocaleString()} redemptions`, trend: '+3%' },
                  ].map((stat, i) => (
                    <div key={i} className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/5 overflow-hidden group hover:border-white/10">
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                            <stat.icon className={`text-${stat.color}-400`} size={24} />
                          </div>
                          <span className="text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-full">{stat.trend}</span>
                        </div>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className="text-white text-3xl font-bold mt-1">{stat.value}</p>
                        <p className="text-slate-500 text-xs mt-2">{stat.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Activity className="text-purple-400" size={20} />Platform Growth
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.chart_data.slice(-14)}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="new_users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <TrendingUp className="text-emerald-400" size={20} />Revenue Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analytics.chart_data.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Create Offer', icon: Gift, color: 'purple', action: () => setShowCreateOfferModal(true) },
                    { label: 'Export Data', icon: Download, color: 'emerald', action: () => setShowExportModal(true) },
                    { label: 'Import Data', icon: Upload, color: 'blue', action: () => setShowImportModal(true) },
                    { label: 'Create Event', icon: Calendar, color: 'amber', action: () => setShowCreateEventModal(true) },
                  ].map((action, i) => (
                    <button key={i} onClick={action.action} className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl p-5 text-center hover:border-white/10 group overflow-hidden">
                      <div className="relative">
                        <div className={`w-12 h-12 bg-${action.color}-500/20 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                          <action.icon className={`text-${action.color}-400`} size={22} />
                        </div>
                        <span className="text-white text-sm font-medium">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {/* Users Tab */}
            {activeTab === 'users' && (
              <FigmaUsersTab theme={theme} onExport={() => setShowExportModal(true)} />
            )}

            {/* Partners Tab */}
            {activeTab === 'partners' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700/30">
                      <tr>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase">Business</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase">Offers</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase">Redemptions</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4 uppercase">Status</th>
                        <th className="text-right text-slate-400 text-xs font-medium px-6 py-4 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {partners.map(partner => (
                        <tr key={partner.id} className="hover:bg-white/2">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                <Building2 className="text-emerald-400" size={18} />
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{partner.business_name}</p>
                                <p className="text-slate-500 text-xs">{partner.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-medium">{partner.offers_count}</td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-medium">{partner.total_redemptions.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${partner.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : partner.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                              {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setShowCreateOfferModal(true)} className="p-2 rounded-lg hover:bg-purple-500/10 text-purple-400 mr-2" title="Create offer for this partner"><Plus size={16} /></button>
                            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"><Edit2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {events.map(event => (
                    <div key={event.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-white font-semibold text-lg">{event.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${event.type === 'daily' ? 'bg-blue-500/20 text-blue-400' : event.type === 'weekly' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{event.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-cyan-400 flex items-center gap-1"><Gem size={14} />{event.gems_multiplier}x</span>
                            <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-amber-400 flex items-center gap-1"><Zap size={14} />+{event.xp_bonus} XP</span>
                            <span className="text-slate-400"><Calendar size={14} className="inline mr-1" />{event.start_date} → {event.end_date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white"><Edit2 size={16} /></button>
                          <button className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">Manage All Platform Offers</h3>
                      <p className="text-slate-400 text-sm">Create third-party offers (Groupon, etc.) or import in bulk via CSV</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowBulkUpload(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 text-sm font-medium" data-testid="bulk-upload-btn">
                        <Upload size={16} />Bulk Upload CSV
                      </button>
                      <button onClick={() => setShowExportModal(true)} className="bg-slate-800 border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-700 text-sm">
                        <Download size={16} />Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Offers List */}
                <AdminOffersList />
              </div>
            )}

            {/* AI Moderation Tab */}
            {activeTab === 'aiModeration' && (
              <AIModerationTab theme={theme} />
            )}

            {/* Supabase Migration Panel (shown when on overview tab + status needed) */}
            {activeTab === 'overview' && (
              <SupabaseMigrationBanner />
            )}
          </>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl">Create New Event</h2>
                  <button onClick={() => setShowCreateEventModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <form className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Event Title</label>
                    <input type="text" placeholder="e.g., Safe Driver Weekend" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Description</label>
                    <textarea placeholder="Describe the event..." rows={3} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Gems Multiplier</label>
                      <input type="number" step="0.5" placeholder="2" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">XP Bonus</label>
                      <input type="number" placeholder="500" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowCreateEventModal(false)} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold">Create Event</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Modal */}
      {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} />}
    </div>
  )
}

function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const [csvText, setCsvText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const sampleCsv = `business_name,address,offer_url,description,business_type,base_gems
"Groupon: Pizza Palace","200 S High St, Columbus OH","https://groupon.com/deals/pizza","50% off large pizza","restaurant",50
"Groupon: Spa Day","780 Nationwide Blvd, Columbus OH","https://groupon.com/deals/spa","60-min massage $39","service",40
"Local Auto Shop","567 Cleveland Ave, Columbus OH","","Free tire rotation","auto",25`

  const handleUpload = async () => {
    if (!csvText.trim()) return
    setUploading(true)
    try {
      const lines = csvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const offers = lines.slice(1).map(line => {
        const parts = line.match(/(".*?"|[^,]+)/g)?.map(p => p.trim().replace(/^"|"$/g, '')) || []
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = parts[i] || '' })
        return {
          business_name: obj.business_name || '',
          address: obj.address || '',
          offer_url: obj.offer_url || null,
          description: obj.description || '',
          business_type: obj.business_type || 'other',
          base_gems: parseInt(obj.base_gems) || 25,
          expires_days: 30,
        }
      }).filter(o => o.business_name)

      const res = await fetch(`${API_URL}/api/admin/offers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers }),
      })
      const data = await res.json()
      setResult(data)
    } catch { setResult({ success: false, message: 'Upload failed' }) }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="bulk-upload-modal">
      <div className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl flex items-center gap-2"><Upload className="text-emerald-400" size={22} />Bulk Upload Offers (CSV)</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>
          <p className="text-slate-400 text-sm mb-3">Paste CSV with columns: <span className="text-emerald-400">business_name, address, offer_url, description, business_type, base_gems</span></p>
          
          <button onClick={() => setCsvText(sampleCsv)} className="text-xs text-blue-400 hover:text-blue-300 mb-2" data-testid="load-sample-csv">Load sample CSV</button>
          
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={8}
            placeholder="Paste your CSV here..."
            className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-mono resize-none mb-4"
            data-testid="csv-textarea"
          />

          {result && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`} data-testid="upload-result">
              {result.message}
              {result.data && <span className="ml-2">({result.data.length} offers created)</span>}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
            <button onClick={handleUpload} disabled={uploading || !csvText.trim()} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2" data-testid="upload-csv-btn">
              {uploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Uploading...' : 'Upload Offers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}