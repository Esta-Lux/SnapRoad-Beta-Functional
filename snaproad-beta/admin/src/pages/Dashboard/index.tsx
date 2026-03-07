import {
  Users,
  Map,
  AlertTriangle,
  Gift,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2
} from 'lucide-react'

// Mock data - replace with API calls
const stats = [
  { name: 'Total Users', value: '609', change: '+12%', trend: 'up', icon: Users },
  { name: 'Active Trips', value: '23', change: '+5', trend: 'up', icon: Map },
  { name: 'Pending Incidents', value: '8', change: '-3', trend: 'down', icon: AlertTriangle },
  { name: 'Gems Issued (Today)', value: '1,250', change: '+18%', trend: 'up', icon: Gift },
]

const recentActivity = [
  { id: 1, type: 'incident', message: 'New incident reported near Columbus', time: '2 min ago' },
  { id: 2, type: 'user', message: 'New user registered: john@example.com', time: '5 min ago' },
  { id: 3, type: 'partner', message: 'Partner application: Downtown Coffee', time: '15 min ago' },
  { id: 4, type: 'trip', message: 'Trip completed by user #1234', time: '20 min ago' },
  { id: 5, type: 'reward', message: 'Offer redeemed: 20% Off Any Coffee', time: '25 min ago' },
]

export default function Dashboard() {
  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome back! Here's what's happening with SnapRoad.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <stat.icon className="text-primary-400" size={24} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity size={20} className="text-primary-400" />
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'incident' ? 'bg-red-400' :
                    activity.type === 'user' ? 'bg-green-400' :
                    activity.type === 'partner' ? 'bg-purple-400' :
                    activity.type === 'trip' ? 'bg-blue-400' : 'bg-yellow-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.message}</p>
                    <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="p-6 space-y-3">
            <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left">
              <AlertTriangle className="text-red-400" size={20} />
              <div>
                <p className="text-white text-sm font-medium">Review Incidents</p>
                <p className="text-slate-400 text-xs">8 pending review</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left">
              <Building2 className="text-purple-400" size={20} />
              <div>
                <p className="text-white text-sm font-medium">Partner Applications</p>
                <p className="text-slate-400 text-xs">3 awaiting approval</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left">
              <Gift className="text-yellow-400" size={20} />
              <div>
                <p className="text-white text-sm font-medium">Adjust Rewards</p>
                <p className="text-slate-400 text-xs">Manual gem adjustments</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'API', status: 'operational' },
            { name: 'Database', status: 'operational' },
            { name: 'Mapbox', status: 'operational' },
            { name: 'AWS Services', status: 'operational' },
          ].map((service) => (
            <div key={service.name} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'operational' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <div>
                <p className="text-white text-sm">{service.name}</p>
                <p className="text-slate-400 text-xs capitalize">{service.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
