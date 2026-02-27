<<<<<<< HEAD
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
=======
// SnapRoad Admin Portal - Redesigned per Figma Design System
// Dark theme with modern UI components matching the design specifications

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, AlertTriangle, Eye, Gift, Building2, BarChart3,
  Bell, TrendingUp, DollarSign, Scale, Settings, FileText, LogOut,
  Search, Filter, Plus, Check, X, MapPin, Clock, Zap, Moon, Sun,
  ChevronRight, Download, Upload, RefreshCw, MoreVertical, Edit2, Trash2,
  CheckCircle, XCircle, EyeOff, Crown, HelpCircle, SlidersHorizontal,
  Activity, Gem, Car, Trophy, Star, Calendar, Shield, Image, Sparkles,
  ChevronLeft, ArrowRight
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

// Types
interface User {
  id: string
  name: string
  email: string
  plan: 'basic' | 'premium'
  safety_score: number
  gems: number
  level: number
  status: 'active' | 'suspended'
  family_members?: number
  joined_date?: string
}

interface Partner {
  id: string
  business_name: string
  email: string
  offers_count: number
  total_redemptions: number
  status: 'active' | 'pending' | 'suspended'
  revenue?: number
}

interface Incident {
  id: number
  type: string
  location: string
  timestamp: string
  confidence: number
  status: 'new' | 'blurred' | 'review' | 'approved' | 'rejected'
  blurred: boolean
  image?: string
}

interface Transaction {
  id: string
  date: string
  type: 'subscription' | 'partner_fee' | 'refund' | 'payout'
  amount: number
  description: string
  status: 'completed' | 'pending' | 'failed'
}

// Navigation items based on Figma design
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users & Families', icon: Users, badge: '12,450' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'moderation', label: 'AI Moderation Queue', icon: Eye, badge: '9' },
  { id: 'rewards', label: 'Rewards & Vouchers', icon: Gift },
  { id: 'partners', label: 'Partners & Campaigns', icon: Building2, badge: '156' },
  { id: 'referrals', label: 'Partner Referral Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'legal', label: 'Legal & Compliance', icon: Scale },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'audit', label: 'Audit Log', icon: FileText },
]

// Mock data
const MOCK_INCIDENTS: Incident[] = [
  { id: 1, type: 'Speeding (85mph in 65)', location: 'I-70 E, Columbus OH', timestamp: '2 min ago', confidence: 94, status: 'new', blurred: false },
  { id: 2, type: 'Hard Braking Event', location: 'High St & Broad, Columbus', timestamp: '8 min ago', confidence: 88, status: 'new', blurred: true },
  { id: 3, type: 'Phone Usage Detected', location: '5th Ave, Columbus OH', timestamp: '22 min ago', confidence: 91, status: 'new', blurred: false },
  { id: 4, type: 'Speed Camera', location: 'SR-315, Columbus OH', timestamp: '35 min ago', confidence: 98, status: 'blurred', blurred: true },
  { id: 5, type: 'Aggressive Lane Change', location: 'I-71 N, Columbus OH', timestamp: '1 hr ago', confidence: 76, status: 'review', blurred: false },
]

const MOCK_CHART_DATA = [
  { name: 'Mon', users: 120, revenue: 2400, incidents: 4 },
  { name: 'Tue', users: 180, revenue: 3200, incidents: 6 },
  { name: 'Wed', users: 150, revenue: 2800, incidents: 3 },
  { name: 'Thu', users: 200, revenue: 3600, incidents: 8 },
  { name: 'Fri', users: 220, revenue: 4100, incidents: 5 },
  { name: 'Sat', users: 280, revenue: 4800, incidents: 2 },
  { name: 'Sun', users: 190, revenue: 3400, incidents: 4 },
]

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2025-12-20', type: 'subscription', amount: 10.99, description: 'Premium subscription - John D.', status: 'completed' },
  { id: '2', date: '2025-12-20', type: 'partner_fee', amount: 250.00, description: 'Partner fee - Starbucks Downtown', status: 'completed' },
  { id: '3', date: '2025-12-19', type: 'refund', amount: -10.99, description: 'Refund - Sarah M.', status: 'completed' },
  { id: '4', date: '2025-12-19', type: 'payout', amount: -1500.00, description: 'Partner payout - Shell Gas', status: 'pending' },
]

// Sidebar Component
function Sidebar({ activeTab, setActiveTab, darkMode, toggleDarkMode }: {
  activeTab: string
  setActiveTab: (tab: string) => void
  darkMode: boolean
  toggleDarkMode: () => void
}) {
  const navigate = useNavigate()

  return (
    <aside className="w-64 bg-white dark:bg-[#0D0D10] border-r border-gray-200 dark:border-white/10 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">SnapRoad</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin Console</p>
>>>>>>> dbb8eaabacc7393ccaa9bb100ac90bde47b9aacc
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
=======
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            data-testid={`nav-${item.id}`}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
              activeTab === item.id
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
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
      <div className="p-4 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Crown size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Super Admin</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Full Access</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

// Header Component
function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/20">
          <Bell size={20} />
        </button>
        <button className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 text-sm font-medium flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Offline - retrying
        </button>
      </div>
    </header>
  )
}

// Dashboard Tab with Live API Data
function DashboardTab() {
  const [stats, setStats] = useState([
    { label: 'Total Users', value: '12,450', change: '+12%', icon: Users, color: 'blue' },
    { label: 'Active Partners', value: '156', change: '+5%', icon: Building2, color: 'emerald' },
    { label: 'Revenue (MTD)', value: '$45,230', change: '+18%', icon: DollarSign, color: 'purple' },
    { label: 'Incidents Today', value: '23', change: '-8%', icon: AlertTriangle, color: 'amber' },
  ])
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([
    { action: 'New user registered', user: 'john@email.com', time: '2 min ago', icon: Users, color: 'blue' },
    { action: 'Partner offer created', user: 'Starbucks Downtown', time: '15 min ago', icon: Gift, color: 'emerald' },
    { action: 'Incident flagged', user: 'Speeding - I-70 E', time: '22 min ago', icon: AlertTriangle, color: 'amber' },
    { action: 'Payment received', user: '$10.99 - Premium subscription', time: '45 min ago', icon: DollarSign, color: 'purple' },
  ])

  // Fetch live stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch admin stats
        const statsRes = await fetch(`${API_URL}/api/admin/stats`)
        if (statsRes.ok) {
          const data = await statsRes.json()
          if (data.success && data.data) {
            setStats([
              { label: 'Total Users', value: (data.data.total_users || 12450).toLocaleString(), change: '+12%', icon: Users, color: 'blue' },
              { label: 'Active Partners', value: (data.data.total_partners || 156).toString(), change: '+5%', icon: Building2, color: 'emerald' },
              { label: 'Revenue (MTD)', value: `$${((data.data.revenue || 45230) / 100).toLocaleString()}`, change: '+18%', icon: DollarSign, color: 'purple' },
              { label: 'Incidents Today', value: (data.data.incidents_today || 23).toString(), change: '-8%', icon: AlertTriangle, color: 'amber' },
            ])
          }
        }

        // Fetch recent activity
        const analyticsRes = await fetch(`${API_URL}/api/admin/analytics`)
        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          if (data.success && data.data?.recent_activity) {
            // Map API data to activity format
          }
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon size={20} className={`text-${stat.color}-500`} />
              </div>
              <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={MOCK_CHART_DATA}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="users" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'New user registered', user: 'john@email.com', time: '2 min ago', icon: Users, color: 'blue' },
            { action: 'Partner offer created', user: 'Starbucks Downtown', time: '15 min ago', icon: Gift, color: 'emerald' },
            { action: 'Incident flagged', user: 'Speeding - I-70 E', time: '22 min ago', icon: AlertTriangle, color: 'amber' },
            { action: 'Payment received', user: '$10.99 - Premium subscription', time: '45 min ago', icon: DollarSign, color: 'purple' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
              <div className={`w-10 h-10 rounded-xl bg-${item.color}-100 dark:bg-${item.color}-500/20 flex items-center justify-center`}>
                <item.icon size={18} className={`text-${item.color}-500`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.action}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.user}</p>
              </div>
              <span className="text-xs text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
>>>>>>> dbb8eaabacc7393ccaa9bb100ac90bde47b9aacc
      </div>
    </div>
  )
}
<<<<<<< HEAD
=======

// Users Tab with Live API Data
function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'John Doe', email: 'john@email.com', plan: 'premium', safety_score: 92, gems: 1500, level: 8, status: 'active', family_members: 3 },
    { id: '2', name: 'Sarah Miller', email: 'sarah@email.com', plan: 'basic', safety_score: 88, gems: 850, level: 5, status: 'active', family_members: 2 },
    { id: '3', name: 'Mike Johnson', email: 'mike@email.com', plan: 'premium', safety_score: 95, gems: 2200, level: 12, status: 'active', family_members: 4 },
    { id: '4', name: 'Emily Davis', email: 'emily@email.com', plan: 'basic', safety_score: 78, gems: 450, level: 3, status: 'suspended', family_members: 1 },
  ])
  const [loading, setLoading] = useState(true)

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/users`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && Array.isArray(data.data)) {
            const apiUsers = data.data.map((u: any) => ({
              id: u.id || u._id,
              name: u.name || 'Unknown',
              email: u.email,
              plan: u.plan || 'basic',
              safety_score: u.safety_score || 85,
              gems: u.gems || 0,
              level: u.level || 1,
              status: u.status || 'active',
              family_members: u.family_members || 1
            }))
            if (apiUsers.length > 0) {
              setUsers(apiUsers)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [users, searchQuery])

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <button className="px-4 py-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Filter size={18} />
          Filters
        </button>
        <button className="px-4 py-3 rounded-xl bg-blue-500 text-white flex items-center gap-2 hover:bg-blue-600">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Plan</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Safety Score</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Gems</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Family</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.plan === 'premium' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                  }`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${user.safety_score >= 90 ? 'bg-emerald-500' : user.safety_score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${user.safety_score}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.safety_score}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-900 dark:text-white font-medium">{user.gems.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-600 dark:text-gray-400">{user.family_members} members</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// AI Moderation Tab with WebSocket Support
function AIModerationTab() {
  const [activeFilter, setActiveFilter] = useState<string>('new')
  const [confidenceThreshold, setConfidenceThreshold] = useState(86)
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS)
  const [wsConnected, setWsConnected] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // WebSocket connection for real-time incidents
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout
    
    const connectWebSocket = () => {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://')
      ws = new WebSocket(`${wsUrl}/api/ws/admin/moderation`)
      
      ws.onopen = () => {
        console.log('WebSocket connected for AI moderation')
        setWsConnected(true)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_incident') {
            // Add new incident to the top of the list
            const newIncident: Incident = {
              id: Date.now(),
              type: data.incident.type || 'AI Detected Event',
              location: data.incident.location || 'Unknown Location',
              timestamp: 'Just now',
              confidence: data.incident.confidence || 85,
              status: 'new',
              blurred: data.incident.blurred || false,
              image: data.incident.image
            }
            setIncidents(prev => [newIncident, ...prev])
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...')
        setWsConnected(false)
        reconnectTimeout = setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsConnected(false)
      }
    }
    
    connectWebSocket()
    
    return () => {
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  // Fetch incidents from API on load
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/reports`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && Array.isArray(data.data)) {
            const apiIncidents = data.data.slice(0, 10).map((report: any, index: number) => ({
              id: report.id || index + 100,
              type: report.title || report.type || 'Road Report',
              location: report.location || 'Columbus, OH',
              timestamp: report.created_at ? new Date(report.created_at).toLocaleString() : '1 hr ago',
              confidence: report.confidence || Math.floor(Math.random() * 20) + 75,
              status: report.status || 'new',
              blurred: report.blurred || false
            }))
            if (apiIncidents.length > 0) {
              setIncidents(prev => [...apiIncidents, ...prev.slice(0, 5)])
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error)
      }
    }
    fetchIncidents()
  }, [])

  const statusCounts = useMemo(() => ({
    new: incidents.filter(i => i.status === 'new').length,
    blurred: incidents.filter(i => i.blurred).length,
    review: incidents.filter(i => i.status === 'review').length,
    approved: incidents.filter(i => i.status === 'approved').length,
    rejected: incidents.filter(i => i.status === 'rejected').length,
  }), [incidents])

  const filteredIncidents = useMemo(() => {
    let filtered = incidents
    if (activeFilter === 'blurred') {
      filtered = incidents.filter(i => i.blurred)
    } else {
      filtered = incidents.filter(i => i.status === activeFilter)
    }
    return filtered.filter(i => i.confidence >= confidenceThreshold)
  }, [incidents, activeFilter, confidenceThreshold])

  const handleModeration = async (id: number, outcome: 'approved' | 'rejected') => {
    setIncidents(prev => prev.map(incident => 
      incident.id === id ? { ...incident, status: outcome, blurred: outcome === 'approved' ? false : incident.blurred } : incident
    ))
    // Optionally send to backend
    try {
      await fetch(`${API_URL}/api/admin/incidents/${id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      })
    } catch (e) {
      console.log('Moderation saved locally')
    }
  }

  const generateTestIncident = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/moderation/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.incident) {
          setIncidents(prev => [{
            id: Date.now(),
            type: data.incident.type || 'Test Incident',
            location: data.incident.location || 'Test Location',
            timestamp: 'Just now',
            confidence: data.incident.confidence || 90,
            status: 'new',
            blurred: false
          }, ...prev])
        }
      } else {
        // Fallback: add mock incident
        const types = ['Speeding Detected', 'Hard Braking', 'Phone Usage', 'Lane Departure', 'Tailgating']
        const locations = ['I-70 E, Columbus OH', 'High St, Columbus', 'SR-315 N', 'I-71 S, Cleveland', 'US-23, Delaware']
        setIncidents(prev => [{
          id: Date.now(),
          type: types[Math.floor(Math.random() * types.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          timestamp: 'Just now',
          confidence: Math.floor(Math.random() * 20) + 80,
          status: 'new',
          blurred: Math.random() > 0.5
        }, ...prev])
      }
    } catch (e) {
      // Fallback: add mock incident locally
      const types = ['Speeding Detected', 'Hard Braking', 'Phone Usage', 'Lane Departure', 'Tailgating']
      const locations = ['I-70 E, Columbus OH', 'High St, Columbus', 'SR-315 N', 'I-71 S, Cleveland', 'US-23, Delaware']
      setIncidents(prev => [{
        id: Date.now(),
        type: types[Math.floor(Math.random() * types.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        timestamp: 'Just now',
        confidence: Math.floor(Math.random() * 20) + 80,
        status: 'new',
        blurred: Math.random() > 0.5
      }, ...prev])
    }
    setIsGenerating(false)
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {wsConnected ? 'Live - Real-time updates enabled' : 'Connecting to live feed...'}
          </span>
        </div>
        <button 
          onClick={generateTestIncident}
          disabled={isGenerating}
          className="px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
        >
          <Zap size={18} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? 'Generating...' : 'Generate Test Incident'}
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { key: 'new', label: 'New', count: statusCounts.new, color: 'purple' },
          { key: 'blurred', label: 'Blurred', count: statusCounts.blurred, color: 'orange' },
          { key: 'review', label: 'Review', count: statusCounts.review, color: 'blue' },
          { key: 'approved', label: 'Approved', count: statusCounts.approved, color: 'emerald' },
          { key: 'rejected', label: 'Rejected', count: statusCounts.rejected, color: 'red' },
        ].map((status) => (
          <button
            key={status.key}
            onClick={() => setActiveFilter(status.key)}
            className={`p-4 rounded-2xl text-left transition-all ${
              activeFilter === status.key
                ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-purple-500'
                : 'bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
            }`}
          >
            <p className={`text-3xl font-bold ${
              status.color === 'purple' ? 'text-purple-500' :
              status.color === 'orange' ? 'text-orange-500' :
              status.color === 'blue' ? 'text-blue-500' :
              status.color === 'emerald' ? 'text-emerald-500' : 'text-red-500'
            }`}>{status.count}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{status.label}</p>
          </button>
        ))}
      </div>

      {/* Confidence Threshold */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <SlidersHorizontal size={18} />
            <span className="font-medium">Confidence Threshold</span>
          </div>
          <span className="text-blue-500 font-semibold">{confidenceThreshold}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          style={{
            background: `linear-gradient(to right, #3B82F6 ${confidenceThreshold}%, #E5E7EB ${confidenceThreshold}%)`
          }}
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Showing incidents above {confidenceThreshold}% confidence
        </p>
      </div>

      {/* Incidents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIncidents.map((incident) => {
          const canModerate = incident.status === 'new' || incident.status === 'review'
          
          return (
            <div key={incident.id} className="bg-white dark:bg-[#1A1A1E] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
              {/* Image Preview */}
              <div className="relative h-44 bg-gray-100 dark:bg-white/5">
                <img 
                  src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400" 
                  alt="Incident preview"
                  className="w-full h-full object-cover"
                />
                {incident.blurred && (
                  <div className="absolute inset-0 backdrop-blur-xl bg-black/30 flex items-center justify-center">
                    <EyeOff size={32} className="text-white" />
                  </div>
                )}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                  {incident.confidence}%
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900 dark:text-white">{incident.type}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    incident.status === 'new' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                    incident.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    incident.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {incident.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {incident.timestamp}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModeration(incident.id, 'approved')}
                    disabled={!canModerate}
                    className={`flex-1 h-11 rounded-xl bg-[#00FFD7] text-gray-900 font-medium flex items-center justify-center gap-2 transition-opacity ${
                      canModerate ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleModeration(incident.id, 'rejected')}
                    disabled={!canModerate}
                    className={`flex-1 h-11 rounded-xl bg-[#FF5A5A] text-white font-medium flex items-center justify-center gap-2 transition-opacity ${
                      canModerate ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredIncidents.length === 0 && (
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-12 border border-gray-200 dark:border-white/10 text-center">
          <Eye size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No incidents to review</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Try lowering the confidence threshold or switch queues.</p>
        </div>
      )}
    </div>
  )
}

// Finance Tab
function FinanceTab() {
  const stats = [
    { label: 'Total Revenue', value: '$128,450', change: '+22%', icon: DollarSign },
    { label: 'Subscriptions', value: '$45,230', change: '+18%', icon: Users },
    { label: 'Partner Fees', value: '$78,200', change: '+26%', icon: Building2 },
    { label: 'Pending Payouts', value: '$5,020', change: '-12%', icon: Clock },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <stat.icon size={20} className="text-purple-500" />
              </div>
              <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={MOCK_CHART_DATA}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <button className="text-blue-500 text-sm font-medium hover:text-blue-600">View All</button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {MOCK_TRANSACTIONS.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tx.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tx.type === 'subscription' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                    tx.type === 'partner_fee' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                    tx.type === 'refund' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {tx.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{tx.description}</td>
                <td className={`px-6 py-4 text-sm font-medium ${tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tx.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    tx.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Partners Tab
function PartnersTab() {
  const [partners] = useState<Partner[]>([
    { id: '1', business_name: 'Starbucks Downtown', email: 'contact@starbucks.com', offers_count: 5, total_redemptions: 234, status: 'active', revenue: 4500 },
    { id: '2', business_name: 'Shell Gas Station', email: 'shell@partner.com', offers_count: 3, total_redemptions: 567, status: 'active', revenue: 8200 },
    { id: '3', business_name: 'Quick Stop Cafe', email: 'cafe@quickstop.com', offers_count: 2, total_redemptions: 89, status: 'pending', revenue: 1200 },
    { id: '4', business_name: 'Car Wash Pro', email: 'pro@carwash.com', offers_count: 4, total_redemptions: 156, status: 'active', revenue: 2800 },
  ])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Partners', value: '156', icon: Building2, color: 'blue' },
          { label: 'Active Campaigns', value: '48', icon: Zap, color: 'emerald' },
          { label: 'Total Redemptions', value: '12,450', icon: Gift, color: 'purple' },
          { label: 'Revenue Generated', value: '$78,200', icon: DollarSign, color: 'amber' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={`text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Partners Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">All Partners</h3>
          <button className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-600">
            <Plus size={18} />
            Add Partner
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Partner</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Offers</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Redemptions</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                      {partner.business_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{partner.business_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{partner.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{partner.offers_count}</td>
                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{partner.total_redemptions.toLocaleString()}</td>
                <td className="px-6 py-4 text-emerald-500 font-medium">${partner.revenue?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    partner.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    partner.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {partner.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Incidents Tab
function IncidentsTab() {
  const incidents = [
    { id: 1, type: 'Speeding', user: 'John Doe', location: 'I-70 E, Columbus', speed: '85 mph', limit: '65 mph', time: '2 hours ago', severity: 'high' },
    { id: 2, type: 'Hard Braking', user: 'Sarah Miller', location: 'High St & Broad', speed: 'N/A', limit: 'N/A', time: '4 hours ago', severity: 'medium' },
    { id: 3, type: 'Phone Usage', user: 'Mike Johnson', location: '5th Ave', speed: '45 mph', limit: '35 mph', time: '6 hours ago', severity: 'high' },
    { id: 4, type: 'Swerving', user: 'Emily Davis', location: 'SR-315', speed: '70 mph', limit: '65 mph', time: '8 hours ago', severity: 'low' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', value: '23', color: 'blue' },
          { label: 'High Severity', value: '5', color: 'red' },
          { label: 'Under Review', value: '8', color: 'amber' },
          { label: 'Resolved', value: '10', color: 'emerald' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <p className={`text-3xl font-bold text-${stat.color}-500`}>{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Incidents List */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Incidents</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {incidents.map((incident) => (
            <div key={incident.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                incident.severity === 'high' ? 'bg-red-100 dark:bg-red-500/20' :
                incident.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20' :
                'bg-blue-100 dark:bg-blue-500/20'
              }`}>
                <AlertTriangle size={24} className={`${
                  incident.severity === 'high' ? 'text-red-500' :
                  incident.severity === 'medium' ? 'text-amber-500' :
                  'text-blue-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">{incident.type}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    incident.severity === 'high' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                    incident.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  }`}>
                    {incident.severity}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Users size={14} />{incident.user}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} />{incident.location}</span>
                  <span className="flex items-center gap-1"><Clock size={14} />{incident.time}</span>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Analytics Tab
function AnalyticsTab() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Miles', value: '1.2M', change: '+15%', icon: Car },
          { label: 'Avg Safety Score', value: '87', change: '+3%', icon: Shield },
          { label: 'Active Sessions', value: '2,340', change: '+8%', icon: Activity },
          { label: 'Gems Distributed', value: '450K', change: '+22%', icon: Gem },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <stat.icon size={20} className="text-purple-500" />
              </div>
              <span className="text-xs font-medium text-emerald-500">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Active Users</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={MOCK_CHART_DATA}>
              <defs>
                <linearGradient id="colorUsers2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="users" stroke="#10B981" fillOpacity={1} fill="url(#colorUsers2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Incidents by Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="incidents" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Engagement</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Offers Viewed', value: '45,230', percent: 78 },
            { label: 'Offers Redeemed', value: '12,450', percent: 27 },
            { label: 'Challenges Completed', value: '8,920', percent: 65 },
            { label: 'Badges Earned', value: '23,100', percent: 82 },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.value}</p>
              <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Rewards Tab
function RewardsTab() {
  const rewards = [
    { id: 1, name: '10% Off Coffee', partner: 'Starbucks', gems: 50, redemptions: 234, status: 'active' },
    { id: 2, name: 'Free Car Wash', partner: 'Clean Auto', gems: 150, redemptions: 89, status: 'active' },
    { id: 3, name: '$5 Gas Discount', partner: 'Shell', gems: 100, redemptions: 567, status: 'active' },
    { id: 4, name: 'Premium Badge', partner: 'SnapRoad', gems: 500, redemptions: 45, status: 'limited' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Rewards', value: '48', icon: Gift, color: 'purple' },
          { label: 'Total Redemptions', value: '12,450', icon: CheckCircle, color: 'emerald' },
          { label: 'Gems in Circulation', value: '2.4M', icon: Gem, color: 'blue' },
          { label: 'Vouchers Issued', value: '1,230', icon: FileText, color: 'amber' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={`text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Rewards Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">All Rewards & Vouchers</h3>
          <button className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium flex items-center gap-2 hover:bg-purple-600">
            <Plus size={18} />
            Create Reward
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reward</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Partner</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Gem Cost</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Redemptions</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {rewards.map((reward) => (
              <tr key={reward.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Gift size={18} className="text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{reward.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{reward.partner}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 text-blue-500 font-medium">
                    <Gem size={16} />
                    {reward.gems}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{reward.redemptions}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    reward.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {reward.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Settings Tab
function SettingsTab() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    autoApprove: false,
    confidenceThreshold: 85,
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* General Settings */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-white/10">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts for new incidents and reports</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, notifications: !s.notifications }))}
              className={`w-12 h-6 rounded-full transition-colors ${settings.notifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-white/10">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Auto-Approve Low Risk</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically approve incidents below threshold</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, autoApprove: !s.autoApprove }))}
              className={`w-12 h-6 rounded-full transition-colors ${settings.autoApprove ? 'bg-blue-500' : 'bg-gray-300 dark:bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.autoApprove ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900 dark:text-white">Default Confidence Threshold</p>
              <span className="text-blue-500 font-medium">{settings.confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.confidenceThreshold}
              onChange={(e) => setSettings(s => ({ ...s, confidenceThreshold: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Email</label>
            <input
              type="email"
              defaultValue="admin@snaproad.com"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Change Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
            />
          </div>
          <button className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Partner Referral Analytics Tab
function ReferralsTab() {
  const referralData = [
    { month: 'Jan', referrals: 12, signups: 8, revenue: 2400 },
    { month: 'Feb', referrals: 18, signups: 14, revenue: 4200 },
    { month: 'Mar', referrals: 24, signups: 20, revenue: 6000 },
    { month: 'Apr', referrals: 32, signups: 28, revenue: 8400 },
    { month: 'May', referrals: 28, signups: 22, revenue: 6600 },
    { month: 'Jun', referrals: 45, signups: 38, revenue: 11400 },
  ]

  const topReferrers = [
    { id: 1, partner: 'Starbucks Downtown', referrals: 45, signups: 38, conversionRate: 84, earned: '$1,140' },
    { id: 2, partner: 'Shell Gas Station', referrals: 32, signups: 28, conversionRate: 87, earned: '$840' },
    { id: 3, partner: 'Quick Stop Cafe', referrals: 24, signups: 18, conversionRate: 75, earned: '$540' },
    { id: 4, partner: 'Car Wash Pro', referrals: 18, signups: 15, conversionRate: 83, earned: '$450' },
    { id: 5, partner: 'Pizza Palace', referrals: 12, signups: 8, conversionRate: 67, earned: '$240' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: '1,234', change: '+18%', icon: Users },
          { label: 'Successful Signups', value: '987', change: '+22%', icon: CheckCircle },
          { label: 'Conversion Rate', value: '80%', change: '+5%', icon: TrendingUp },
          { label: 'Revenue Generated', value: '$29,610', change: '+28%', icon: DollarSign },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <stat.icon size={20} className="text-blue-500" />
              </div>
              <span className="text-xs font-medium text-emerald-500">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Referral Trend Chart */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Referral Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={referralData}>
            <defs>
              <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Area type="monotone" dataKey="referrals" stroke="#3B82F6" fillOpacity={1} fill="url(#colorReferrals)" strokeWidth={2} />
            <Area type="monotone" dataKey="signups" stroke="#10B981" fillOpacity={1} fill="url(#colorSignups)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Referrals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Signups</span>
          </div>
        </div>
      </div>

      {/* Top Referrers Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white">Top Referrers</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rank</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Partner</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Referrals</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Signups</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Conversion</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {topReferrers.map((referrer, index) => (
              <tr key={referrer.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' :
                    index === 1 ? 'bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-gray-300' :
                    index === 2 ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600' :
                    'bg-gray-100 dark:bg-white/10 text-gray-500'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{referrer.partner}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{referrer.referrals}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{referrer.signups}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${referrer.conversionRate >= 80 ? 'bg-emerald-500' : referrer.conversionRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${referrer.conversionRate}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{referrer.conversionRate}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-emerald-500 font-medium">{referrer.earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Notifications Tab
function NotificationsTab() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'incident', title: 'New High-Severity Incident', message: 'Speeding detected on I-70 E', time: '2 min ago', read: false },
    { id: 2, type: 'partner', title: 'Partner Application', message: 'Quick Stop Cafe applied to become a partner', time: '15 min ago', read: false },
    { id: 3, type: 'payment', title: 'Payment Received', message: 'Premium subscription - $10.99 from John D.', time: '1 hr ago', read: true },
    { id: 4, type: 'system', title: 'System Update', message: 'AI moderation model updated to v2.3', time: '3 hrs ago', read: true },
    { id: 5, type: 'user', title: 'User Milestone', message: 'Sarah M. reached Level 10!', time: '5 hrs ago', read: true },
  ])

  const [templates] = useState([
    { id: 1, name: 'Welcome Message', type: 'onboarding', active: true },
    { id: 2, name: 'Safety Score Alert', type: 'safety', active: true },
    { id: 3, name: 'Weekly Recap', type: 'engagement', active: true },
    { id: 4, name: 'Offer Expiring', type: 'rewards', active: false },
    { id: 5, name: 'Challenge Reminder', type: 'gamification', active: true },
  ])

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident': return AlertTriangle
      case 'partner': return Building2
      case 'payment': return DollarSign
      case 'system': return Settings
      case 'user': return Users
      default: return Bell
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'incident': return 'red'
      case 'partner': return 'blue'
      case 'payment': return 'emerald'
      case 'system': return 'purple'
      case 'user': return 'amber'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Unread', value: notifications.filter(n => !n.read).length.toString(), color: 'red' },
          { label: 'Today', value: '12', color: 'blue' },
          { label: 'This Week', value: '67', color: 'purple' },
          { label: 'Active Templates', value: templates.filter(t => t.active).length.toString(), color: 'emerald' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <p className={`text-3xl font-bold text-${stat.color}-500`}>{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Notifications</h3>
            <button onClick={markAllAsRead} className="text-blue-500 text-sm font-medium hover:text-blue-600">
              Mark all as read
            </button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10 max-h-96 overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type)
              const color = getColor(notification.type)
              return (
                <div 
                  key={notification.id} 
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-start gap-4 ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={`text-${color}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                      {!notification.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notification Templates */}
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notification Templates</h3>
            <button className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-blue-600">
              <Plus size={16} />
              New Template
            </button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {templates.map((template) => (
              <div key={template.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{template.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.active ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                  }`}>
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Legal & Compliance Tab
function LegalTab() {
  const documents = [
    { id: 1, name: 'Terms of Service', version: 'v3.2', lastUpdated: '2025-11-15', status: 'active' },
    { id: 2, name: 'Privacy Policy', version: 'v2.8', lastUpdated: '2025-12-01', status: 'active' },
    { id: 3, name: 'Driver Agreement', version: 'v1.5', lastUpdated: '2025-10-20', status: 'active' },
    { id: 4, name: 'Partner Terms', version: 'v2.1', lastUpdated: '2025-09-15', status: 'active' },
    { id: 5, name: 'Cookie Policy', version: 'v1.3', lastUpdated: '2025-08-01', status: 'review' },
    { id: 6, name: 'GDPR Compliance', version: 'v1.0', lastUpdated: '2025-07-15', status: 'active' },
  ]

  const complianceChecks = [
    { name: 'GDPR Data Access Requests', status: 'compliant', lastCheck: '2 days ago', issues: 0 },
    { name: 'CCPA Opt-Out Handling', status: 'compliant', lastCheck: '1 day ago', issues: 0 },
    { name: 'Data Retention Policy', status: 'warning', lastCheck: '5 days ago', issues: 2 },
    { name: 'User Consent Records', status: 'compliant', lastCheck: '1 day ago', issues: 0 },
    { name: 'Security Audit', status: 'compliant', lastCheck: '1 week ago', issues: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Documents', value: documents.filter(d => d.status === 'active').length.toString(), icon: FileText, color: 'blue' },
          { label: 'Pending Review', value: documents.filter(d => d.status === 'review').length.toString(), icon: Clock, color: 'amber' },
          { label: 'Compliance Score', value: '98%', icon: Shield, color: 'emerald' },
          { label: 'Open Issues', value: '2', icon: AlertTriangle, color: 'red' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={`text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Legal Documents */}
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Legal Documents</h3>
            <button className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-blue-600">
              <Plus size={16} />
              New Document
            </button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{doc.version} · Updated {doc.lastUpdated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {doc.status}
                  </span>
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Checks */}
        <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Compliance Checks</h3>
            <button className="text-blue-500 text-sm font-medium hover:text-blue-600">
              Run Full Audit
            </button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {complianceChecks.map((check, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    check.status === 'compliant' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                    'bg-amber-100 dark:bg-amber-500/20'
                  }`}>
                    {check.status === 'compliant' ? (
                      <CheckCircle size={18} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{check.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last check: {check.lastCheck}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    check.status === 'compliant' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {check.status === 'compliant' ? 'Compliant' : `${check.issues} Issues`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Audit Log Tab
function AuditLogTab() {
  const [logs] = useState([
    { id: 1, action: 'User Suspended', user: 'admin@snaproad.com', target: 'emily@email.com', timestamp: '2025-12-20 14:32:15', ip: '192.168.1.1', status: 'success' },
    { id: 2, action: 'Offer Created', user: 'admin@snaproad.com', target: 'Shell Gas - $5 Discount', timestamp: '2025-12-20 13:15:42', ip: '192.168.1.1', status: 'success' },
    { id: 3, action: 'Partner Approved', user: 'admin@snaproad.com', target: 'Quick Stop Cafe', timestamp: '2025-12-20 11:08:33', ip: '192.168.1.1', status: 'success' },
    { id: 4, action: 'Settings Updated', user: 'admin@snaproad.com', target: 'AI Confidence Threshold', timestamp: '2025-12-20 10:45:21', ip: '192.168.1.1', status: 'success' },
    { id: 5, action: 'Export Generated', user: 'admin@snaproad.com', target: 'Users CSV Export', timestamp: '2025-12-19 16:22:18', ip: '192.168.1.1', status: 'success' },
    { id: 6, action: 'Login Attempt', user: 'unknown@hacker.com', target: 'Admin Portal', timestamp: '2025-12-19 03:15:42', ip: '45.33.32.156', status: 'failed' },
    { id: 7, action: 'Incident Approved', user: 'admin@snaproad.com', target: 'Incident #4521', timestamp: '2025-12-18 15:33:11', ip: '192.168.1.1', status: 'success' },
    { id: 8, action: 'Bulk Delete', user: 'admin@snaproad.com', target: '15 expired offers', timestamp: '2025-12-18 09:12:45', ip: '192.168.1.1', status: 'success' },
  ])

  const getActionIcon = (action: string) => {
    if (action.includes('Suspend') || action.includes('Delete')) return Trash2
    if (action.includes('Created') || action.includes('Approved')) return CheckCircle
    if (action.includes('Updated') || action.includes('Settings')) return Settings
    if (action.includes('Export')) return Download
    if (action.includes('Login')) return Users
    return FileText
  }

  const getActionColor = (status: string, action: string) => {
    if (status === 'failed') return 'red'
    if (action.includes('Suspend') || action.includes('Delete')) return 'red'
    if (action.includes('Created') || action.includes('Approved')) return 'emerald'
    if (action.includes('Login')) return 'blue'
    return 'purple'
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search audit logs..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select className="px-4 py-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
          <option>All Actions</option>
          <option>User Actions</option>
          <option>System Actions</option>
          <option>Security Events</option>
        </select>
        <select className="px-4 py-3 rounded-xl bg-white dark:bg-[#1A1A1E] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>All time</option>
        </select>
        <button className="px-4 py-3 rounded-xl bg-blue-500 text-white flex items-center gap-2 hover:bg-blue-600">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Target</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">IP Address</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {logs.map((log) => {
              const Icon = getActionIcon(log.action)
              const color = getActionColor(log.status, log.action)
              return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-500/20 flex items-center justify-center`}>
                        <Icon size={16} className={`text-${color}-500`} />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.user}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.target}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{log.timestamp}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-sm">{log.ip}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                      'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Placeholder Tab Component
function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="bg-white dark:bg-[#1A1A1E] rounded-2xl p-12 border border-gray-200 dark:border-white/10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <Activity size={28} className="text-purple-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400">This section is under development.</p>
    </div>
  )
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const getTitle = () => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      dashboard: { title: 'Dashboard', subtitle: 'Welcome back! Here\'s your platform overview.' },
      users: { title: 'Users & Families', subtitle: 'Manage driver accounts and family groups.' },
      incidents: { title: 'Incidents', subtitle: 'Review and manage reported incidents.' },
      moderation: { title: 'AI Moderation Queue', subtitle: 'Full control over the SnapRoad platform' },
      rewards: { title: 'Rewards & Vouchers', subtitle: 'Manage gem rewards and voucher campaigns.' },
      partners: { title: 'Partners & Campaigns', subtitle: 'Manage business partners and their campaigns.' },
      referrals: { title: 'Partner Referral Analytics', subtitle: 'Track partner referral performance.' },
      notifications: { title: 'Notifications', subtitle: 'Manage platform notifications and alerts.' },
      analytics: { title: 'Analytics', subtitle: 'Deep dive into platform metrics.' },
      finance: { title: 'Finance', subtitle: 'Revenue, transactions, and payouts.' },
      legal: { title: 'Legal & Compliance', subtitle: 'Terms, privacy, and compliance documents.' },
      settings: { title: 'Settings', subtitle: 'Configure platform settings.' },
      audit: { title: 'Audit Log', subtitle: 'Track all administrative actions.' },
    }
    return titles[activeTab] || { title: 'Dashboard', subtitle: '' }
  }

  const { title, subtitle } = getTitle()

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />
      case 'users':
        return <UsersTab />
      case 'incidents':
        return <IncidentsTab />
      case 'moderation':
        return <AIModerationTab />
      case 'rewards':
        return <RewardsTab />
      case 'partners':
        return <PartnersTab />
      case 'referrals':
        return <ReferralsTab />
      case 'notifications':
        return <NotificationsTab />
      case 'analytics':
        return <AnalyticsTab />
      case 'finance':
        return <FinanceTab />
      case 'legal':
        return <LegalTab />
      case 'settings':
        return <SettingsTab />
      case 'audit':
        return <AuditLogTab />
      default:
        return <PlaceholderTab title={title} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0D0D10] flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      />
      
      <main className="flex-1 p-6 overflow-y-auto">
        <Header title={title} subtitle={subtitle} />
        {renderContent()}
      </main>
    </div>
  )
}
>>>>>>> dbb8eaabacc7393ccaa9bb100ac90bde47b9aacc
