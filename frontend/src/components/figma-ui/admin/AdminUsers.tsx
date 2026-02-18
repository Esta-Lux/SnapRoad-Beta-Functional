import { useState } from 'react';
import { Search, Download, MoreVertical, Users as UsersIcon, Shield } from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

const USERS = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.j@email.com', plan: 'Premium', lastSeen: '5 min ago', status: 'Active' },
  { id: 2, name: 'Mike Wilson', email: 'mike.w@email.com', plan: 'Family', lastSeen: '2 hours ago', status: 'Active' },
  { id: 3, name: 'Emma Davis', email: 'emma.d@email.com', plan: 'Free', lastSeen: '1 day ago', status: 'Active' },
  { id: 4, name: 'James Brown', email: 'james.b@email.com', plan: 'Premium', lastSeen: '3 days ago', status: 'Suspended' }
];

export function AdminUsers() {
  const { theme } = useSnaproadTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Family': return 'bg-[#00DFA2]/10 text-[#00DFA2]';
      case 'Premium': return 'bg-[#0084FF]/10 text-[#0084FF]';
      default: return theme === 'dark' ? 'bg-white/10 text-white/60' : 'bg-[#4B5C74]/10 text-[#4B5C74]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
            Users & Families
          </h1>
          <p className={theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}>
            Manage user accounts and family plans
          </p>
        </div>
        <button className="h-10 px-4 rounded-lg bg-[#0084FF] text-white hover:bg-[#006DD9] transition-colors flex items-center gap-2">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '68,234' },
          { label: 'Free Plan', value: '42,156' },
          { label: 'Premium', value: '18,942' },
          { label: 'Family Plans', value: '7,136' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className={`rounded-xl p-4 border ${
              theme === 'dark' 
                ? 'bg-[#1A1F2E] border-white/10' 
                : 'bg-white border-[#E6ECF5]'
            }`}
          >
            <p className={theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'} style={{ fontSize: '13px' }}>
              {stat.label}
            </p>
            <p className={`text-[22px] font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className={`rounded-xl p-4 border ${
        theme === 'dark' 
          ? 'bg-[#1A1F2E] border-white/10' 
          : 'bg-white border-[#E6ECF5]'
      }`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              theme === 'dark' ? 'text-white/40' : 'text-[#4B5C74]'
            }`} size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full h-10 pl-10 pr-4 rounded-lg border focus:outline-none focus:border-[#0084FF] ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' 
                  : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220] placeholder:text-[#4B5C74]'
              }`}
              data-testid="users-search-input"
            />
          </div>
          <select className={`h-10 px-4 rounded-lg border focus:outline-none focus:border-[#0084FF] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 text-white' 
              : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220]'
          }`}>
            <option>All Plans</option>
            <option>Free</option>
            <option>Premium</option>
            <option>Family</option>
          </select>
          <select className={`h-10 px-4 rounded-lg border focus:outline-none focus:border-[#0084FF] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 text-white' 
              : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220]'
          }`}>
            <option>All Status</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className={`rounded-xl border overflow-hidden ${
        theme === 'dark' 
          ? 'bg-[#1A1F2E] border-white/10' 
          : 'bg-white border-[#E6ECF5]'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-[#F5F8FA] border-[#E6ECF5]'
            }`}>
              <tr>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Name</th>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Email</th>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Plan</th>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Last Seen</th>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Status</th>
                <th className={`px-6 py-3 text-left text-[13px] ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((user) => (
                <tr 
                  key={user.id} 
                  className={`border-b last:border-0 transition-colors ${
                    theme === 'dark' 
                      ? 'border-white/5 hover:bg-white/5' 
                      : 'border-[#E6ECF5] hover:bg-[#F5F8FA]'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center text-white text-[13px] font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className={theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}>
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-[11px] ${getPlanColor(user.plan)}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {user.lastSeen}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-[11px] ${
                      user.status === 'Active' 
                        ? 'bg-[#00DFA2]/10 text-[#00DFA2]' 
                        : 'bg-[#FF5A5A]/10 text-[#FF5A5A]'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                      className={`p-1 transition-colors ${
                        theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-[#4B5C74] hover:text-[#0B1220]'
                      }`}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
