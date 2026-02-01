import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, MoreVertical, Eye, Ban, Mail } from 'lucide-react'

// Mock data
const mockUsers = [
  { id: '1', fullName: 'Test Driver', email: 'test@snaproad.co', subscription: 'premium', status: 'active', trips: 45, gems: 1300, joinedAt: '2025-01-01' },
  { id: '2', fullName: 'John Smith', email: 'john@example.com', subscription: 'free', status: 'active', trips: 20, gems: 450, joinedAt: '2025-01-05' },
  { id: '3', fullName: 'Jane Doe', email: 'jane@example.com', subscription: 'family', status: 'active', trips: 80, gems: 1500, joinedAt: '2025-01-03' },
  { id: '4', fullName: 'Bob Wilson', email: 'bob@example.com', subscription: 'free', status: 'suspended', trips: 5, gems: 50, joinedAt: '2025-01-10' },
]

export default function Users() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 mt-1">Manage and view all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="users-search-input"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Subscription</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Trips</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Gems</th>
                <th className="text-left text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Joined</th>
                <th className="text-right text-sm font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <span className="text-primary-400 font-medium">
                          {user.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.fullName}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.subscription === 'premium' ? 'bg-yellow-500/20 text-yellow-400' :
                      user.subscription === 'family' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.subscription}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{user.trips}</td>
                  <td className="px-6 py-4 text-white">{user.gems.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-400">{user.joinedAt}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/users/${user.id}`)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Send Email"
                      >
                        <Mail size={18} />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        title="Suspend User"
                      >
                        <Ban size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <p className="text-slate-400 text-sm">Showing {filteredUsers.length} of {mockUsers.length} users</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 bg-primary-500 text-white rounded">1</button>
            <button className="px-3 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
