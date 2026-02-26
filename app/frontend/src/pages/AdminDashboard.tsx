import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Building2, Gift, Calendar, Plus, TrendingUp,
  Settings, Bell, LogOut, Search, Edit2, Trash2,
  BarChart3, Eye, Zap, Check, X, MapPin, Clock,
  AlertTriangle, Gem, ChevronRight, Download,
  Upload, FileText, Image, RefreshCw, Globe, EyeOff, CheckCircle,
  XCircle, SlidersHorizontal, Sun, Moon, MoreVertical
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
} from 'recharts'
import { NotificationCenter, notificationService } from '@/components/NotificationSystem'
import SettingsModal from '@/components/SettingsModal'
import HelpModal from '@/components/HelpModal'
import { useTheme } from '@/contexts/ThemeContext'

// Extracted Admin Components
import OnboardingWalkthrough from '@/components/admin/OnboardingWalkthrough'
import AIModerationTab from '@/components/admin/AIModerationTab'
import UsersTab from '@/components/admin/UsersTab'
import PartnersTab from '@/components/admin/PartnersTab'
import DashboardOverview from '@/components/admin/DashboardOverview'
import IncidentsTab from '@/components/admin/IncidentsTab'
import RewardsTab from '@/components/admin/RewardsTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import ReferralAnalyticsTab from '@/components/admin/ReferralAnalyticsTab'
import FinanceTab from '@/components/admin/FinanceTab'
import SettingsTab from '@/components/admin/SettingsTab'
import NotificationsTab from '@/components/admin/NotificationsTab'
import LegalTab from '@/components/admin/LegalTab'
import AuditLogTab from '@/components/admin/AuditLogTab'

// Types
import { Event, User, Partner } from '@/types/admin'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'incidents' | 'aiModeration' | 'rewards' | 'partners' | 'referrals' | 'notifications' | 'analytics' | 'finance' | 'legal' | 'settings' | 'audit'>('overview')
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
      { id: '1', business_name: 'Shell Gas Station', email: 'shell@partner.com', business_type: 'fuel', status: 'active', created_at: '2024-01-01' },
    ])
    setEvents([
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
      
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">SnapRoad Admin</h1>
                <p className="text-slate-400 text-xs">Super Admin</p>
              </div>
              <button onClick={toggleTheme} className="ml-auto text-slate-400 hover:text-white">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {[
                { id: 'overview', icon: BarChart3, label: 'Dashboard' },
                { id: 'users', icon: Users, label: 'Users & Families', badge: stats.total_users.toString() },
                { id: 'incidents', icon: AlertTriangle, label: 'Incidents' },
                { id: 'aiModeration', icon: Eye, label: 'AI Moderation Queue', badge: '9' },
                { id: 'rewards', icon: Gem, label: 'Rewards & Vouchers' },
                { id: 'partners', icon: Building2, label: 'Partners & Campaigns', badge: stats.total_partners.toString() },
                { id: 'referrals', icon: TrendingUp, label: 'Partner Referral Analytics' },
                { id: 'notifications', icon: Bell, label: 'Notifications' },
                { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                { id: 'finance', icon: TrendingUp, label: 'Finance' },
                { id: 'legal', icon: FileText, label: 'Legal & Compliance' },
                { id: 'settings', icon: Settings, label: 'Settings' },
                { id: 'audit', icon: FileText, label: 'Audit Log' },
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} data-testid={`nav-${item.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    activeTab === item.id ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <item.icon size={18} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">{item.badge}</span>}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5">
                <LogOut size={18} />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'users' && 'User & Family Management'}
                {activeTab === 'incidents' && 'Incident Reports'}
                {activeTab === 'aiModeration' && 'AI Moderation Queue'}
                {activeTab === 'rewards' && 'Rewards & Vouchers'}
                {activeTab === 'partners' && 'Partner Management'}
                {activeTab === 'referrals' && 'Partner Referral Analytics'}
                {activeTab === 'notifications' && 'Notification Center'}
                {activeTab === 'analytics' && 'Platform Analytics'}
                {activeTab === 'finance' && 'Finance & Revenue'}
                {activeTab === 'legal' && 'Legal & Compliance'}
                {activeTab === 'settings' && 'Settings & Configuration'}
                {activeTab === 'audit' && 'Audit Log'}
              </h1>
              <p className="text-slate-400">Full control over the SnapRoad platform</p>
            </div>

            {/* Tab Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Dashboard Overview */}
                {activeTab === 'overview' && <DashboardOverview theme={theme} />}

                {/* Users & Families */}
                {activeTab === 'users' && <UsersTab theme={theme} />}

                {/* Incidents */}
                {activeTab === 'incidents' && <IncidentsTab theme={theme} />}

                {/* AI Moderation Queue */}
                {activeTab === 'aiModeration' && <AIModerationTab theme={theme} />}

                {/* Rewards & Vouchers */}
                {activeTab === 'rewards' && <RewardsTab theme={theme} />}

                {/* Partners & Campaigns */}
                {activeTab === 'partners' && <PartnersTab theme={theme} />}

                {/* Platform Analytics */}
                {activeTab === 'analytics' && <AnalyticsTab theme={theme} />}

                {/* Partner Referral Analytics */}
                {activeTab === 'referrals' && <ReferralAnalyticsTab theme={theme} />}

                {/* Notification Center */}
                {activeTab === 'notifications' && <NotificationsTab theme={theme} />}

                {/* Finance & Revenue */}
                {activeTab === 'finance' && <FinanceTab theme={theme} />}

                {/* Legal & Compliance */}
                {activeTab === 'legal' && <LegalTab theme={theme} />}

                {/* Settings & Configuration */}
                {activeTab === 'settings' && <SettingsTab theme={theme} />}

                {/* Audit Log */}
                {activeTab === 'audit' && <AuditLogTab theme={theme} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
