import { TrendingUp, Users, DollarSign, Gift, Eye, MousePointer } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

const CHART_DATA = [
  { name: 'Mon', views: 1200, clicks: 340, redemptions: 45 },
  { name: 'Tue', views: 1400, clicks: 420, redemptions: 52 },
  { name: 'Wed', views: 1100, clicks: 280, redemptions: 38 },
  { name: 'Thu', views: 1800, clicks: 560, redemptions: 67 },
  { name: 'Fri', views: 2100, clicks: 680, redemptions: 89 },
  { name: 'Sat', views: 2400, clicks: 820, redemptions: 102 },
  { name: 'Sun', views: 1900, clicks: 580, redemptions: 76 },
];

const STATS = [
  { label: 'Total Views', value: '12.4K', change: '+18%', positive: true, icon: Eye },
  { label: 'Total Clicks', value: '3,680', change: '+24%', positive: true, icon: MousePointer },
  { label: 'Redemptions', value: '469', change: '+12%', positive: true, icon: Gift },
  { label: 'Revenue', value: '$8,420', change: '+31%', positive: true, icon: DollarSign },
];

const TOP_OFFERS = [
  { name: '$0.15 off per gallon', views: 4200, clicks: 1240, redemptions: 186, revenue: '$2,790' },
  { name: 'Free car wash with fill-up', views: 3100, clicks: 980, redemptions: 142, revenue: '$1,988' },
  { name: '$5 off $50 purchase', views: 2800, clicks: 840, redemptions: 98, revenue: '$1,470' },
];

export function PartnerDashboard() {
  const { theme } = useSnaproadTheme();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
          Partner Dashboard
        </h1>
        <p className={theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'}>
          Track your business performance on SnapRoad
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
                theme === 'dark' ? 'bg-[#00DFA2]/10' : 'bg-[#00DFA2]/5'
              }`}>
                <stat.icon size={24} className="text-[#00DFA2]" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.positive ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'
              }`}>
                <TrendingUp size={16} />
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-[#1A1F2E] border-white/10' 
            : 'bg-white border-[#E6ECF5]'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-[#0B1220]'
          }`}>
            Weekly Performance
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="views" 
                  stroke="#00DFA2" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Redemptions Chart */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' 
            ? 'bg-[#1A1F2E] border-white/10' 
            : 'bg-white border-[#E6ECF5]'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-[#0B1220]'
          }`}>
            Daily Redemptions
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={CHART_DATA}>
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
                <Bar dataKey="redemptions" fill="#0084FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Offers */}
      <div className={`p-6 rounded-2xl border ${
        theme === 'dark' 
          ? 'bg-[#1A1F2E] border-white/10' 
          : 'bg-white border-[#E6ECF5]'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-[#0B1220]'
          }`}>
            Top Performing Offers
          </h3>
          <button className="text-[#00DFA2] text-sm font-medium">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${
              theme === 'dark' ? 'border-white/10' : 'border-[#E6ECF5]'
            }`}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Offer</th>
                <th className={`px-4 py-3 text-left text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Views</th>
                <th className={`px-4 py-3 text-left text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Clicks</th>
                <th className={`px-4 py-3 text-left text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Redemptions</th>
                <th className={`px-4 py-3 text-left text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-[#4B5C74]'
                }`}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {TOP_OFFERS.map((offer, index) => (
                <tr 
                  key={index}
                  className={`border-b last:border-0 ${
                    theme === 'dark' ? 'border-white/5' : 'border-[#E6ECF5]'
                  }`}
                >
                  <td className={`px-4 py-4 ${theme === 'dark' ? 'text-white' : 'text-[#0B1220]'}`}>
                    {offer.name}
                  </td>
                  <td className={`px-4 py-4 ${theme === 'dark' ? 'text-white/80' : 'text-[#4B5C74]'}`}>
                    {offer.views.toLocaleString()}
                  </td>
                  <td className={`px-4 py-4 ${theme === 'dark' ? 'text-white/80' : 'text-[#4B5C74]'}`}>
                    {offer.clicks.toLocaleString()}
                  </td>
                  <td className={`px-4 py-4 ${theme === 'dark' ? 'text-white/80' : 'text-[#4B5C74]'}`}>
                    {offer.redemptions}
                  </td>
                  <td className="px-4 py-4 text-[#00DFA2] font-semibold">
                    {offer.revenue}
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
