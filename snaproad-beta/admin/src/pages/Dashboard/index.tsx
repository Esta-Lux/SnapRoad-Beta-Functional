import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users, Map, AlertTriangle, Gift, TrendingUp, Clock, Shield, Search,
  ChevronRight, Bell, Settings, LogOut, RefreshCw, Download, Eye, 
  UserCheck, UserX, Flag, CheckCircle, XCircle, BarChart3, Activity,
  Filter, MoreHorizontal, Building2, X, Check, Plus
} from 'lucide-react'

// Mock admin data
const adminStats = {
  totalUsers: 1247,
  activeUsers: 892,
  totalTrips: 8934,
  pendingIncidents: 23,
  totalGems: '2.4M',
  partners: 45
}

const recentUsers = [
  { id: 1, name: 'John Smith', email: 'john@example.com', status: 'active', trips: 45, gems: 1240, joined: '2 days ago' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', status: 'active', trips: 89, gems: 3450, joined: '1 week ago' },
  { id: 3, name: 'Mike Williams', email: 'mike@example.com', status: 'suspended', trips: 12, gems: 340, joined: '3 weeks ago' },
  { id: 4, name: 'Emily Davis', email: 'emily@example.com', status: 'pending', trips: 0, gems: 0, joined: 'Today' },
]

const recentIncidents = [
  { id: 1, type: 'pothole', reporter: 'John S.', location: 'Main St & 5th Ave', status: 'pending', time: '10 min ago' },
  { id: 2, type: 'accident', reporter: 'Sarah J.', location: 'Highway 71 N', status: 'verified', time: '1 hour ago' },
  { id: 3, type: 'construction', reporter: 'Mike W.', location: 'Oak Street', status: 'rejected', time: '3 hours ago' },
  { id: 4, type: 'hazard', reporter: 'Emily D.', location: 'Park Ave', status: 'pending', time: '5 hours ago' },
]

const recentPartners = [
  { id: 1, name: 'Shell Gas', type: 'gas', status: 'active', offers: 3, redemptions: 456 },
  { id: 2, name: 'Downtown Coffee', type: 'cafe', status: 'active', offers: 2, redemptions: 234 },
  { id: 3, name: 'Quick Mart', type: 'retail', status: 'pending', offers: 0, redemptions: 0 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [showUserModal, setShowUserModal] = useState<typeof recentUsers[0] | null>(null)
  const [showIncidentModal, setShowIncidentModal] = useState<typeof recentIncidents[0] | null>(null)
  const [showPartnerModal, setShowPartnerModal] = useState<typeof recentPartners[0] | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all')
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'verified': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'suspended': case 'rejected': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const handleVerifyIncident = (id: number) => {
    toast.success(`Incident #${id} verified`)
    setShowIncidentModal(null)
  }

  const handleRejectIncident = (id: number) => {
    toast.success(`Incident #${id} rejected`)
    setShowIncidentModal(null)
  }

  const handleSuspendUser = (id: number) => {
    toast.success(`User suspended`)
    setShowUserModal(null)
  }

  const handleActivateUser = (id: number) => {
    toast.success(`User activated`)
    setShowUserModal(null)
  }

  const handleApprovePartner = (id: number) => {
    toast.success(`Partner approved`)
    setShowPartnerModal(null)
  }

  const handleRefresh = () => {
    toast.loading('Refreshing data...', { duration: 1500 })
    setTimeout(() => toast.success('Data refreshed!'), 1500)
  }

  const handleExport = () => {
    toast.success('Exporting dashboard data...')
    setTimeout(() => toast.success('Download started!'), 1000)
  }

  const filteredUsers = recentUsers.filter(u => 
    (userStatusFilter === 'all' || u.status === userStatusFilter) &&
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredIncidents = recentIncidents.filter(i => 
    incidentStatusFilter === 'all' || i.status === incidentStatusFilter
  )

  return (
    <div className="min-h-screen bg-slate-900">
      {/* User Detail Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">User Details</h3>
              <button onClick={() => setShowUserModal(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
                {showUserModal.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="text-white font-medium">{showUserModal.name}</h4>
                <p className="text-slate-400 text-sm">{showUserModal.email}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(showUserModal.status)}`}>
                  {showUserModal.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{showUserModal.trips}</p>
                <p className="text-slate-400 text-xs">Trips</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{showUserModal.gems}</p>
                <p className="text-slate-400 text-xs">Gems</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">{showUserModal.joined}</p>
                <p className="text-slate-400 text-xs">Joined</p>
              </div>
            </div>
            <div className="flex gap-2">
              {showUserModal.status !== 'suspended' ? (
                <button 
                  onClick={() => handleSuspendUser(showUserModal.id)}
                  className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg hover:bg-red-500/30 flex items-center justify-center gap-2"
                >
                  <UserX size={18} /> Suspend
                </button>
              ) : (
                <button 
                  onClick={() => handleActivateUser(showUserModal.id)}
                  className="flex-1 bg-green-500/20 text-green-400 py-2 rounded-lg hover:bg-green-500/30 flex items-center justify-center gap-2"
                >
                  <UserCheck size={18} /> Activate
                </button>
              )}
              <button 
                onClick={() => { toast('Viewing full profile...'); setShowUserModal(null) }}
                className="flex-1 bg-slate-700 text-white py-2 rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2"
              >
                <Eye size={18} /> Full Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIncidentModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Incident Report</h3>
              <button onClick={() => setShowIncidentModal(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-white font-medium capitalize">{showIncidentModal.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reporter</span>
                <span className="text-white">{showIncidentModal.reporter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location</span>
                <span className="text-white">{showIncidentModal.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(showIncidentModal.status)}`}>
                  {showIncidentModal.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reported</span>
                <span className="text-white">{showIncidentModal.time}</span>
              </div>
            </div>
            {/* Placeholder for image */}
            <div className="bg-slate-700 rounded-lg h-32 flex items-center justify-center mb-4">
              <span className="text-slate-400">📷 Incident Photo</span>
            </div>
            {showIncidentModal.status === 'pending' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => handleVerifyIncident(showIncidentModal.id)}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Verify
                </button>
                <button 
                  onClick={() => handleRejectIncident(showIncidentModal.id)}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner Detail Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPartnerModal(null)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Partner Details</h3>
              <button onClick={() => setShowPartnerModal(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Building2 className="text-purple-400" size={28} />
              </div>
              <div>
                <h4 className="text-white font-medium">{showPartnerModal.name}</h4>
                <p className="text-slate-400 text-sm capitalize">{showPartnerModal.type}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(showPartnerModal.status)}`}>
                  {showPartnerModal.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{showPartnerModal.offers}</p>
                <p className="text-slate-400 text-xs">Active Offers</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{showPartnerModal.redemptions}</p>
                <p className="text-slate-400 text-xs">Total Redemptions</p>
              </div>
            </div>
            {showPartnerModal.status === 'pending' && (
              <button 
                onClick={() => handleApprovePartner(showPartnerModal.id)}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Check size={18} /> Approve Partner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={() => setShowNotifications(false)}>
          <div className="bg-slate-800 w-full max-w-sm h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { title: 'New Incident Report', desc: 'Pothole reported on Main St', time: '5m ago', urgent: true },
                { title: 'Partner Application', desc: 'Quick Mart wants to join', time: '30m ago', urgent: false },
                { title: 'System Alert', desc: 'High API usage detected', time: '1h ago', urgent: true },
                { title: 'User Report', desc: 'Suspicious activity flagged', time: '2h ago', urgent: false },
              ].map((notif, i) => (
                <button 
                  key={i}
                  onClick={() => { toast(`Viewing: ${notif.title}`); setShowNotifications(false) }}
                  className={`w-full rounded-lg p-3 text-left hover:bg-slate-700 transition-colors ${notif.urgent ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-700/50'}`}
                >
                  <p className="text-white font-medium">{notif.title}</p>
                  <p className="text-slate-400 text-sm">{notif.desc}</p>
                  <p className="text-slate-500 text-xs mt-1">{notif.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png"
              alt="SnapRoad"
              className="h-8"
            />
            <span className="text-white font-semibold">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 w-64"
              />
            </div>
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative text-slate-400 hover:text-white p-2"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button 
              onClick={() => toast('Opening settings...')}
              className="text-slate-400 hover:text-white p-2"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white p-2"
            >
              <LogOut size={20} />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">A</div>
              <span className="text-white text-sm">Admin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
            <p className="text-slate-400">Welcome back! Here's what's happening with SnapRoad.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={18} /> Refresh
            </button>
            <button 
              onClick={handleExport}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download size={18} /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total Users', value: adminStats.totalUsers, icon: Users, color: 'bg-blue-500/20 text-blue-400', change: '+12%' },
            { label: 'Active Users', value: adminStats.activeUsers, icon: Activity, color: 'bg-green-500/20 text-green-400', change: '+5%' },
            { label: 'Total Trips', value: adminStats.totalTrips.toLocaleString(), icon: Map, color: 'bg-purple-500/20 text-purple-400', change: '+23%' },
            { label: 'Pending Incidents', value: adminStats.pendingIncidents, icon: AlertTriangle, color: 'bg-red-500/20 text-red-400', change: '-8%' },
            { label: 'Total Gems', value: adminStats.totalGems, icon: Gift, color: 'bg-yellow-500/20 text-yellow-400', change: '+45%' },
            { label: 'Partners', value: adminStats.partners, icon: Building2, color: 'bg-cyan-500/20 text-cyan-400', change: '+3' },
          ].map((stat, i) => (
            <button
              key={i}
              onClick={() => toast(`${stat.label}: ${stat.value}`)}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color.split(' ')[0]} flex items-center justify-center mb-3`}>
                <stat.icon className={stat.color.split(' ')[1]} size={20} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{stat.label}</p>
                <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Section */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="text-blue-400" size={20} />
                Recent Users
              </h2>
              <div className="flex items-center gap-2">
                <select 
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
                <button 
                  onClick={() => toast('View all users')}
                  className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setShowUserModal(user)}
                  className="w-full p-4 hover:bg-slate-700/30 transition-colors flex items-center gap-4 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{user.name}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{user.trips} trips</p>
                    <p className="text-purple-400 text-sm">{user.gems} gems</p>
                  </div>
                  <ChevronRight className="text-slate-500" size={20} />
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-slate-400">No users found</div>
              )}
            </div>
          </div>

          {/* Incidents Section */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-400" size={20} />
                Incidents
              </h2>
              <select 
                value={incidentStatusFilter}
                onChange={(e) => setIncidentStatusFilter(e.target.value as typeof incidentStatusFilter)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="divide-y divide-slate-700">
              {filteredIncidents.map((incident) => (
                <button
                  key={incident.id}
                  onClick={() => setShowIncidentModal(incident)}
                  className="w-full p-4 hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium capitalize">{incident.type}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{incident.location}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-slate-500 text-xs">By {incident.reporter}</p>
                    <p className="text-slate-500 text-xs">{incident.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Partners Section */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="text-purple-400" size={20} />
              Business Partners
            </h2>
            <button 
              onClick={() => toast('Opening partner management...')}
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
            >
              Manage Partners <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700">
            {recentPartners.map((partner) => (
              <button
                key={partner.id}
                onClick={() => setShowPartnerModal(partner)}
                className="p-4 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Building2 className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{partner.name}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(partner.status)}`}>
                      {partner.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{partner.offers} offers</span>
                  <span className="text-green-400">{partner.redemptions} redemptions</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'View All Users', icon: Users, action: () => toast('Opening user management...') },
            { label: 'Incident Reports', icon: Flag, action: () => toast('Opening incident reports...') },
            { label: 'Analytics', icon: BarChart3, action: () => toast('Opening analytics...') },
            { label: 'System Settings', icon: Settings, action: () => toast('Opening system settings...') },
          ].map((action, i) => (
            <button
              key={i}
              onClick={action.action}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-primary-500 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <action.icon className="text-primary-400" size={20} />
              </div>
              <span className="text-white font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
