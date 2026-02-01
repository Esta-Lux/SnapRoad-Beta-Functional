import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Ban, Gift, Map, AlertTriangle } from 'lucide-react'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock user data - replace with API call
  const user = {
    id,
    fullName: 'Test Driver',
    email: 'test@snaproad.co',
    phone: '+1234567890',
    subscription: 'premium',
    status: 'active',
    joinedAt: '2025-01-01',
    stats: {
      totalTrips: 45,
      totalDistance: 1250.5,
      averageScore: 92,
      gemsBalance: 1300,
      gemsEarned: 1500,
      gemsSpent: 200,
      incidentsReported: 12,
      currentStreak: 15,
    },
    recentTrips: [
      { id: '1', date: '2025-01-15', distance: 25.4, score: 95, gems: 15 },
      { id: '2', date: '2025-01-14', distance: 18.2, score: 88, gems: 12 },
      { id: '3', date: '2025-01-13', distance: 42.1, score: 97, gems: 20 },
    ],
    vehicles: [
      { id: '1', make: 'Toyota', model: 'Camry', year: 2022, isPrimary: true },
      { id: '2', make: 'Tesla', model: 'Model 3', year: 2023, isPrimary: false },
    ]
  }

  return (
    <div className="space-y-6" data-testid="user-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{user.fullName}</h1>
          <p className="text-slate-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
            <Mail size={18} />
            Email User
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
            <Ban size={18} />
            Suspend
          </button>
        </div>
      </div>

      {/* User info and stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user.fullName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{user.fullName}</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                user.subscription === 'premium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'
              }`}>
                {user.subscription}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone</span>
              <span className="text-white">{user.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                {user.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Joined</span>
              <span className="text-white">{user.joinedAt}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Trips', value: user.stats.totalTrips, icon: Map, color: 'text-blue-400' },
            { label: 'Distance (km)', value: user.stats.totalDistance.toFixed(1), icon: Map, color: 'text-green-400' },
            { label: 'Avg Score', value: user.stats.averageScore, icon: Gift, color: 'text-yellow-400' },
            { label: 'Gems Balance', value: user.stats.gemsBalance, icon: Gift, color: 'text-purple-400' },
            { label: 'Gems Earned', value: user.stats.gemsEarned, icon: Gift, color: 'text-green-400' },
            { label: 'Gems Spent', value: user.stats.gemsSpent, icon: Gift, color: 'text-red-400' },
            { label: 'Incidents', value: user.stats.incidentsReported, icon: AlertTriangle, color: 'text-orange-400' },
            { label: 'Current Streak', value: `${user.stats.currentStreak} days`, icon: Map, color: 'text-cyan-400' },
          ].map((stat, index) => (
            <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <stat.icon className={stat.color} size={20} />
              <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
              <p className="text-slate-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent trips */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Recent Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Distance</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Score</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Gems Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {user.recentTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-white">{trip.date}</td>
                  <td className="px-6 py-4 text-white">{trip.distance} km</td>
                  <td className="px-6 py-4">
                    <span className={`${trip.score >= 90 ? 'text-green-400' : trip.score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {trip.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-purple-400">+{trip.gems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicles */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Vehicles</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                {vehicle.isPrimary && (
                  <span className="text-xs text-primary-400">Primary</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
