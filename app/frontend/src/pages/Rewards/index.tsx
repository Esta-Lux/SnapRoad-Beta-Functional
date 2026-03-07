import { Gift, TrendingUp, Users, Award } from 'lucide-react'

export default function Rewards() {
  return (
    <div className="space-y-6" data-testid="rewards-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Rewards Management</h1>
        <p className="text-slate-400 mt-1">Monitor Gems distribution and manage rewards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Gems Issued', value: '125,000', icon: Gift, color: 'text-purple-400' },
          { label: 'Gems Redeemed', value: '45,000', icon: Award, color: 'text-green-400' },
          { label: 'Active Leaderboard', value: '450', icon: Users, color: 'text-blue-400' },
          { label: 'Avg Score (Week)', value: '87', icon: TrendingUp, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <stat.icon className={stat.color} size={24} />
            <p className="text-2xl font-bold text-white mt-4">{stat.value}</p>
            <p className="text-slate-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Manual adjustment form */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Manual Gems Adjustment</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="User ID or Email"
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
          />
          <input
            type="number"
            placeholder="Gems Amount (+ or -)"
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
          />
          <input
            type="text"
            placeholder="Reason"
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
          />
        </div>
        <button className="mt-4 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg">
          Adjust Gems
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Top Leaderboard</h2>
          <button className="text-red-400 hover:text-red-300 text-sm">Reset Season</button>
        </div>
        <div className="p-6">
          <p className="text-slate-400">Leaderboard view coming soon...</p>
        </div>
      </div>
    </div>
  )
}
