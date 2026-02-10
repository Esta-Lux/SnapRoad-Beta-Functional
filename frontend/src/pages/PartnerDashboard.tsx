import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Gift, TrendingUp, Users, DollarSign,
  MapPin, Calendar, Clock, ChevronRight, Edit2, Trash2,
  BarChart3, Eye, Zap, Bell, Settings, LogOut, Search,
  Check, X, Filter, Download, Gem, Sparkles, ArrowRight,
  ChevronLeft, HelpCircle, Target, Award, Rocket, Image,
  RefreshCw, Activity, Globe, TrendingDown, Store, Crown
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { NotificationCenter, NotificationBell, useNotifications, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Offer {
  id: number
  title: string
  description: string
  discount_percent: number
  gems_reward: number
  redemption_count: number
  views: number
  status: 'active' | 'paused' | 'expired'
  created_at: string
  expires_at: string
  image_url?: string
  location_id?: number
  location_name?: string
}

interface PartnerLocation {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  is_primary: boolean
  created_at: string
}

interface PartnerProfile {
  id: string
  business_name: string
  plan: string
  plan_info: {
    name: string
    max_locations: number
    features: string[]
  }
  locations: PartnerLocation[]
  location_count: number
  max_locations: number
  can_add_location: boolean
}

interface BoostConfig {
  duration_days: number
  reach_target: number
  total_cost: number
}

interface Analytics {
  summary: {
    total_views: number
    total_clicks: number
    total_redemptions: number
    total_revenue: number
    ctr: number
    conversion_rate: number
  }
  chart_data: Array<{
    date: string
    views: number
    clicks: number
    redemptions: number
    revenue: number
  }>
  geo_data: Array<{
    city: string
    redemptions: number
  }>
}

// Onboarding Component
function OnboardingWalkthrough({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0)
  
  const steps = [
    { title: 'Welcome to Partner Portal', description: 'Manage your offers, track performance, and grow your business with SnapRoad drivers.', icon: Building2, color: 'from-emerald-500 to-teal-500' },
    { title: 'Create Compelling Offers', description: 'Create discounts and promotions that attract SnapRoad drivers. Use AI to generate stunning promotional images.', icon: Gift, color: 'from-purple-500 to-pink-500' },
    { title: 'Boost Your Reach', description: 'Expand your offer visibility with our flexible boost system. Pay only for the reach you need.', icon: Rocket, color: 'from-orange-500 to-red-500' },
    { title: 'Track Performance', description: 'Monitor views, redemptions, and revenue in real-time with beautiful analytics dashboards.', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
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
              {steps.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-600'}`} />))}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && (<button onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl bg-slate-700/50 text-white font-medium hover:bg-slate-700 flex items-center gap-2"><ChevronLeft size={18} />Back</button>)}
              <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()} className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90`}>
                {step < steps.length - 1 ? (<>Next<ArrowRight size={18} /></>) : (<>Get Started<Sparkles size={18} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Boost Modal Component
function BoostModal({ offer, onClose, onBoost }: { offer: Offer; onClose: () => void; onBoost: (config: BoostConfig) => void }) {
  const [duration, setDuration] = useState(1)
  const [reach, setReach] = useState(100)
  const [cost, setCost] = useState({ duration_cost: 25, reach_cost: 5, total_cost: 30 })
  const [loading, setLoading] = useState(false)

  const calculateCost = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/boosts/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_days: duration, reach_target: reach })
      })
      const data = await res.json()
      if (data.success) setCost(data.data)
    } catch (e) { console.error(e) }
  }, [duration, reach])

  useEffect(() => { calculateCost() }, [calculateCost])

  const handleBoost = async () => {
    setLoading(true)
    onBoost({ duration_days: duration, reach_target: reach, total_cost: cost.total_cost })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2"><Rocket className="text-orange-400" size={24} />Boost Offer</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
              <p className="text-white font-medium">{offer.title}</p>
              <p className="text-slate-400 text-sm">{offer.description}</p>
            </div>

            <div className="space-y-6">
              {/* Duration Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-sm font-medium">Duration</label>
                  <span className="text-orange-400 font-bold">{duration} day{duration > 1 ? 's' : ''}</span>
                </div>
                <input type="range" min="1" max="30" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 day</span><span>30 days</span></div>
              </div>

              {/* Reach Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-sm font-medium">Target Reach</label>
                  <span className="text-cyan-400 font-bold">{reach.toLocaleString()} people</span>
                </div>
                <input type="range" min="100" max="2000" step="100" value={reach} onChange={(e) => setReach(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>100</span><span>2,000</span></div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400">Duration Cost</span>
                  <span className="text-white font-medium">${cost.duration_cost}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400">Reach Cost</span>
                  <span className="text-white font-medium">${cost.reach_cost}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-emerald-400 font-bold text-2xl">${cost.total_cost}</span>
                </div>
              </div>
            </div>

            <button onClick={handleBoost} disabled={loading} className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-3.5 rounded-xl hover:from-orange-400 hover:to-red-400 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Rocket size={20} />Activate Boost</>}
            </button>
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
                <label className="text-slate-400 text-sm mb-1 block">Describe Your Offer</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 20% off premium coffee drinks, cozy cafe atmosphere..." rows={3} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Generated" className="w-full h-48 object-cover rounded-xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleGenerate} disabled={generating || !prompt} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 flex items-center justify-center gap-2">
                  {generating ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {generating ? 'Generating...' : 'Generate Image'}
                </button>
                {generatedImage && (
                  <button onClick={() => { onGenerate(generatedImage); onClose() }} className="flex-1 bg-emerald-500 text-white font-semibold py-3 rounded-xl hover:bg-emerald-400 flex items-center justify-center gap-2">
                    <Check size={18} />Use This Image
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

// Main Dashboard Component
export default function PartnerDashboard() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<Offer[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'locations' | 'analytics' | 'boosts'>('overview')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState<Offer | null>(null)
  const [showImageGenerator, setShowImageGenerator] = useState(false)
  const [newOfferImage, setNewOfferImage] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  
  // Location management states
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<PartnerLocation | null>(null)
  
  // Offer creation form states
  const [newOfferData, setNewOfferData] = useState({
    title: '',
    description: '',
    discount_percent: 15,
    gems_reward: 50,
    location_id: 0,
    expires_days: 7
  })
  
  // Notification hooks
  const { sendNotification } = useNotifications()

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('partner_onboarding_complete')
    if (!hasSeenOnboarding) setShowOnboarding(true)
    loadData()
    loadPartnerProfile()
    
    // Start demo notifications every 45 seconds
    const stopNotifications = notificationService.startDemoNotifications(45000)
    return () => stopNotifications()
  }, [])

  const loadPartnerProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/partner/profile?partner_id=default_partner`)
      const data = await res.json()
      if (data.success) {
        setPartnerProfile(data.data)
        // Set default location for offer creation
        if (data.data.locations.length > 0) {
          setNewOfferData(prev => ({ ...prev, location_id: data.data.locations[0].id }))
        }
      }
    } catch (e) { console.error('Error loading partner profile:', e) }
  }

  const loadData = async () => {
    setLoading(true)
    
    // Load analytics
    try {
      const res = await fetch(`${API_URL}/api/analytics/dashboard?business_id=default_business`)
      const data = await res.json()
      if (data.success) setAnalytics(data.data)
    } catch (e) { console.error(e) }

    // Mock offers
    setOffers([
      { id: 1, title: '15% Off First Visit', description: 'Welcome offer for new customers', discount_percent: 15, gems_reward: 50, redemption_count: 234, views: 4500, status: 'active', created_at: '2025-02-01', expires_at: '2025-02-28' },
      { id: 2, title: 'Weekend Special', description: 'Extra discount on weekends', discount_percent: 20, gems_reward: 75, redemption_count: 156, views: 3200, status: 'active', created_at: '2025-02-05', expires_at: '2025-02-15' },
      { id: 3, title: 'Loyalty Bonus', description: 'For returning customers', discount_percent: 10, gems_reward: 30, redemption_count: 457, views: 4750, status: 'paused', created_at: '2025-01-15', expires_at: '2025-03-15' },
    ])
    setLoading(false)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('partner_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  // Location Management Functions
  const handleAddLocation = async (locationData: { name: string; address: string; lat: number; lng: number; is_primary: boolean }) => {
    try {
      const res = await fetch(`${API_URL}/api/partner/locations?partner_id=default_partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      })
      const data = await res.json()
      if (data.success) {
        sendNotification('success', 'Location Added', `${locationData.name} has been added to your locations.`)
        loadPartnerProfile()
        setShowAddLocationModal(false)
      } else {
        sendNotification('error', 'Error', data.message || 'Failed to add location')
      }
    } catch (e) {
      sendNotification('error', 'Error', 'Failed to add location')
    }
  }

  const handleUpdateLocation = async (locationId: number, locationData: { name: string; address: string; lat: number; lng: number; is_primary: boolean }) => {
    try {
      const res = await fetch(`${API_URL}/api/partner/locations/${locationId}?partner_id=default_partner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      })
      const data = await res.json()
      if (data.success) {
        sendNotification('success', 'Location Updated', 'Location has been updated successfully.')
        loadPartnerProfile()
        setEditingLocation(null)
      }
    } catch (e) {
      sendNotification('error', 'Error', 'Failed to update location')
    }
  }

  const handleDeleteLocation = async (locationId: number) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return
    try {
      const res = await fetch(`${API_URL}/api/partner/locations/${locationId}?partner_id=default_partner`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        sendNotification('success', 'Location Deleted', 'Location has been removed.')
        loadPartnerProfile()
      }
    } catch (e) {
      sendNotification('error', 'Error', 'Failed to delete location')
    }
  }

  const handleSetPrimaryLocation = async (locationId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/partner/locations/${locationId}/set-primary?partner_id=default_partner`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        sendNotification('success', 'Primary Location', 'Primary location updated.')
        loadPartnerProfile()
      }
    } catch (e) {
      sendNotification('error', 'Error', 'Failed to update primary location')
    }
  }

  const handleCreateOffer = async () => {
    if (!newOfferData.title || !newOfferData.location_id) {
      sendNotification('error', 'Error', 'Please fill in all required fields and select a location.')
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/partner/offers?partner_id=default_partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOfferData.title,
          description: newOfferData.description,
          discount_percent: newOfferData.discount_percent,
          gems_reward: newOfferData.gems_reward,
          location_id: newOfferData.location_id,
          expires_hours: newOfferData.expires_days * 24,
          image_url: newOfferImage
        })
      })
      const data = await res.json()
      if (data.success) {
        sendNotification('success', 'Offer Created', 'Your new offer is now live!')
        setShowCreateModal(false)
        setNewOfferData({ title: '', description: '', discount_percent: 15, gems_reward: 50, location_id: partnerProfile?.locations[0]?.id || 0, expires_days: 7 })
        setNewOfferImage(null)
        loadData()
      } else {
        sendNotification('error', 'Error', data.message || 'Failed to create offer')
      }
    } catch (e) {
      sendNotification('error', 'Error', 'Failed to create offer')
    }
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {showOnboarding && <OnboardingWalkthrough onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
      {showBoostModal && <BoostModal offer={showBoostModal} onClose={() => setShowBoostModal(null)} onBoost={(config) => console.log('Boost:', config)} />}
      {showImageGenerator && <ImageGeneratorModal onClose={() => setShowImageGenerator(false)} onGenerate={(url) => setNewOfferImage(url)} />}

      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <span className="text-white font-bold text-lg">SnapRoad</span>
              <span className="text-emerald-400 text-xs block font-medium">Partner Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'offers', icon: Gift, label: 'My Offers', badge: offers.length.toString() },
              { id: 'locations', icon: Store, label: 'Locations', badge: partnerProfile?.location_count?.toString() || '0' },
              { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
              { id: 'boosts', icon: Rocket, label: 'Boosts' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {item.badge && <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>}
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
          <button onClick={() => navigate('/')} data-testid="logout-btn" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10">
            <LogOut size={20} /><span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onLogout={() => navigate('/')} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} appType="partner" />

      {/* Main Content */}
      <main className="ml-72 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'offers' && 'My Offers'}
              {activeTab === 'locations' && 'Store Locations'}
              {activeTab === 'analytics' && 'Real-Time Analytics'}
              {activeTab === 'boosts' && 'Boost Center'}
            </h1>
            <p className="text-slate-400">Manage your SnapRoad offers and track performance</p>
          </div>
          {activeTab === 'offers' && (
            <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25">
              <Plus size={20} />Create Offer
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Total Views', value: analytics.summary.total_views.toLocaleString(), icon: Eye, color: 'blue', trend: '+12%' },
                    { label: 'Total Clicks', value: analytics.summary.total_clicks.toLocaleString(), icon: Target, color: 'purple', trend: '+8%' },
                    { label: 'Redemptions', value: analytics.summary.total_redemptions.toLocaleString(), icon: Gift, color: 'emerald', trend: '+24%' },
                    { label: 'Revenue', value: `$${analytics.summary.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'amber', trend: '+18%' },
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
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Performance Chart */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Activity className="text-emerald-400" size={20} />Performance Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.chart_data}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="views" stroke="#10b981" fillOpacity={1} fill="url(#colorViews)" />
                        <Area type="monotone" dataKey="redemptions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRedemptions)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Geographic Distribution */}
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Globe className="text-cyan-400" size={20} />Top Locations
                    </h2>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={analytics.geo_data} dataKey="redemptions" nameKey="city" cx="50%" cy="50%" outerRadius={80}>
                            {analytics.geo_data.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {analytics.geo_data.map((geo, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-slate-300 text-sm">{geo.city}</span>
                            </div>
                            <span className="text-white font-medium">{geo.redemptions}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion Metrics */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <p className="text-slate-400 text-sm mb-2">Click-Through Rate</p>
                    <p className="text-3xl font-bold text-white">{analytics.summary.ctr}%</p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{ width: `${Math.min(analytics.summary.ctr * 10, 100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <p className="text-slate-400 text-sm mb-2">Conversion Rate</p>
                    <p className="text-3xl font-bold text-white">{analytics.summary.conversion_rate}%</p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(analytics.summary.conversion_rate * 5, 100)}%` }} />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <p className="text-slate-400 text-sm mb-2">Avg Order Value</p>
                    <p className="text-3xl font-bold text-white">${(analytics.summary.total_revenue / analytics.summary.total_redemptions).toFixed(2)}</p>
                    <p className="text-emerald-400 text-sm mt-2">+$2.50 vs last week</p>
                  </div>
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">{offer.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${offer.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : offer.status === 'paused' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{offer.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-slate-300">{offer.discount_percent}% off</span>
                            <span className="bg-slate-700/30 px-3 py-1.5 rounded-lg text-cyan-400 flex items-center gap-1"><Gem size={14} />+{offer.gems_reward}</span>
                            <span className="text-slate-400"><Eye size={14} className="inline mr-1" />{offer.views.toLocaleString()}</span>
                            <span className="text-emerald-400"><Check size={14} className="inline mr-1" />{offer.redemption_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setShowBoostModal(offer)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 hover:from-orange-500/30 hover:to-red-500/30 flex items-center gap-2 font-medium">
                            <Rocket size={16} />Boost
                          </button>
                          <button className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white"><Edit2 size={16} /></button>
                          <button className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                  <h2 className="text-white font-semibold text-lg mb-4">Revenue Over Time</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && partnerProfile && (
              <div className="space-y-6">
                {/* Plan & Location Limit Info */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Crown className="text-white" size={28} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{partnerProfile.plan_info.name} Plan</h3>
                        <p className="text-slate-400 text-sm">
                          {partnerProfile.location_count} of {partnerProfile.max_locations === 999999 ? 'Unlimited' : partnerProfile.max_locations} locations used
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold text-xl">{partnerProfile.max_locations === 999999 ? '∞' : partnerProfile.max_locations - partnerProfile.location_count}</p>
                        <p className="text-slate-500 text-xs">Remaining</p>
                      </div>
                      {partnerProfile.plan !== 'enterprise' && (
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 font-medium text-sm">
                          Upgrade Plan
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.min((partnerProfile.location_count / (partnerProfile.max_locations === 999999 ? 100 : partnerProfile.max_locations)) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Add Location Button */}
                {partnerProfile.can_add_location && (
                  <button 
                    onClick={() => setShowAddLocationModal(true)}
                    data-testid="add-location-btn"
                    className="w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-dashed border-emerald-500/30 p-6 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-all">
                        <Plus className="text-emerald-400" size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-semibold">Add New Location</p>
                        <p className="text-slate-400 text-sm">Add a store or business location to create offers for</p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Locations List */}
                <div className="space-y-4">
                  {partnerProfile.locations.map(location => (
                    <div key={location.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${location.is_primary ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20' : 'bg-slate-700/50'}`}>
                            <MapPin className={location.is_primary ? 'text-amber-400' : 'text-slate-400'} size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold">{location.name}</h3>
                              {location.is_primary && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">Primary</span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mt-1">{location.address}</p>
                            <p className="text-slate-500 text-xs mt-2">
                              Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!location.is_primary && (
                            <button 
                              onClick={() => handleSetPrimaryLocation(location.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium"
                            >
                              Set Primary
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingLocation(location)}
                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteLocation(location.id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {partnerProfile.locations.length === 0 && (
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
                    <Store className="text-slate-600 mx-auto mb-4" size={64} />
                    <h3 className="text-white font-bold text-xl mb-2">No Locations Yet</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">Add your business locations to start creating offers. Each location can have its own offers that appear on the map.</p>
                    <button 
                      onClick={() => setShowAddLocationModal(true)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-400 hover:to-teal-400 inline-flex items-center gap-2"
                    >
                      <Plus size={20} />Add Your First Location
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Boosts Tab */}
            {activeTab === 'boosts' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20 p-8 text-center">
                  <Rocket className="text-orange-400 mx-auto mb-4" size={48} />
                  <h2 className="text-white font-bold text-2xl mb-2">Supercharge Your Offers</h2>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">Boost your offers to reach more drivers. Customize duration and target audience to fit your budget.</p>
                  <div className="flex items-center justify-center gap-8 text-sm">
                    <div className="text-center">
                      <p className="text-orange-400 font-bold text-xl">$25</p>
                      <p className="text-slate-500">Starting per day</p>
                    </div>
                    <div className="text-center">
                      <p className="text-cyan-400 font-bold text-xl">$5</p>
                      <p className="text-slate-500">Per 100 reach</p>
                    </div>
                    <div className="text-center">
                      <p className="text-emerald-400 font-bold text-xl">30</p>
                      <p className="text-slate-500">Max days</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {offers.map(offer => (
                    <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5">
                      <h3 className="text-white font-medium mb-2">{offer.title}</h3>
                      <p className="text-slate-500 text-sm mb-4">{offer.description}</p>
                      <button onClick={() => setShowBoostModal(offer)} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2.5 rounded-xl hover:from-orange-400 hover:to-red-400 flex items-center justify-center gap-2">
                        <Rocket size={16} />Boost Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl">Create New Offer</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <form className="space-y-4">
                  {newOfferImage && (
                    <div className="relative mb-4">
                      <img src={newOfferImage} alt="Offer" className="w-full h-32 object-cover rounded-xl" />
                      <button onClick={() => setNewOfferImage(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button>
                    </div>
                  )}
                  <button type="button" onClick={() => setShowImageGenerator(true)} className="w-full border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/5 flex items-center justify-center gap-2">
                    <Image size={20} />
                    {newOfferImage ? 'Change Image' : 'Generate AI Image'}
                  </button>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Offer Title</label>
                    <input type="text" placeholder="e.g., 20% Off Weekend Special" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Description</label>
                    <textarea placeholder="Describe your offer..." rows={3} className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Discount %</label>
                      <input type="number" placeholder="15" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Gems Reward</label>
                      <input type="number" placeholder="50" className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold">Create Offer</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
