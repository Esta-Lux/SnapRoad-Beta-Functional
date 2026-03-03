import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Gift, TrendingUp, Users, DollarSign,
  MapPin, Calendar, Clock, ChevronRight, Edit2, Trash2,
  BarChart3, Eye, Zap, Bell, Settings, LogOut, Search,
  Check, X, Filter, Download, Gem, Sparkles, ArrowRight,
  ChevronLeft, HelpCircle, Target, Award, Rocket, Image,
  RefreshCw, Activity, Globe, TrendingDown, Store, Crown,
  CreditCard, Receipt, Wallet, Share2, BadgeCheck, ArrowUpRight,
  CheckCircle, ChevronDown, BarChart2
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { NotificationCenter, NotificationBell, useNotifications, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'
import { partnerApi } from '@/services/partnerApi'

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
  is_boosted?: boolean
  boost_multiplier?: number
  boost_expires?: string
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
function BoostModal({ offer, onClose, onBoost }: { offer: Offer; onClose: () => void; onBoost: (boostType: string) => Promise<void> }) {
  const [selectedBoost, setSelectedBoost] = useState<string>('standard')
  const [loading, setLoading] = useState(false)
  const [credits, setCredits] = useState(0)
  const [useCredits, setUseCredits] = useState(false)

  const boostPackages = {
    basic: { name: 'Basic Boost', duration: '24 hours', price: 9.99, multiplier: '1.5x', color: 'from-blue-500 to-cyan-500' },
    standard: { name: 'Standard Boost', duration: '3 days', price: 19.99, multiplier: '2x', color: 'from-orange-500 to-red-500' },
    premium: { name: 'Premium Boost', duration: '7 days', price: 39.99, multiplier: '3x', color: 'from-purple-500 to-pink-500' },
  }

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const data = await partnerApi.getCredits()
        if (data.success) setCredits(data.data.balance)
      } catch (e) { console.log('Could not load credits') }
    }
    loadCredits()
  }, [])

  const handleBoost = async () => {
    setLoading(true)
    try {
      const data = await partnerApi.createBoost({
        offer_id: offer.id,
        boost_type: selectedBoost,
        use_credits: useCredits,
      })
      if (data.success) {
        onClose()
      }
    } catch (e) {
      console.error('Failed to create boost')
    }
    setLoading(false)
  }

  const selectedPkg = boostPackages[selectedBoost as keyof typeof boostPackages]
  const canUseCredits = credits >= selectedPkg.price

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

            {/* Boost Package Selection */}
            <div className="space-y-3 mb-6">
              {Object.entries(boostPackages).map(([key, pkg]) => (
                <button
                  key={key}
                  onClick={() => setSelectedBoost(key)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    selectedBoost === key
                      ? `bg-gradient-to-r ${pkg.color} border-white/20`
                      : 'bg-slate-700/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{pkg.name}</p>
                      <p className="text-sm text-white/70">{pkg.duration} • {pkg.multiplier} visibility</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">${pkg.price}</p>
                      {selectedBoost === key && <Check size={16} className="inline text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Credits Option */}
            <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Your Credits</span>
                <span className="text-emerald-400 font-bold">${credits.toFixed(2)}</span>
              </div>
              {canUseCredits && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCredits}
                    onChange={(e) => setUseCredits(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className="text-slate-300 text-sm">Use credits for this boost</span>
                </label>
              )}
              {!canUseCredits && (
                <p className="text-slate-500 text-xs">Add more credits to pay with your balance</p>
              )}
            </div>

            <button onClick={handleBoost} disabled={loading} className={`w-full bg-gradient-to-r ${selectedPkg.color} text-white font-semibold py-3.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2`}>
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Rocket size={20} />Activate {selectedPkg.name} - ${selectedPkg.price}</>}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'locations' | 'analytics' | 'boosts' | 'finance' | 'referrals' | 'pricing'>('overview')
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
      const data = await partnerApi.getProfile()
      if (data.success) {
        setPartnerProfile(data.data)
        if (data.data?.locations?.length > 0) {
          setNewOfferData(prev => ({ ...prev, location_id: data.data.locations[0].id }))
        }
      }
    } catch (e) { console.error('Error loading partner profile:', e) }
  }

  const loadData = async () => {
    setLoading(true)
    
    try {
      const analyticsRes = await partnerApi.getAnalytics()
      if (analyticsRes.success) setAnalytics(analyticsRes.data)
    } catch (e) { console.error(e) }

    try {
      const offersRes = await partnerApi.getOffers()
      if (offersRes.success && offersRes.data) {
        setOffers(offersRes.data.map((o: any) => ({
          id: o.id,
          title: o.title || '',
          description: o.description || '',
          discount_percent: o.discount_percent || 0,
          gems_reward: o.base_gems || 0,
          redemption_count: o.redemption_count || 0,
          views: o.views || 0,
          status: o.status || 'active',
          created_at: o.created_at || '',
          expires_at: o.expires_at || '',
          image_url: o.image_url,
          location_id: o.location_id,
          location_name: o.location_name,
        })))
      }
    } catch (e) { console.error(e) }

    setLoading(false)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('partner_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const handleAddLocation = async (locationData: { name: string; address: string; lat: number; lng: number; is_primary: boolean }) => {
    try {
      const data = await partnerApi.addLocation(locationData)
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
      const data = await partnerApi.updateLocation(locationId, locationData)
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
      const data = await partnerApi.deleteLocation(locationId)
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
      const data = await partnerApi.setPrimaryLocation(locationId)
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
      const data = await partnerApi.createOffer({
        title: newOfferData.title,
        description: newOfferData.description,
        discount_percent: newOfferData.discount_percent,
        gems_reward: newOfferData.gems_reward,
        location_id: newOfferData.location_id,
        expires_hours: newOfferData.expires_days * 24,
        image_url: newOfferImage,
      })
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
      {showBoostModal && <BoostModal offer={showBoostModal} onClose={() => setShowBoostModal(null)} onBoost={async () => { setShowBoostModal(null); await loadData() }} />}
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
              { id: 'finance', icon: CreditCard, label: 'Credits & Finance' },
              { id: 'referrals', icon: Share2, label: 'Referrals' },
              { id: 'pricing', icon: BadgeCheck, label: 'Plan & Pricing' },
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
              {activeTab === 'finance' && 'Credits & Earnings'}
              {activeTab === 'referrals' && 'Referral Analytics'}
              {activeTab === 'pricing' && 'Plans & Pricing'}
            </h1>
            <p className="text-slate-400">
              {activeTab === 'overview' && 'Manage your SnapRoad offers and track performance'}
              {activeTab === 'offers' && 'Create and manage your business offers'}
              {activeTab === 'locations' && 'Manage your store locations on the map'}
              {activeTab === 'analytics' && 'Track your offer performance in real-time'}
              {activeTab === 'boosts' && 'Amplify your offer reach with paid boosts'}
              {activeTab === 'finance' && 'Manage your SnapRoad partner credits and earnings'}
              {activeTab === 'referrals' && 'Earn credits by referring new partners to SnapRoad'}
              {activeTab === 'pricing' && 'Upgrade your plan to unlock more features'}
            </p>
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
                {(analytics.chart_data?.length > 0 || analytics.geo_data?.length > 0) && (
                <div className="grid grid-cols-2 gap-6">
                  {analytics.chart_data?.length > 0 && (
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
                  )}

                  {analytics.geo_data?.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Globe className="text-cyan-400" size={20} />Top Locations
                    </h2>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie data={analytics.geo_data} dataKey="redemptions" nameKey="city" cx="50%" cy="50%" outerRadius={80}>
                            {analytics.geo_data.map((_: any, index: number) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {analytics.geo_data.map((geo: any, i: number) => (
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
                  )}
                </div>
                )}

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
                    <p className="text-3xl font-bold text-white">${(analytics.summary.total_redemptions > 0 ? analytics.summary.total_revenue / analytics.summary.total_redemptions : 0).toFixed(2)}</p>
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
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Views', value: (analytics.summary?.total_views || 0).toLocaleString(), color: 'text-blue-400' },
                    { label: 'Total Clicks', value: (analytics.summary?.total_clicks || 0).toLocaleString(), color: 'text-purple-400' },
                    { label: 'Redemptions', value: (analytics.summary?.total_redemptions || 0).toLocaleString(), color: 'text-emerald-400' },
                    { label: 'Revenue', value: `$${(analytics.summary?.total_revenue || 0).toLocaleString()}`, color: 'text-amber-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5">
                      <p className="text-slate-400 text-sm">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {analytics.chart_data?.length > 0 && (
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
                )}
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
                {/* Boost Packages Header */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20 p-8 text-center">
                  <Rocket className="text-orange-400 mx-auto mb-4" size={48} />
                  <h2 className="text-white font-bold text-2xl mb-2">Supercharge Your Offers</h2>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">Boost your offers to reach more drivers and get more redemptions.</p>
                  <div className="flex items-center justify-center gap-8 text-sm">
                    <div className="text-center">
                      <p className="text-blue-400 font-bold text-xl">$9.99</p>
                      <p className="text-slate-500">Basic (24h)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-orange-400 font-bold text-xl">$19.99</p>
                      <p className="text-slate-500">Standard (3d)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-400 font-bold text-xl">$39.99</p>
                      <p className="text-slate-500">Premium (7d)</p>
                    </div>
                  </div>
                </div>

                {/* Active Boosts */}
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400" /> Active Boosts
                  </h3>
                  {offers.filter(o => o.is_boosted).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {offers.filter(o => o.is_boosted).map(offer => (
                        <div key={offer.id} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-white font-medium">{offer.title}</p>
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                              {offer.boost_multiplier}x
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mb-2">{offer.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={12} />
                            <span>Expires: {offer.boost_expires ? new Date(offer.boost_expires).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                      <p className="text-slate-400">No active boosts. Boost an offer below!</p>
                    </div>
                  )}
                </div>

                {/* Available Offers to Boost */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Boost an Offer</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {offers.filter(o => !o.is_boosted).map(offer => (
                      <div key={offer.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5">
                        <h3 className="text-white font-medium mb-2">{offer.title}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{offer.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                          <Eye size={12} /> {offer.views || 0} views
                          <span className="mx-1">•</span>
                          <Gift size={12} /> {offer.redemption_count || 0} redemptions
                        </div>
                        <button onClick={() => setShowBoostModal(offer)} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2.5 rounded-xl hover:from-orange-400 hover:to-red-400 flex items-center justify-center gap-2">
                          <Rocket size={16} />Boost Now
                        </button>
                      </div>
                    ))}
                  </div>
                  {offers.filter(o => !o.is_boosted).length === 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-6 text-center">
                      <p className="text-slate-400">All your offers are already boosted!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Finance / Credits Tab */}
            {activeTab === 'finance' && (
              <PartnerFinanceTab partnerProfile={partnerProfile} />
            )}

            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
              <PartnerReferralsTab partnerProfile={partnerProfile} />
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <PartnerPricingTab partnerProfile={partnerProfile} onUpgrade={() => {}} />
            )}
          </>
        )}
      </main>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl">Create New Offer</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="space-y-4">
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

                  {/* Location Selection - NEW */}
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block flex items-center gap-2">
                      <MapPin size={14} /> Select Location <span className="text-red-400">*</span>
                    </label>
                    {partnerProfile && partnerProfile.locations.length > 0 ? (
                      <select 
                        value={newOfferData.location_id}
                        onChange={(e) => setNewOfferData(prev => ({ ...prev, location_id: parseInt(e.target.value) }))}
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer"
                        data-testid="offer-location-select"
                      >
                        <option value={0} disabled>-- Choose a store location --</option>
                        {partnerProfile.locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.is_primary ? '(Primary)' : ''} - {loc.address.substring(0, 40)}...
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm">
                        <p className="font-medium mb-2">No locations added yet</p>
                        <p className="text-amber-400/70 mb-3">You need to add at least one store location before creating offers.</p>
                        <button 
                          type="button"
                          onClick={() => { setShowCreateModal(false); setActiveTab('locations'); }}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-400 inline-flex items-center gap-2"
                        >
                          <Plus size={16} /> Add Location
                        </button>
                      </div>
                    )}
                    {newOfferData.location_id > 0 && partnerProfile && (
                      <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-emerald-400 text-xs flex items-center gap-2">
                          <Check size={12} /> Offer will appear on map at this location
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Offer Title <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g., 20% Off Weekend Special" 
                      value={newOfferData.title}
                      onChange={(e) => setNewOfferData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Description</label>
                    <textarea 
                      placeholder="Describe your offer..." 
                      rows={3} 
                      value={newOfferData.description}
                      onChange={(e) => setNewOfferData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Discount %</label>
                      <input 
                        type="number" 
                        placeholder="15" 
                        value={newOfferData.discount_percent}
                        onChange={(e) => setNewOfferData(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" 
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Gems Reward</label>
                      <input 
                        type="number" 
                        placeholder="50" 
                        value={newOfferData.gems_reward}
                        onChange={(e) => setNewOfferData(prev => ({ ...prev, gems_reward: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-sm mb-1 block">Expires In (Days)</label>
                    <select 
                      value={newOfferData.expires_days}
                      onChange={(e) => setNewOfferData(prev => ({ ...prev, expires_days: parseInt(e.target.value) }))}
                      className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer"
                    >
                      <option value={1}>1 Day</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (Recommended)</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">Cancel</button>
                    <button 
                      type="button" 
                      onClick={handleCreateOffer}
                      disabled={!newOfferData.title || newOfferData.location_id === 0}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Offer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocationModal && (
        <LocationModal 
          onClose={() => setShowAddLocationModal(false)}
          onSave={handleAddLocation}
          maxLocations={partnerProfile?.max_locations || 5}
          currentCount={partnerProfile?.location_count || 0}
        />
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <LocationModal 
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={(data) => handleUpdateLocation(editingLocation.id, data)}
          maxLocations={partnerProfile?.max_locations || 5}
          currentCount={partnerProfile?.location_count || 0}
        />
      )}
    </div>
  )
}

// Location Modal Component
function LocationModal({ 
  location, 
  onClose, 
  onSave,
  maxLocations,
  currentCount
}: { 
  location?: PartnerLocation
  onClose: () => void
  onSave: (data: { name: string; address: string; lat: number; lng: number; is_primary: boolean }) => void
  maxLocations: number
  currentCount: number
}) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    lat: location?.lat || 39.9612,
    lng: location?.lng || -82.9988,
    is_primary: location?.is_primary || currentCount === 0
  })
  const [useManualCoords, setUseManualCoords] = useState(false)

  // Common Columbus OH addresses for quick selection
  const sampleAddresses = [
    { label: 'Downtown Columbus', address: '100 N High St, Columbus, OH 43215', lat: 39.9612, lng: -82.9988 },
    { label: 'Short North', address: '700 N High St, Columbus, OH 43215', lat: 39.9780, lng: -83.0030 },
    { label: 'Polaris', address: '1500 Polaris Pkwy, Columbus, OH 43240', lat: 40.1465, lng: -82.9859 },
    { label: 'Easton', address: '160 Easton Town Center, Columbus, OH 43219', lat: 40.0506, lng: -82.9157 },
    { label: 'German Village', address: '588 S Third St, Columbus, OH 43215', lat: 39.9434, lng: -82.9897 },
  ]

  const handleAddressSelect = (addr: typeof sampleAddresses[0]) => {
    setFormData(prev => ({
      ...prev,
      address: addr.address,
      lat: addr.lat,
      lng: addr.lng
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <MapPin className="text-emerald-400" size={24} />
                {location ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Location Name <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g., Main Store - Downtown" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" 
                  data-testid="location-name-input"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Quick Address Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  {sampleAddresses.map((addr, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddressSelect(addr)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.address === addr.address 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-slate-700/30 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {addr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-1 block">Full Address <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  placeholder="123 Main St, City, State ZIP" 
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500" 
                  data-testid="location-address-input"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setUseManualCoords(!useManualCoords)}
                  className="text-slate-400 text-sm hover:text-white flex items-center gap-2"
                >
                  <Globe size={14} />
                  {useManualCoords ? 'Hide' : 'Adjust'} Map Coordinates
                  <ChevronRight className={`transition-transform ${useManualCoords ? 'rotate-90' : ''}`} size={14} />
                </button>
                
                {useManualCoords && (
                  <div className="mt-3 p-4 bg-slate-700/30 rounded-xl border border-white/5">
                    <p className="text-slate-500 text-xs mb-3">Fine-tune exactly where your offer gem appears on the map</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Latitude</label>
                        <input 
                          type="number" 
                          step="0.0001"
                          value={formData.lat}
                          onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" 
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-xs mb-1 block">Longitude</label>
                        <input 
                          type="number" 
                          step="0.0001"
                          value={formData.lng}
                          onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
                <input 
                  type="checkbox" 
                  id="is-primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="is-primary" className="text-white cursor-pointer">
                  <span className="font-medium">Set as Primary Location</span>
                  <p className="text-slate-400 text-sm">Primary location is used as default for new offers</p>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl hover:bg-slate-700">
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => onSave(formData)}
                  disabled={!formData.name || !formData.address}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl hover:from-emerald-400 hover:to-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {location ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// PARTNER FINANCE TAB (from Figma)
// =============================================
const CREDIT_HISTORY = [
  { id: 1, type: 'credit', description: 'New Partner Referral – UrbanEats', amount: 50, date: 'Jun 12, 2025', icon: 'referral' },
  { id: 2, type: 'debit', description: 'Offer Boost Purchased', amount: -35, date: 'Jun 10, 2025', icon: 'boost' },
  { id: 3, type: 'credit', description: 'Monthly Bonus Credits', amount: 100, date: 'Jun 1, 2025', icon: 'bonus' },
  { id: 4, type: 'debit', description: 'Premium Feature Usage', amount: -20, date: 'May 28, 2025', icon: 'feature' },
  { id: 5, type: 'credit', description: 'Performance Bonus Q2', amount: 75, date: 'May 15, 2025', icon: 'bonus' },
]

const EARN_OPPORTUNITIES = [
  { title: 'Refer a New Partner', desc: 'Earn 50 credits for every approved business you refer', credits: '+50 credits', color: '#0084FF' },
  { title: 'Monthly Active Bonus', desc: 'Maintain 10+ active offers to earn bonus credits', credits: '+25 credits/mo', color: '#00DFA2' },
  { title: 'High Redemption Reward', desc: 'Earn 1 credit for every 10 offer redemptions', credits: '+1 per 10', color: '#F59E0B' },
]

const CHART_DATA = [
  { month: 'Jan', earned: 80, spent: 30 },
  { month: 'Feb', earned: 120, spent: 60 },
  { month: 'Mar', earned: 90, spent: 40 },
  { month: 'Apr', earned: 150, spent: 80 },
  { month: 'May', earned: 110, spent: 55 },
  { month: 'Jun', earned: 225, spent: 55 },
]

function PartnerFinanceTab({ partnerProfile }: { partnerProfile: any }) {
  const [creditBalance, setCreditBalance] = useState(0)
  const [loadingCredits, setLoadingCredits] = useState(true)

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const data = await partnerApi.getCredits()
        if (data.success) setCreditBalance(data.data.balance || 0)
      } catch (e) { console.error(e) }
      setLoadingCredits(false)
    }
    fetchCredits()
  }, [])

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gradient-to-br from-[#0084FF]/20 to-[#00DFA2]/10 rounded-2xl border border-[#0084FF]/20 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Credit Balance</p>
              <p className="text-5xl font-bold text-white mb-1">{creditBalance}</p>
              <p className="text-slate-400 text-sm">SnapRoad Partner Credits</p>
            </div>
            <div className="w-14 h-14 bg-[#0084FF]/20 rounded-2xl flex items-center justify-center">
              <Wallet className="text-[#0084FF]" size={28} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-[#0084FF] text-white font-semibold text-sm hover:opacity-90 flex items-center gap-2" data-testid="add-credits-btn">
              <CreditCard size={16} />Add Credits
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 flex items-center gap-2">
              <Download size={16} />Statement
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-1">Earned This Month</p>
            <p className="text-2xl font-bold text-[#00DFA2]">+225</p>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><ArrowUpRight size={12} className="text-[#00DFA2]" />+18% vs last month</p>
          </div>
          <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
            <p className="text-slate-400 text-xs mb-1">Spent This Month</p>
            <p className="text-2xl font-bold text-[#FF5A5A]">-55</p>
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1"><ArrowUpRight size={12} className="text-[#FF5A5A]" />Boosts & features</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <BarChart2 size={18} className="text-[#0084FF]" />Credit Activity (6 months)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CHART_DATA} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="earned" fill="#00DFA2" radius={[4, 4, 0, 0]} name="Earned" />
            <Bar dataKey="spent" fill="#FF5A5A" radius={[4, 4, 0, 0]} name="Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Receipt size={18} className="text-[#0084FF]" />Recent Activity
          </h3>
          <div className="space-y-3">
            {CREDIT_HISTORY.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.type === 'credit' ? 'bg-[#00DFA2]/10' : 'bg-[#FF5A5A]/10'}`}>
                    {item.type === 'credit' ? <ArrowUpRight size={16} className="text-[#00DFA2]" /> : <TrendingDown size={16} className="text-[#FF5A5A]" />}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{item.description}</p>
                    <p className="text-slate-500 text-xs">{item.date}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${item.type === 'credit' ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Earn More */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />Ways to Earn Credits
          </h3>
          <div className="space-y-4">
            {EARN_OPPORTUNITIES.map((op, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-white text-sm font-medium">{op.title}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: op.color, backgroundColor: `${op.color}15` }}>{op.credits}</span>
                </div>
                <p className="text-slate-400 text-xs">{op.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================
// PARTNER REFERRALS TAB (from Figma)
// =============================================
const REFERRAL_LEADERBOARD = [
  { rank: 1, name: 'UrbanEats Co.', referrals: 12, credits: 600, badge: 'gold' },
  { rank: 2, name: 'FuelStop Pro', referrals: 9, credits: 450, badge: 'silver' },
  { rank: 3, name: 'City Wheels', referrals: 7, credits: 350, badge: 'bronze' },
  { rank: 4, name: 'Greenway Mart', referrals: 5, credits: 250, badge: null },
  { rank: 5, name: 'Your Business', referrals: 3, credits: 150, badge: null, isMe: true },
]

const REFERRAL_TIERS = [
  { name: 'Bronze', range: '1–2 referrals', credits: '50 credits each', color: '#CD7F32' },
  { name: 'Silver', range: '3–5 referrals', credits: '60 credits each', color: '#C0C0C0' },
  { name: 'Gold', range: '6+ referrals', credits: '75 credits each', color: '#FFD700' },
]

const REFERRAL_TREND = [
  { month: 'Jan', referrals: 0 }, { month: 'Feb', referrals: 1 }, { month: 'Mar', referrals: 0 },
  { month: 'Apr', referrals: 1 }, { month: 'May', referrals: 1 }, { month: 'Jun', referrals: 3 },
]

function PartnerReferralsTab({ partnerProfile }: { partnerProfile: any }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0, total_earned: 0 })
  const referralLink = `https://snaproad.app/join?ref=${partnerProfile?.id || 'partner123'}`

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const data = await partnerApi.getReferrals()
        if (data.success && data.stats) setReferralStats(data.stats)
      } catch (e) { console.error(e) }
    }
    fetchReferrals()
  }, [partnerProfile?.id])

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Total Referrals', value: String(referralStats.total), icon: Share2, color: '#0084FF' },
          { label: 'Approved Partners', value: String(referralStats.active), icon: CheckCircle, color: '#00DFA2' },
          { label: 'Credits Earned', value: String(referralStats.total_earned), icon: Wallet, color: '#F59E0B' },
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              <p className="text-slate-400 text-sm">{kpi.label}</p>
            </div>
            <p className="text-4xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-br from-[#0084FF]/10 to-[#00DFA2]/5 border border-[#0084FF]/20 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Your Referral Link</h3>
        <p className="text-slate-400 text-sm mb-4">Share this link to earn credits when partners join SnapRoad</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm font-mono truncate">
            {referralLink}
          </div>
          <button onClick={copyLink} data-testid="copy-referral-link-btn"
            className="px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
            style={{ backgroundColor: copiedLink ? '#00DFA2' : '#0084FF', color: copiedLink ? '#0B1220' : 'white' }}>
            {copiedLink ? <><CheckCircle size={16} />Copied!</> : <><Share2 size={16} />Copy Link</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Referral Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={REFERRAL_TREND}>
              <defs>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0084FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0084FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="referrals" stroke="#0084FF" fill="url(#refGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tiers */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Reward Tiers</h3>
          <div className="space-y-3">
            {REFERRAL_TIERS.map((tier, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: `${tier.color}30`, backgroundColor: `${tier.color}08` }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: tier.color }}>{tier.name}</p>
                  <p className="text-slate-400 text-xs">{tier.range}</p>
                </div>
                <span className="text-white text-sm font-medium">{tier.credits}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Award size={18} className="text-amber-400" />Partner Leaderboard
        </h3>
        <div className="space-y-2">
          {REFERRAL_LEADERBOARD.map(entry => (
            <div key={entry.rank}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${entry.isMe ? 'border-[#0084FF]/30 bg-[#0084FF]/5' : 'border-white/5 bg-white/[0.02]'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                entry.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-white/5 text-slate-400'
              }`}>{entry.rank}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${entry.isMe ? 'text-[#0084FF]' : 'text-white'}`}>{entry.name} {entry.isMe && '(You)'}</p>
              </div>
              <span className="text-slate-400 text-sm">{entry.referrals} referrals</span>
              <span className="text-amber-400 font-semibold text-sm">{entry.credits} credits</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================
// PARTNER PRICING TAB (from Figma)
// =============================================
const PRICING_PLANS = [
  {
    id: 'local',
    name: 'Local',
    price: '$49',
    period: '/mo',
    desc: 'Perfect for single-location businesses',
    features: ['1 location', 'Up to 5 offers', 'Basic analytics', '100 free boosts', 'Email support'],
    color: '#64748b',
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$149',
    period: '/mo',
    desc: 'For growing businesses with multiple locations',
    features: ['Up to 5 locations', 'Unlimited offers', 'Advanced analytics', '500 free boosts', 'Priority support', 'AI image generation', 'Referral rewards'],
    color: '#0084FF',
    cta: 'Upgrade Now',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large chains and franchise networks',
    features: ['Unlimited locations', 'Unlimited offers', 'Full analytics suite', 'Unlimited boosts', 'Dedicated account manager', 'Custom integrations', 'White-label options'],
    color: '#00DFA2',
    cta: 'Contact Sales',
    popular: false,
  },
]

function PartnerPricingTab({ partnerProfile, onUpgrade }: { partnerProfile: any; onUpgrade: () => void }) {
  const currentPlan = partnerProfile?.plan || 'local'

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-slate-400 text-sm">
          Current plan: <span className="text-white font-semibold capitalize">{currentPlan}</span>
          {' · '}
          <span className="text-[#0084FF] cursor-pointer hover:underline">Manage billing</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {PRICING_PLANS.map(plan => {
          const isActive = plan.id === currentPlan
          return (
            <div key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                plan.popular
                  ? 'border-[#0084FF] ring-2 ring-[#0084FF]/20'
                  : 'border-white/10 hover:border-white/20'
              } ${isActive ? 'bg-white/[0.04]' : 'bg-slate-800/30'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0084FF] text-white text-xs font-bold">
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                  <BadgeCheck size={20} style={{ color: plan.color }} />
                </div>
                <h3 className="text-white text-xl font-bold">{plan.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>

              <div className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: plan.color }} className="shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onUpgrade}
                data-testid={`plan-btn-${plan.id}`}
                disabled={isActive}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-white/10 text-slate-400 cursor-default'
                    : plan.popular
                      ? 'bg-[#0084FF] text-white hover:opacity-90'
                      : 'bg-white/10 text-white hover:bg-white/15'
                }`}>
                {isActive ? 'Current Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-slate-400 text-sm">
          Need a custom solution? <span className="text-[#0084FF] cursor-pointer hover:underline font-medium">Contact our sales team</span>
          {' '}or view our <span className="text-[#0084FF] cursor-pointer hover:underline font-medium">full feature comparison</span>
        </p>
      </div>
    </div>
  )
}

