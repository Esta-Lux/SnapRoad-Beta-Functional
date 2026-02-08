import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Building2, Gift, Calendar, Plus, TrendingUp,
  Settings, Bell, LogOut, Search, Filter, Edit2, Trash2,
  BarChart3, Eye, Zap, Check, X, MapPin, Clock, Star,
  AlertTriangle, Gem, Car, Trophy, ChevronRight, Download
} from 'lucide-react'

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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'partners' | 'events' | 'offers'>('overview')
  const [loading, setLoading] = useState(true)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    total_users: 12450,
    premium_users: 3240,
    total_partners: 156,
    active_offers: 847,
    total_trips: 89420,
    avg_safety_score: 87,
  })
  
  // Data
  const [users, setUsers] = useState<User[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Mock users
    setUsers([
      { id: '1', name: 'John Smith', email: 'john@example.com', plan: 'premium', safety_score: 95, gems: 12450, level: 45, status: 'active' },
      { id: '2', name: 'Sarah Wilson', email: 'sarah@example.com', plan: 'basic', safety_score: 88, gems: 3420, level: 23, status: 'active' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com', plan: 'premium', safety_score: 92, gems: 8750, level: 38, status: 'active' },
      { id: '4', name: 'Emily Davis', email: 'emily@example.com', plan: 'basic', safety_score: 78, gems: 1560, level: 12, status: 'suspended' },
    ])
    
    // Mock partners
    setPartners([
      { id: '1', business_name: 'Shell Gas Station', email: 'shell@partner.com', offers_count: 5, total_redemptions: 2340, status: 'active' },
      { id: '2', business_name: 'Starbucks Downtown', email: 'starbucks@partner.com', offers_count: 3, total_redemptions: 1567, status: 'active' },
      { id: '3', business_name: 'Quick Shine Car Wash', email: 'quickshine@partner.com', offers_count: 2, total_redemptions: 890, status: 'pending' },
    ])
    
    // Mock events
    setEvents([
      {
        id: '1',
        title: 'Safe Driver Weekend',
        description: 'Double gems for all safe trips!',
        type: 'weekly',
        gems_multiplier: 2,
        xp_bonus: 500,
        start_date: '2025-02-08',
        end_date: '2025-02-10',
        status: 'active',
      },
      {
        id: '2',
        title: 'Valentine\'s Safety Special',
        description: 'Share the road, share the love!',
        type: 'special',
        gems_multiplier: 1.5,
        xp_bonus: 1000,
        start_date: '2025-02-14',
        end_date: '2025-02-14',
        status: 'scheduled',
      },
      {
        id: '3',
        title: 'Daily Challenge',
        description: 'Complete 3 safe trips today',
        type: 'daily',
        gems_multiplier: 1,
        xp_bonus: 250,
        start_date: '2025-02-08',
        end_date: '2025-02-08',
        status: 'active',
      },
    ])
    
    setLoading(false)
  }

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <span className="text-white font-bold">SnapRoad</span>
              <span className="text-purple-400 text-xs block">Admin Console</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-auto">
          <div className="space-y-1">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'users', icon: Users, label: 'Users' },
              { id: 'partners', icon: Building2, label: 'Partners' },
              { id: 'events', icon: Calendar, label: 'Events' },
              { id: 'offers', icon: Gift, label: 'All Offers' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50">
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50">
              <Bell size={20} />
              <span className="font-medium">Notifications</span>
            </button>
          </div>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === 'overview' && 'Admin Dashboard'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'partners' && 'Partner Management'}
              {activeTab === 'events' && 'Events & Promotions'}
              {activeTab === 'offers' && 'All Offers'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Full control over the SnapRoad platform
            </p>
          </div>
          {activeTab === 'events' && (
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="bg-purple-500 hover:bg-purple-400 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Plus size={20} />
              Create Event
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'blue', sub: `${stats.premium_users.toLocaleString()} premium` },
                    { label: 'Partners', value: stats.total_partners.toLocaleString(), icon: Building2, color: 'emerald', sub: `${stats.active_offers} active offers` },
                    { label: 'Avg Safety Score', value: stats.avg_safety_score.toString(), icon: Shield, color: 'purple', sub: `${stats.total_trips.toLocaleString()} total trips` },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 bg-${stat.color}-500/20 rounded-xl flex items-center justify-center`}>
                          <stat.icon className={`text-${stat.color}-400`} size={24} />
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                      </div>
                      <p className="text-slate-400 text-sm">{stat.label}</p>
                      <p className="text-white text-3xl font-bold mt-1">{stat.value}</p>
                      <p className="text-slate-500 text-xs mt-2">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Create Event', icon: Calendar, color: 'purple', action: () => setShowCreateEventModal(true) },
                    { label: 'View Reports', icon: BarChart3, color: 'blue', action: () => {} },
                    { label: 'Send Broadcast', icon: Bell, color: 'amber', action: () => {} },
                    { label: 'Export Data', icon: Download, color: 'emerald', action: () => {} },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={action.action}
                      className={`bg-slate-800 border border-slate-700 rounded-xl p-4 text-center hover:bg-slate-700/50 transition-all`}
                    >
                      <div className={`w-10 h-10 bg-${action.color}-500/20 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                        <action.icon className={`text-${action.color}-400`} size={20} />
                      </div>
                      <span className="text-white text-sm font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Active Events */}
                  <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Calendar className="text-purple-400" size={20} />
                      Active Events
                    </h2>
                    <div className="space-y-3">
                      {events.filter(e => e.status === 'active').map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                          <div>
                            <p className="text-white font-medium text-sm">{event.title}</p>
                            <p className="text-slate-500 text-xs">{event.type} • {event.gems_multiplier}x gems</p>
                          </div>
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform Health */}
                  <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                    <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <Shield className="text-emerald-400" size={20} />
                      Platform Health
                    </h2>
                    <div className="space-y-4">
                      {[
                        { label: 'API Status', status: 'Operational', color: 'emerald' },
                        { label: 'Database', status: 'Healthy', color: 'emerald' },
                        { label: 'Payment Gateway', status: 'Connected', color: 'emerald' },
                        { label: 'Push Notifications', status: 'Active', color: 'emerald' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">{item.label}</span>
                          <span className={`text-${item.color}-400 text-sm font-medium flex items-center gap-1`}>
                            <Check size={14} />
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500"
                    />
                  </div>
                  <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                    <option>All Plans</option>
                    <option>Premium</option>
                    <option>Basic</option>
                  </select>
                  <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </div>

                {/* Users Table */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">User</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Plan</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Safety Score</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Gems</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Level</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Status</th>
                        <th className="text-right text-slate-400 text-xs font-medium px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-t border-slate-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{user.name}</p>
                                <p className="text-slate-500 text-xs">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.plan === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/50 text-slate-400'
                            }`}>
                              {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-medium ${
                              user.safety_score >= 90 ? 'text-emerald-400' :
                              user.safety_score >= 70 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {user.safety_score}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-cyan-400">{user.gems.toLocaleString()}</td>
                          <td className="px-6 py-4 text-white">{user.level}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Partners Tab */}
            {activeTab === 'partners' && (
              <div className="space-y-6">
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Business</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Offers</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Redemptions</th>
                        <th className="text-left text-slate-400 text-xs font-medium px-6 py-4">Status</th>
                        <th className="text-right text-slate-400 text-xs font-medium px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map(partner => (
                        <tr key={partner.id} className="border-t border-slate-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="text-emerald-400" size={18} />
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{partner.business_name}</p>
                                <p className="text-slate-500 text-xs">{partner.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white">{partner.offers_count}</td>
                          <td className="px-6 py-4 text-emerald-400">{partner.total_redemptions.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              partner.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              partner.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                              <Edit2 size={16} />
                            </button>
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
                    <div key={event.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">{event.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                              event.type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                              event.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-600/50 text-slate-400'
                            }`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">{event.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <Gem className="text-cyan-400" size={16} />
                              <span className="text-slate-400">{event.gems_multiplier}x gems</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="text-amber-400" size={16} />
                              <span className="text-slate-400">+{event.xp_bonus} XP bonus</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="text-slate-500" size={16} />
                              <span className="text-slate-400">{event.start_date} - {event.end_date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <p className="text-slate-400 text-center py-12">All platform offers will be displayed here</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-xl">Create New Event</h2>
              <button onClick={() => setShowCreateEventModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g., Safe Driver Weekend"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Description</label>
                <textarea
                  placeholder="Describe the event..."
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Event Type</label>
                <select className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="special">Special</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Gems Multiplier</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="2"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">XP Bonus</label>
                  <input
                    type="number"
                    placeholder="500"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">End Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="flex-1 bg-slate-700 text-white py-3 rounded-xl hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-400"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
