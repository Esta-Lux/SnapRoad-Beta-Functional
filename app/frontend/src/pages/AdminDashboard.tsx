// SnapRoad Admin Portal - Ryan's Emergent Improvements + Our Admin Components
// Professional architecture with modular, clean, extensible code

import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, AlertTriangle, Eye, Gift, Building2, BarChart3,
  Bell, TrendingUp, DollarSign, Scale, Settings, FileText, LogOut,
  Moon, Sun, Crown, LayoutGrid, Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

import { adminApi } from '@/services/adminApi'
import { useAuthStore } from '@/store/authStore'
import DashboardOverview from '@/components/admin/DashboardOverview'
import UsersTab from '@/components/admin/UsersTab'
import IncidentsTab from '@/components/admin/IncidentsTab'
import AIModerationTab from '@/components/admin/AIModerationTab'
import RewardsTab from '@/components/admin/RewardsTab'
import PartnersTab from '@/components/admin/PartnersTab'
import ReferralAnalyticsTab from '@/components/admin/ReferralAnalyticsTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import FinanceTab from '@/components/admin/FinanceTab'
import LegalTab from '@/components/admin/LegalTab'
import SettingsTab from '@/components/admin/SettingsTab'
import NotificationsTab from '@/components/admin/NotificationsTab'
import AuditLogTab from '@/components/admin/AuditLogTab'
import { AdminOfferManagement } from '@/components/admin/AdminOfferManagement'
import AppControl from '@/pages/AdminDashboard/components/AppControl'

const NAV_BASE = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badgeKey: '' },
  { id: 'appcontrol', label: 'Operations', icon: LayoutGrid, badgeKey: '' },
  { id: 'users', label: 'Users & Families', icon: Users, badgeKey: 'total_users' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badgeKey: 'pending_incidents' },
  { id: 'moderation', label: 'AI Moderation Queue', icon: Eye, badgeKey: '' },
  { id: 'rewards', label: 'Rewards & Vouchers', icon: Gift, badgeKey: '' },
  { id: 'partners', label: 'Partners & Campaigns', icon: Building2, badgeKey: 'total_partners' },
  { id: 'offers', label: 'Offer Management', icon: Gift, badgeKey: '' },
  { id: 'referrals', label: 'Partner Referral Analytics', icon: BarChart3, badgeKey: '' },
  { id: 'notifications', label: 'Notifications', icon: Bell, badgeKey: '' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, badgeKey: '' },
  { id: 'finance', label: 'Finance', icon: DollarSign, badgeKey: '' },
  { id: 'legal', label: 'Legal & Compliance', icon: Scale, badgeKey: '' },
  { id: 'settings', label: 'Settings', icon: Settings, badgeKey: '' },
  { id: 'audit', label: 'Audit Log', icon: FileText, badgeKey: '' },
]

export default function AdminDashboard({ initialTab = 'dashboard', initialOffersBulkOpen = false }: { initialTab?: string; initialOffersBulkOpen?: boolean }) {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [darkMode, setDarkMode] = useState(true)
  const [navBadges, setNavBadges] = useState<Record<string, string>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('snaproad-admin-sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('snaproad-admin-sidebar-collapsed', desktopNavCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [desktopNavCollapsed])

  const goTab = useCallback((id: string) => {
    setActiveTab(id)
    setMobileNavOpen(false)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', onChange)
    onChange()
    return () => mq.removeEventListener('change', onChange)
  }, [])

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
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const res = await adminApi.getStats()
        if (res.success && res.data) {
          setIsConnected(true)
          const s = res.data
          const pending = s.pending_incidents ?? 0
          setNavBadges({
            total_users: (s.total_users || 0).toLocaleString(),
            total_partners: (s.total_partners || 0).toLocaleString(),
            pending_incidents: pending > 99 ? '99+' : pending > 0 ? String(pending) : '',
          })
        }
      } catch {
        setIsConnected(false)
      }
    }
    loadBadges()
    const t = window.setInterval(loadBadges, 45000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useLayoutEffect(() => {
    const item = NAV_BASE.find((n) => n.id === activeTab)
    document.title = item ? `SnapRoad Admin · ${item.label}` : 'SnapRoad Admin'
  }, [activeTab])

  const NAV_ITEMS = NAV_BASE.map(item => ({
    ...item,
    badge: item.badgeKey ? navBadges[item.badgeKey] || '' : '',
  }))

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            theme={darkMode ? 'dark' : 'light'}
            onNavigate={(tabId) => setActiveTab(tabId)}
          />
        )
      case 'appcontrol':
        return (
          <AppControl
            theme={darkMode ? 'dark' : 'light'}
            onNavigate={(tabId) => setActiveTab(tabId)}
          />
        )
      case 'users':
        return <UsersTab theme={darkMode ? 'dark' : 'light'} />
      case 'incidents':
        return <IncidentsTab theme={darkMode ? 'dark' : 'light'} />
      case 'moderation':
        return <AIModerationTab theme={darkMode ? 'dark' : 'light'} />
      case 'rewards':
        return <RewardsTab theme={darkMode ? 'dark' : 'light'} />
      case 'partners':
        return <PartnersTab theme={darkMode ? 'dark' : 'light'} onNavigate={(tabId) => goTab(tabId)} />
      case 'offers':
        return <AdminOfferManagement onNavigate={(page) => goTab(page)} theme={darkMode ? 'dark' : 'light'} initialBulkOpen={initialOffersBulkOpen} />
      case 'referrals':
        return <ReferralAnalyticsTab theme={darkMode ? 'dark' : 'light'} />
      case 'notifications':
        return <NotificationsTab theme={darkMode ? 'dark' : 'light'} />
      case 'analytics':
        return <AnalyticsTab theme={darkMode ? 'dark' : 'light'} />
      case 'finance':
        return <FinanceTab theme={darkMode ? 'dark' : 'light'} />
      case 'legal':
        return <LegalTab theme={darkMode ? 'dark' : 'light'} />
      case 'settings':
        return <SettingsTab theme={darkMode ? 'dark' : 'light'} />
      case 'audit':
        return <AuditLogTab theme={darkMode ? 'dark' : 'light'} />
      default:
        return (
          <DashboardOverview
            theme={darkMode ? 'dark' : 'light'}
            onNavigate={(tabId) => goTab(tabId)}
          />
        )
    }
  }

  return (
    <div className={`min-h-screen md:h-screen md:overflow-hidden transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileNavOpen(false)}
      />

      <div className="flex md:h-full">
        <aside
          className={`fixed bottom-0 left-0 top-0 z-40 flex w-72 max-w-[88vw] flex-col border-r transition-[width,transform,colors] duration-300 ease-out md:sticky md:top-0 md:h-screen md:max-w-none md:translate-x-0 ${
            desktopNavCollapsed ? 'md:w-[4.5rem]' : 'md:w-72'
          } ${
            darkMode ? 'border-white/10 bg-[#0D0D10]' : 'border-gray-200 bg-white'
          } ${mobileNavOpen ? 'translate-x-0 pointer-events-auto shadow-2xl shadow-black/40' : '-translate-x-full pointer-events-none md:translate-x-0 md:pointer-events-auto'}`}
        >
          <div className={`shrink-0 border-b p-5 transition-colors duration-200 ${darkMode ? 'border-white/10' : 'border-gray-200'} ${desktopNavCollapsed ? 'md:p-3' : ''}`}>
            <div className="flex items-center gap-2">
              <div className={`flex min-w-0 flex-1 items-center gap-3 ${desktopNavCollapsed ? 'md:justify-center' : ''}`}>
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gray-950/80">
                  <img src="/snaproad-logo.svg" alt="" className="h-full w-full object-cover" width={44} height={44} />
                </div>
                <div className={`min-w-0 flex-1 ${desktopNavCollapsed ? 'md:hidden' : ''}`}>
                  <h1 className={`font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>SnapRoad</h1>
                  <p className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin Console</p>
                </div>
              </div>
              <button
                type="button"
                className={`hidden shrink-0 rounded-lg p-2 md:flex ${darkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                aria-label={desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setDesktopNavCollapsed((c) => !c)}
              >
                {desktopNavCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-lg p-2 md:hidden ${darkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={desktopNavCollapsed ? item.label : undefined}
                onClick={() => goTab(item.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                  desktopNavCollapsed ? 'md:justify-center md:px-2' : ''
                } ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    : darkMode
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} />
                <span className={`min-w-0 flex-1 text-sm font-medium ${desktopNavCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                {item.badge && !desktopNavCollapsed ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      activeTab === item.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className={`shrink-0 border-t p-4 transition-colors duration-200 ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div
              className={`flex items-center gap-3 rounded-xl p-3 transition-colors duration-200 ${darkMode ? 'bg-white/5' : 'bg-gray-50'} ${desktopNavCollapsed ? 'md:flex-col md:justify-center md:gap-2 md:p-2' : ''}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Crown size={18} className="text-white" />
              </div>
              <div className={`min-w-0 flex-1 ${desktopNavCollapsed ? 'md:hidden' : ''}`}>
                <p className={`text-sm font-semibold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Super Admin</p>
                <p className={`text-xs transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full Access</p>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`shrink-0 rounded-lg p-2 transition-colors duration-200 ${
                  darkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <button
              type="button"
              title={desktopNavCollapsed ? 'Sign out' : undefined}
              onClick={() => {
                setMobileNavOpen(false)
                logout()
                adminApi.setToken(null)
                navigate('/portal/admin-sr2025secure/sign-in')
              }}
              className={`mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-3 transition-colors duration-200 ${
                darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
              } ${desktopNavCollapsed ? 'md:justify-center md:px-2' : ''}`}
            >
              <LogOut size={18} />
              <span className={`text-sm font-medium ${desktopNavCollapsed ? 'md:hidden' : ''}`}>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="ml-0 flex min-h-screen min-w-0 flex-1 flex-col md:h-full md:overflow-hidden">
          <header
            className={`sticky top-0 z-30 shrink-0 border-b px-4 py-3 transition-colors duration-200 sm:px-6 md:px-8 md:py-4 ${
              darkMode ? 'border-white/10 bg-[#1A1A1E]' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className={`shrink-0 rounded-xl p-2.5 md:hidden ${darkMode ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100'}`}
                  aria-label="Open menu"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu size={22} />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <img
                    src="/snaproad-logo.svg"
                    alt=""
                    className="hidden h-9 w-9 shrink-0 rounded-lg border border-white/10 object-cover sm:block md:hidden"
                  />
                  <div className="min-w-0">
                    <h1 className={`text-lg font-bold capitalize transition-colors duration-200 sm:text-2xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {activeTab === 'dashboard' ? 'Dashboard Overview' : NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Dashboard'}
                    </h1>
                    <p className={`mt-0.5 text-xs transition-colors duration-200 sm:mt-1 sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isConnected ? '🟢 Connected to real-time data' : '🟡 Offline - retrying'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className={`rounded-xl border p-2 transition-colors duration-200 ${
                    darkMode
                      ? 'border-white/10 bg-white/10 text-gray-300 hover:bg-white/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Bell size={20} />
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors duration-200 sm:text-sm ${
                    darkMode ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'
                  }`}
                >
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                  {isConnected ? 'Connected' : 'Offline - retrying'}
                </button>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  )
}
