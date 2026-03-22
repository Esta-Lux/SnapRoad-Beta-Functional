// SnapRoad Admin Portal - Ryan's Emergent Improvements + Our Admin Components
// Professional architecture with modular, clean, extensible code

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, AlertTriangle, Eye, Gift, Building2, BarChart3,
  Bell, TrendingUp, DollarSign, Scale, Settings, FileText, LogOut,
  Moon, Sun, Crown, Activity, Sliders
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
import SystemMonitorTab from '@/components/admin/SystemMonitorTab'
import { AdminOfferManagement } from '@/components/admin/AdminOfferManagement'
import AppControl from '@/pages/AdminDashboard/components/AppControl'

const NAV_BASE = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badgeKey: '' },
  { id: 'appcontrol', label: 'App Control', icon: Sliders, badgeKey: '' },
  { id: 'users', label: 'Users & Families', icon: Users, badgeKey: 'total_users' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badgeKey: '' },
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
  { id: 'monitor', label: 'System Monitor', icon: Activity, badgeKey: '' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(true)
  const [navBadges, setNavBadges] = useState<Record<string, string>>({})
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const res = await adminApi.getStats()
        if (res.success && res.data) {
          setIsConnected(true)
          const s = res.data
          setNavBadges({
            total_users: (s.total_users || 0).toLocaleString(),
            total_partners: (s.total_partners || 0).toLocaleString(),
          })
        }
      } catch {
        setIsConnected(false)
      }
    }
    loadBadges()
  }, [])

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
        return <DashboardOverview theme={darkMode ? 'dark' : 'light'} />
      case 'appcontrol':
        return <AppControl />
      case 'users':
        return <UsersTab theme={darkMode ? 'dark' : 'light'} />
      case 'incidents':
        return <IncidentsTab theme={darkMode ? 'dark' : 'light'} />
      case 'moderation':
        return <AIModerationTab theme={darkMode ? 'dark' : 'light'} />
      case 'rewards':
        return <RewardsTab theme={darkMode ? 'dark' : 'light'} />
      case 'partners':
        return <PartnersTab theme={darkMode ? 'dark' : 'light'} onNavigate={(tabId) => setActiveTab(tabId)} />
      case 'offers':
        return <AdminOfferManagement onNavigate={(page) => setActiveTab(page)} theme={darkMode ? 'dark' : 'light'} />
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
      case 'monitor':
        return <SystemMonitorTab theme={darkMode ? 'dark' : 'light'} />
      default:
        return <DashboardOverview theme={darkMode ? 'dark' : 'light'} />
    }
  }

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className={`w-64 transition-colors duration-200 flex flex-col h-screen sticky top-0 ${
          darkMode 
            ? 'bg-[#0D0D10] border-r border-white/10' 
            : 'bg-white border-r border-gray-200'
        }`}>
          {/* Logo */}
          <div className={`p-6 transition-colors duration-200 border-b ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className={`font-bold transition-colors duration-200 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>SnapRoad</h1>
                <p className={`text-xs transition-colors duration-200 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Admin Console</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : darkMode 
                      ? 'text-gray-400 hover:bg-white/5 hover:text-gray-200' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === item.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* User Profile */}
          <div className={`p-4 transition-colors duration-200 border-t ${
            darkMode ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 ${
              darkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Crown size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold transition-colors duration-200 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>Super Admin</p>
                <p className={`text-xs transition-colors duration-200 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Full Access</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode 
                    ? 'hover:bg-white/10 text-gray-400' 
                    : 'hover:bg-gray-200 text-gray-500'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
            <button
              onClick={() => { logout(); adminApi.setToken(null); navigate('/auth?tab=admin'); }}
              className={`w-full mt-3 flex items-center gap-2 px-4 py-3 rounded-xl transition-colors duration-200 ${
                darkMode 
                  ? 'text-red-400 hover:bg-red-500/10' 
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-y-auto">
          {/* Header */}
          <header className={`sticky top-0 z-40 transition-colors duration-200 border-b px-8 py-4 ${
            darkMode 
              ? 'bg-[#1A1A1E] border-white/10' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold transition-colors duration-200 capitalize ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {activeTab === 'dashboard' ? 'Dashboard Overview' : 
                   NAV_ITEMS.find(item => item.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className={`text-sm transition-colors duration-200 mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {isConnected ? '🟢 Connected to real-time data' : '🟡 Offline - retrying'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className={`p-2 rounded-xl transition-colors duration-200 border ${
                  darkMode 
                    ? 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                  <Bell size={20} />
                </button>
                <button className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors duration-200 border ${
                  darkMode 
                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                    : 'border-red-200 text-red-500 hover:bg-red-50'
                }`}>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {isConnected ? 'Connected' : 'Offline - retrying'}
                </button>
              </div>
            </div>
          </header>

          {/* Tab Content */}
          <div className="p-8">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  )
}
