import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

const CHART_DATA = [
  { name: 'Jan', users: 4000, revenue: 2400 },
  { name: 'Feb', users: 3000, revenue: 1398 },
  { name: 'Mar', users: 5000, revenue: 9800 },
  { name: 'Apr', users: 2780, revenue: 3908 },
  { name: 'May', users: 1890, revenue: 4800 },
  { name: 'Jun', users: 2390, revenue: 3800 },
];

const STATS = [
  { 
    label: 'Total Users', 
    value: '68,234', 
    change: '+12.5%', 
    positive: true,
    icon: Users 
  },
  { 
    label: 'Active Today', 
    value: '12,847', 
    change: '+8.2%', 
    positive: true,
    icon: TrendingUp 
  },
  { 
    label: 'Revenue', 
    value: '$284,932', 
    change: '+23.1%', 
    positive: true,
    icon: DollarSign 
  },
  { 
    label: 'Incidents', 
    value: '142', 
    change: '-5.4%', 
    positive: false,
    icon: AlertTriangle 
  },
];

export function AdminDashboard() {
  const { theme } = useSnaproadTheme();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
          Dashboard
        </h1>
        <p className={theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}>
          Overview of your SnapRoad platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            className={`p-6 rounded-2xl border ${
              theme === 'dark' 
                ? 'bg-[#1A1F2E] border-white/10' 
                : 'bg-white border-[#E6ECF5]'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-[#0084FF]/10' : 'bg-[#0084FF]/5'
              }`}>
                <stat.icon size={24} className="text-[#0084FF]" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.positive ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'
              }`}>
                {stat.positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
                {stat.value}
              </p>
              <p className={theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}>
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Chart */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-[#1A1F2E] border-white/10' 
            : 'bg-white border-[#E6ECF5]'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-[#0B1220]'
          }`}>
            User Growth
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0084FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0084FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                />
                <XAxis 
                  dataKey="name" 
                  stroke={theme === 'dark' ? '#6B7886' : '#9CA3AF'} 
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#6B7886' : '#9CA3AF'} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1A1F2E' : '#fff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E6ECF5',
                    borderRadius: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#0084FF" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-[#1A1F2E] border-white/10' 
            : 'bg-white border-[#E6ECF5]'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-[#0B1220]'
          }`}>
            Revenue
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00DFA2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00DFA2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                />
                <XAxis 
                  dataKey="name" 
                  stroke={theme === 'dark' ? '#6B7886' : '#9CA3AF'} 
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#6B7886' : '#9CA3AF'} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1A1F2E' : '#fff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E6ECF5',
                    borderRadius: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#00DFA2" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
