import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Gift, TrendingUp, BarChart3,
  Bell, Settings, LogOut, HelpCircle,
  Rocket, Store, CreditCard, Share2, BadgeCheck, QrCode, Receipt,
  Menu, X,
} from 'lucide-react'
import { NotificationCenter, useNotifications, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'
import { partnerApi } from '@/services/partnerApi'
import type { Offer, PartnerProfile, Analytics, PartnerFeeSummary, PartnerRedemption } from '@/types/partner'

import OnboardingWalkthrough from '@/components/partner/OnboardingWalkthrough'
import PromotionWelcomeModal from '@/components/partner/PromotionWelcomeModal'
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
import RedemptionsTab from '@/components/partner/RedemptionsTab'
import { useSupabaseRealtimeRefresh } from '@/hooks/useSupabaseRealtimeRefresh'

type TabId = 'overview' | 'offers' | 'locations' | 'analytics' | 'boosts' | 'finance' | 'redemptions' | 'referrals' | 'pricing' | 'team-links'

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  overview:      { title: 'Dashboard Overview',  subtitle: 'Manage your SnapRoad offers and track performance' },
  offers:        { title: 'My Offers',           subtitle: 'Create and manage your business offers' },
  locations:     { title: 'Store Locations',     subtitle: 'Manage your store locations on the map' },
  analytics:     { title: 'Real-Time Analytics', subtitle: 'Track your offer performance in real-time' },
  boosts:        { title: 'Boost Center',        subtitle: 'Amplify your offer reach with paid boosts' },
  finance:       { title: 'Credits & Earnings',  subtitle: 'Manage your SnapRoad partner credits and earnings' },
  redemptions:   { title: 'Redemptions Ledger',  subtitle: 'Review scans, fee tiers, and monthly redemption activity' },
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
  { id: 'redemptions', icon: Receipt,    label: 'Redemptions' },
  { id: 'referrals',   icon: Share2,     label: 'Referrals' },
  { id: 'team-links',  icon: QrCode,     label: 'Team Scan Links' },
  { id: 'pricing',     icon: BadgeCheck, label: 'Plan & Pricing' },
]

export default function PartnerDashboard({ initialTab = 'overview' }: { initialTab?: TabId }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [offers, setOffers] = useState<Offer[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [redemptions, setRedemptions] = useState<PartnerRedemption[]>([])
  const [feeInfo, setFeeInfo] = useState<PartnerFeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
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
  const [showPromotionWelcome, setShowPromotionWelcome] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const { sendNotification } = useNotifications()

  const planIncomplete = useMemo(() => {
    const s = (partnerProfile?.subscription_status || '').toLowerCase()
    return s === 'pending' || s === 'incomplete'
  }, [partnerProfile?.subscription_status])

  useEffect(() => {
    if (!planIncomplete) return
    setActiveTab((cur) => (cur === 'pricing' ? cur : 'pricing'))
  }, [planIncomplete])

  const navigateTab = useCallback(
    (id: TabId) => {
      if (planIncomplete && id !== 'pricing') {
        setActiveTab('pricing')
        setMobileNavOpen(false)
        return
      }
      setActiveTab(id)
      setMobileNavOpen(false)
    },
    [planIncomplete],
  )

  useLayoutEffect(() => {
    document.title = `SnapRoad Partner · ${TAB_META[activeTab].title}`
  }, [activeTab])

  useEffect(() => {
    if (!localStorage.getItem('partner_onboarding_complete')) setShowOnboarding(true)
    loadData()
    loadPartnerProfile()
    const stopNotifications = notificationService.startDemoNotifications(45000)
    return () => stopNotifications()
  }, [])

  // Stripe return URLs land with ?payment=success or ?credits=success — refresh profile (plan / balance).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') !== 'success' && params.get('credits') !== 'success') return
    void (async () => {
      try {
        const data = await partnerApi.getProfile()
        if (data.success && data.data) setPartnerProfile(data.data as PartnerProfile)
      } catch {
        /* ignore */
      }
      window.history.replaceState({}, '', '/portal/partner')
    })()
  }, [])
  useEffect(() => {
    const t = (searchParams.get('tab') || '').toLowerCase()
    if (t === 'pricing') {
      setActiveTab('pricing')
      setMobileNavOpen(false)
      return
    }
    setActiveTab(initialTab)
    setMobileNavOpen(false)
  }, [initialTab, searchParams])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const closeIfDesktop = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', closeIfDesktop)
    closeIfDesktop()
    return () => mq.removeEventListener('change', closeIfDesktop)
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  useEffect(() => {
    if (!mobileNavOpen) return
    const mq = window.matchMedia('(max-width: 767px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  useEffect(() => {
    if (!partnerProfile?.promotion_active || !partnerProfile.promotion_access_until) {
      setShowPromotionWelcome(false)
      return
    }
    if (showOnboarding) {
      setShowPromotionWelcome(false)
      return
    }
    const until = String(partnerProfile.promotion_access_until)
    const ack = localStorage.getItem('partner_promo_ack_until') || ''
    if (ack === until) {
      setShowPromotionWelcome(false)
      return
    }
    const t = window.setTimeout(() => setShowPromotionWelcome(true), 400)
    return () => window.clearTimeout(t)
  }, [partnerProfile?.promotion_active, partnerProfile?.promotion_access_until, showOnboarding])

  const acknowledgePartnerPromo = useCallback(() => {
    if (partnerProfile?.promotion_access_until) {
      localStorage.setItem('partner_promo_ack_until', String(partnerProfile.promotion_access_until))
    }
    setShowPromotionWelcome(false)
  }, [partnerProfile?.promotion_access_until])

  const handlePartnerAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Session expired')) {
      navigate('/portal/partner/sign-in')
      return true
    }
    return false
  }

  const loadPartnerProfile = useCallback(async () => {
    try {
      const data = await partnerApi.getProfile()
      if (data.success) setPartnerProfile(data.data)
    } catch (e) {
      if (handlePartnerAuthError(e)) return
      console.error('Error loading partner profile:', e)
    }
  }, [navigate])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, redemptionsRes, feeRes] = await Promise.all([
        partnerApi.getAnalytics(),
        partnerApi.getRedemptions(50),
        partnerApi.getFees(),
      ])
      if (analyticsRes.success) setAnalytics(analyticsRes.data)
      if (redemptionsRes.success) setRedemptions(redemptionsRes.data || [])
      if (feeRes.success) setFeeInfo(feeRes.data || null)
    } catch (e) {
      if (handlePartnerAuthError(e)) return
      console.error(e)
    }
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
    } catch (e) {
      if (handlePartnerAuthError(e)) return
      console.error(e)
    }
    setLoading(false)
  }, [navigate])

  useSupabaseRealtimeRefresh(
    `partner-portal-${partnerProfile?.id || 'anon'}`,
    [
      { table: 'offer_analytics', ...(partnerProfile?.id ? { filter: `partner_id=eq.${partnerProfile.id}` } : {}) },
      { table: 'redemptions', ...(partnerProfile?.id ? { filter: `partner_id=eq.${partnerProfile.id}` } : {}) },
      { table: 'redemption_fees', ...(partnerProfile?.id ? { filter: `partner_id=eq.${partnerProfile.id}` } : {}) },
      { table: 'offers', ...(partnerProfile?.id ? { filter: `partner_id=eq.${partnerProfile.id}` } : {}) },
    ],
    () => {
      loadData()
      loadPartnerProfile()
    },
  )

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
        sendNotification('system', 'Offer not created', data.message || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Check your connection and try again.'
      sendNotification('system', 'Could not create offer', msg)
    }
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
        sendNotification('system', 'Offer not updated', data.message || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Check your connection and try again.'
      sendNotification('system', 'Could not update offer', msg)
    }
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

  const needsPlanCheckout = planIncomplete
  const exportRedemptionsCsv = () => {
    const rows = [
      ['Redeemed At', 'Offer', 'Customer', 'Discount', 'Fee', 'Tier'],
      ...redemptions.map((item) => [
        item.redeemed_at || item.created_at || '',
        item.offer_name || item.business_name || String(item.offer_id),
        item.user_name || item.customer_id || 'Driver',
        item.discount_applied ?? '',
        item.fee_amount ?? (typeof item.fee_cents === 'number' ? item.fee_cents / 100 : 0),
        item.fee_tier ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `snaproad-redemptions-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <PromotionWelcomeModal
        open={showPromotionWelcome}
        theme="dark"
        promotionPlan={partnerProfile?.promotion_plan}
        promotionAccessUntil={partnerProfile?.promotion_access_until}
        onClose={acknowledgePartnerPromo}
        onViewPlans={() => {
          acknowledgePartnerPromo()
          navigateTab('pricing')
        }}
      />
      {showOnboarding && <OnboardingWalkthrough onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
      {showBoostModal && <BoostModal offer={showBoostModal} onClose={() => setShowBoostModal(null)} onBoost={async (boostType) => {
        try {
          const result = await partnerApi.createBoost({ offer_id: Number(showBoostModal.id), boost_type: boostType, use_credits: true })
          if (result.success) {
            sendNotification('system', 'Boost', result.message || 'Boost applied successfully')
          } else {
            sendNotification('system', 'Boost', result.message || 'Could not apply boost')
          }
          setShowBoostModal(null)
          await loadData()
        } catch { sendNotification('system', 'Error', 'Failed to apply boost'); setShowBoostModal(null) }
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
          onSwitchToLocations={() => navigateTab('locations')}
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

      {/* Mobile drawer backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/5 bg-slate-900/50 backdrop-blur-xl transition-transform duration-300 ease-out md:translate-x-0 ${mobileNavOpen ? 'translate-x-0 shadow-2xl shadow-black/40' : '-translate-x-full'}`}
      >
        <div className="border-b border-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg shadow-emerald-500/20">
                <img src="/snaproad-logo.svg" alt="" className="h-full w-full object-cover" width={48} height={48} />
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold text-white">SnapRoad</span>
                <span className="block text-xs font-medium text-emerald-400">Partner Portal</span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => navigateTab(item.id)} data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={20} />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {getBadge(item.badgeKey) && <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{getBadge(item.badgeKey)}</span>}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-2 border-t border-white/5 pt-8">
            <button type="button" onClick={() => { setShowHelp(true); setMobileNavOpen(false) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white">
              <HelpCircle size={20} /><span className="font-medium">Help & Tour</span>
            </button>
            <button type="button" onClick={() => { setShowSettings(true); setMobileNavOpen(false) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white">
              <Settings size={20} /><span className="font-medium">Settings</span>
            </button>
            <button type="button" onClick={() => { setShowNotifications(true); setMobileNavOpen(false) }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white">
              <Bell size={20} /><span className="font-medium">Notifications</span>
            </button>
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/5 bg-slate-900/80 p-4">
          <button type="button" onClick={() => { setMobileNavOpen(false); partnerApi.logout(); navigate('/portal/partner/welcome') }} data-testid="logout-btn" className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 hover:bg-red-500/10">
            <LogOut size={20} /><span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Modals */}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onLogout={() => { partnerApi.logout(); navigate('/portal/partner/welcome') }} />
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        appType="partner"
        onReplayTour={() => setShowOnboarding(true)}
      />

      {/* Main Content */}
      <main className="ml-0 min-w-0 overflow-x-hidden p-4 pb-24 sm:p-6 md:ml-72 md:pb-8 md:p-8">
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="shrink-0 rounded-xl p-2.5 text-white hover:bg-white/10"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
            <img src="/snaproad-logo.svg" alt="" className="h-full w-full object-cover" width={40} height={40} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{TAB_META[activeTab].title}</p>
            <p className="truncate text-xs text-slate-500">Partner Portal</p>
          </div>
        </div>

        {needsPlanCheckout && (
          <div
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div>
              <p className="font-semibold text-white">Choose a subscription plan</p>
              <p className="text-sm text-slate-400">
                Your account is active; complete checkout to finish onboarding and unlock billing-backed features.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTab('pricing')}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-emerald-400 hover:to-teal-500"
            >
              View plans
            </button>
          </div>
        )}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 md:block">
            <h1 className="mb-1 hidden text-3xl font-bold text-white md:block">{TAB_META[activeTab].title}</h1>
            <p className="hidden text-slate-400 md:block">{TAB_META[activeTab].subtitle}</p>
            <p className="text-slate-400 md:hidden">{TAB_META[activeTab].subtitle}</p>
          </div>
          {activeTab === 'offers' && (
            <button type="button" onClick={() => setShowCreateModal(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 sm:px-6">
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
                onUpgradePlan={() => navigateTab('pricing')}
              />
            )}
            {activeTab === 'boosts' && <BoostsTab offers={offers} onBoost={setShowBoostModal} />}
            {activeTab === 'finance' && <FinanceTab />}
            {activeTab === 'redemptions' && (
              <RedemptionsTab
                redemptions={redemptions}
                feeInfo={feeInfo}
                onExportCsv={exportRedemptionsCsv}
                onOpenScanner={() => navigateTab('team-links')}
              />
            )}
            {activeTab === 'referrals' && <ReferralsTab partnerId={partnerProfile?.id} />}
            {activeTab === 'team-links' && <TeamLinksTab partnerId={partnerProfile?.id || ''} />}
            {activeTab === 'pricing' && <PricingTab currentPlan={partnerProfile?.plan || 'starter'} onUpgrade={(planId) => handlePlanUpgrade(planId)} />}
          </>
        )}
      </main>
    </div>
  )
}
