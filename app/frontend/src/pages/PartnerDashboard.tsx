import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Gift, TrendingUp, BarChart3,
  Bell, Settings, LogOut, HelpCircle,
  Rocket, Store, CreditCard, Share2, BadgeCheck, QrCode,
} from 'lucide-react'
import { NotificationCenter, useNotifications, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'
import { partnerApi } from '@/services/partnerApi'
import type { Offer, PartnerProfile, Analytics } from '@/types/partner'

import OnboardingWalkthrough from '@/components/partner/OnboardingWalkthrough'
import ImageGeneratorModal from '@/components/partner/ImageGeneratorModal'
import BoostModal from '@/components/partner/BoostModal'
import CreateOfferModal from '@/components/partner/CreateOfferModal'
import EditOfferModal from '@/components/partner/EditOfferModal'
import DeleteConfirmModal from '@/components/partner/DeleteConfirmModal'
import OverviewTab from '@/components/partner/OverviewTab'
import OffersTab from '@/components/partner/OffersTab'
import AnalyticsTab from '@/components/partner/AnalyticsTab'
import LocationsTab from '@/components/partner/LocationsTab'
import BoostsTab from '@/components/partner/BoostsTab'
import FinanceTab from '@/components/partner/FinanceTab'
import ReferralsTab from '@/components/partner/ReferralsTab'
import TeamLinksTab from '@/components/partner/TeamLinksTab'
import PricingTab from '@/components/partner/PricingTab'

type TabId = 'overview' | 'offers' | 'locations' | 'analytics' | 'boosts' | 'finance' | 'referrals' | 'pricing' | 'team-links'

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  overview:      { title: 'Dashboard Overview',  subtitle: 'Manage your SnapRoad offers and track performance' },
  offers:        { title: 'My Offers',           subtitle: 'Create and manage your business offers' },
  locations:     { title: 'Store Locations',     subtitle: 'Manage your store locations on the map' },
  analytics:     { title: 'Real-Time Analytics', subtitle: 'Track your offer performance in real-time' },
  boosts:        { title: 'Boost Center',        subtitle: 'Amplify your offer reach with paid boosts' },
  finance:       { title: 'Credits & Earnings',  subtitle: 'Manage your SnapRoad partner credits and earnings' },
  referrals:     { title: 'Referral Analytics',  subtitle: 'Earn credits by referring new partners to SnapRoad' },
  pricing:       { title: 'Plans & Pricing',     subtitle: 'Upgrade your plan to unlock more features' },
  'team-links':  { title: 'Team Scan Links',     subtitle: 'Create shareable QR scan links for your team members' },
}

const NAV_ITEMS: { id: TabId; icon: typeof BarChart3; label: string; badgeKey?: 'offers' | 'locations' }[] = [
  { id: 'overview',    icon: BarChart3,  label: 'Overview' },
  { id: 'offers',      icon: Gift,       label: 'My Offers',         badgeKey: 'offers' },
  { id: 'locations',   icon: Store,      label: 'Locations',         badgeKey: 'locations' },
  { id: 'analytics',   icon: TrendingUp, label: 'Analytics' },
  { id: 'boosts',      icon: Rocket,     label: 'Boosts' },
  { id: 'finance',     icon: CreditCard, label: 'Credits & Finance' },
  { id: 'referrals',   icon: Share2,     label: 'Referrals' },
  { id: 'team-links',  icon: QrCode,     label: 'Team Scan Links' },
  { id: 'pricing',     icon: BadgeCheck, label: 'Plan & Pricing' },
]

export default function PartnerDashboard() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<Offer[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState<Offer | null>(null)
  const [showImageGenerator, setShowImageGenerator] = useState(false)
  const [newOfferImage, setNewOfferImage] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null)

  const { sendNotification } = useNotifications()

  useEffect(() => {
    if (!localStorage.getItem('partner_onboarding_complete')) setShowOnboarding(true)
    loadData()
    loadPartnerProfile()
    const stopNotifications = notificationService.startDemoNotifications(45000)
    return () => stopNotifications()
  }, [])

  const loadPartnerProfile = async () => {
    try {
      const data = await partnerApi.getProfile()
      if (data.success) setPartnerProfile(data.data)
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
        sendNotification('system', 'Location Added', `${locationData.name} has been added.`)
        loadPartnerProfile()
      } else {
        sendNotification('system', 'Error', data.message || 'Failed to add location')
      }
    } catch { sendNotification('system', 'Error', 'Failed to add location') }
  }

  const handleUpdateLocation = async (locationId: string, locationData: { name: string; address: string; lat: number; lng: number; is_primary: boolean }) => {
    try {
      const data = await partnerApi.updateLocation(locationId, locationData)
      if (data.success) {
        sendNotification('system', 'Location Updated', 'Location has been updated successfully.')
        loadPartnerProfile()
      }
    } catch { sendNotification('system', 'Error', 'Failed to update location') }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return
    try {
      const data = await partnerApi.deleteLocation(locationId)
      if (data.success) {
        sendNotification('system', 'Location Deleted', 'Location has been removed.')
        loadPartnerProfile()
      }
    } catch { sendNotification('system', 'Error', 'Failed to delete location') }
  }

  const handleSetPrimaryLocation = async (locationId: string) => {
    try {
      const data = await partnerApi.setPrimaryLocation(locationId)
      if (data.success) {
        sendNotification('system', 'Primary Location', 'Primary location updated.')
        loadPartnerProfile()
      }
    } catch { sendNotification('system', 'Error', 'Failed to update primary location') }
  }

  const handlePlanUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@snaproad.co?subject=Enterprise Plan Inquiry', '_blank')
      return
    }
    try {
      const result = await partnerApi.subscribeToplan(planId)
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url
      } else {
        sendNotification('system', 'Plan Upgrade', result.message || 'Stripe not configured yet')
      }
    } catch { sendNotification('system', 'Error', 'Failed to start checkout') }
  }

  const handleCreateOffer = async (offerData: { title: string; description: string; discount_percent: number; gems_reward: number; is_free_item?: boolean; location_id: string; expires_days: number }, image: string | null) => {
    if (!offerData.title || !offerData.location_id) {
      sendNotification('system', 'Error', 'Please fill in all required fields and select a location.')
      return
    }
    try {
      const data = await partnerApi.createOffer({
        title: offerData.title,
        description: offerData.description,
        discount_percent: offerData.discount_percent,
        gems_reward: offerData.gems_reward,
        is_free_item: offerData.is_free_item ?? false,
        location_id: offerData.location_id,
        expires_hours: offerData.expires_days * 24,
        image_url: image,
      })
      if (data.success) {
        sendNotification('offer', 'Offer Created', 'Your new offer is now live!')
        setShowCreateModal(false)
        setNewOfferImage(null)
        loadData()
      } else {
        sendNotification('system', 'Error', data.message || 'Failed to create offer')
      }
    } catch { sendNotification('system', 'Error', 'Failed to create offer') }
  }

  const handleEditOffer = async (offerId: string) => {
    const offer = offers.find(o => String(o.id) === offerId)
    if (offer) setEditingOffer(offer)
  }

  const handleUpdateOffer = async (offerId: string, offerData: { title: string; description: string; discount_percent: number; gems_reward: number; location_id: string; expires_days: number }) => {
    try {
      const data = await partnerApi.updateOffer(offerId, {
        ...offerData,
        expires_hours: offerData.expires_days * 24,
      })
      if (data.success) {
        sendNotification('offer', 'Offer Updated', 'Your offer has been updated successfully!')
        setEditingOffer(null)
        loadData()
      } else {
        sendNotification('system', 'Error', data.message || 'Failed to update offer')
      }
    } catch { sendNotification('system', 'Error', 'Failed to update offer') }
  }

  const handleDeleteOffer = async (offerId: string) => {
    const offer = offers.find(o => String(o.id) === offerId)
    if (offer) setDeletingOffer(offer)
  }

  const confirmDeleteOffer = async () => {
    if (!deletingOffer) return
    try {
      const data = await partnerApi.deleteOffer(String(deletingOffer.id))
      if (data.success) {
        sendNotification('system', 'Offer Deleted', 'Offer has been removed successfully.')
        setDeletingOffer(null)
        loadData()
      } else {
        sendNotification('system', 'Error', data.message || 'Failed to delete offer')
      }
    } catch { sendNotification('system', 'Error', 'Failed to delete offer') }
  }

  const getBadge = (key?: 'offers' | 'locations') => {
    if (key === 'offers') return offers.length.toString()
    if (key === 'locations') return partnerProfile?.location_count?.toString() || '0'
    return undefined
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {showOnboarding && <OnboardingWalkthrough onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
      {showBoostModal && <BoostModal offer={showBoostModal} onClose={() => setShowBoostModal(null)} onBoost={async (boostType) => {
        try {
          const result = await partnerApi.purchaseBoost(String(showBoostModal.id), boostType)
          if (result.success && result.checkout_url) {
            window.location.href = result.checkout_url
          } else {
            sendNotification('system', 'Boost', result.message || 'Stripe not configured yet')
            setShowBoostModal(null)
            await loadData()
          }
        } catch { sendNotification('system', 'Error', 'Failed to start checkout'); setShowBoostModal(null) }
      }} />}
      {showImageGenerator && <ImageGeneratorModal onClose={() => setShowImageGenerator(false)} onGenerate={(url) => setNewOfferImage(url)} />}
      {showCreateModal && (
        <CreateOfferModal
          partnerProfile={partnerProfile}
          newOfferImage={newOfferImage}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateOffer}
          onOpenImageGenerator={() => setShowImageGenerator(true)}
          onClearImage={() => setNewOfferImage(null)}
          onSwitchToLocations={() => setActiveTab('locations')}
        />
      )}

      {editingOffer && (
        <EditOfferModal
          offer={editingOffer}
          partnerProfile={partnerProfile}
          onClose={() => setEditingOffer(null)}
          onUpdate={handleUpdateOffer}
        />
      )}

      {deletingOffer && (
        <DeleteConfirmModal
          title="Delete Offer"
          message={`Are you sure you want to delete "${deletingOffer.title}"? This action cannot be undone.`}
          confirmText="Delete Offer"
          onConfirm={confirmDeleteOffer}
          onCancel={() => setDeletingOffer(null)}
        />
      )}

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
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {getBadge(item.badgeKey) && <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{getBadge(item.badgeKey)}</span>}
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
          <button onClick={() => { partnerApi.logout(); navigate('/portal/partner/welcome') }} data-testid="logout-btn" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10">
            <LogOut size={20} /><span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onLogout={() => { partnerApi.logout(); navigate('/portal/partner/welcome') }} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} appType="partner" />

      {/* Main Content */}
      <main className="ml-72 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{TAB_META[activeTab].title}</h1>
            <p className="text-slate-400">{TAB_META[activeTab].subtitle}</p>
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
            {activeTab === 'overview' && analytics && <OverviewTab analytics={analytics} />}
            {activeTab === 'offers' && <OffersTab offers={offers} onBoost={setShowBoostModal} onEdit={handleEditOffer} onDelete={handleDeleteOffer} />}
            {activeTab === 'analytics' && analytics && <AnalyticsTab analytics={analytics} />}
            {activeTab === 'locations' && partnerProfile && (
              <LocationsTab
                partnerProfile={partnerProfile}
                onAdd={handleAddLocation}
                onUpdate={handleUpdateLocation}
                onDelete={handleDeleteLocation}
                onSetPrimary={handleSetPrimaryLocation}
                onUpgradePlan={() => setActiveTab('pricing')}
              />
            )}
            {activeTab === 'boosts' && <BoostsTab offers={offers} onBoost={setShowBoostModal} />}
            {activeTab === 'finance' && <FinanceTab />}
            {activeTab === 'referrals' && <ReferralsTab partnerId={partnerProfile?.id} />}
            {activeTab === 'team-links' && <TeamLinksTab partnerId={partnerProfile?.id || ''} />}
            {activeTab === 'pricing' && <PricingTab currentPlan={partnerProfile?.plan || 'starter'} onUpgrade={(planId) => handlePlanUpgrade(planId)} />}
          </>
        )}
      </main>
    </div>
  )
}
