// SnapRoad Partner Portal - Analytics
// Comprehensive analytics for partner businesses

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Gift,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  Target,
  ChevronDown,
  Download,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface PartnerAnalyticsDetailedProps {
  onNavigate: (page: string) => void;
}

const REVENUE_DATA = [
  { date: 'Jan', revenue: 2400, redemptions: 120, views: 8400 },
  { date: 'Feb', revenue: 3200, redemptions: 156, views: 10200 },
  { date: 'Mar', revenue: 4100, redemptions: 198, views: 12800 },
  { date: 'Apr', revenue: 3800, redemptions: 184, views: 11600 },
  { date: 'May', revenue: 4800, redemptions: 232, views: 14200 },
  { date: 'Jun', revenue: 5200, redemptions: 256, views: 15800 },
];

const HOURLY_DATA = [
  { hour: '6am', redemptions: 12 },
  { hour: '8am', redemptions: 45 },
  { hour: '10am', redemptions: 38 },
  { hour: '12pm', redemptions: 62 },
  { hour: '2pm', redemptions: 48 },
  { hour: '4pm', redemptions: 72 },
  { hour: '6pm', redemptions: 89 },
  { hour: '8pm', redemptions: 54 },
  { hour: '10pm', redemptions: 28 },
];

const DEMOGRAPHICS_DATA = [
  { name: '18-24', value: 18, color: '#0084FF' },
  { name: '25-34', value: 32, color: '#00DFA2' },
  { name: '35-44', value: 28, color: '#9D4EDD' },
  { name: '45-54', value: 15, color: '#FFC24C' },
  { name: '55+', value: 7, color: '#FF5A5A' },
];

const USER_TYPE_DATA = [
  { name: 'Free Users', value: 68, color: '#0084FF' },
  { name: 'Premium Users', value: 32, color: '#9D4EDD' },
];

const TOP_LOCATIONS = [
  { city: 'Los Angeles, CA', redemptions: 234, revenue: 1170, growth: 18 },
  { city: 'San Francisco, CA', redemptions: 189, revenue: 945, growth: 24 },
  { city: 'San Diego, CA', redemptions: 156, revenue: 780, growth: 12 },
  { city: 'Sacramento, CA', redemptions: 112, revenue: 560, growth: -5 },
  { city: 'Oakland, CA', redemptions: 98, revenue: 490, growth: 8 },
];

export function PartnerAnalyticsDetailed({ onNavigate }: PartnerAnalyticsDetailedProps) {
  const { theme } = useSnaproadTheme();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  
  const isDark = theme === 'dark';

  const metrics = {
    totalRevenue: { value: 23500, change: 31, isPositive: true },
    totalRedemptions: { value: 1146, change: 24, isPositive: true },
    avgOrderValue: { value: 20.50, change: 8, isPositive: true },
    conversionRate: { value: 4.2, change: -2, isPositive: false },
    repeatCustomers: { value: 38, change: 12, isPositive: true },
    avgRating: { value: 4.8, change: 3, isPositive: true },
  };

  const renderMetricCard = (
    label: string, 
    value: string | number, 
    change: number, 
    isPositive: boolean,
    icon: React.ElementType,
    color: string
  ) => (
    <motion.div
      className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          {<icon size={20} style={{ color }} />}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{value}</p>
      <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>{label}</p>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Analytics
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            Track your business performance and customer insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E6ECF5' }}>
            {(['7d', '30d', '90d', '12m'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-[#00DFA2] text-white'
                    : isDark ? 'bg-[#1A1F2E] text-white/60 hover:text-white' : 'bg-white text-[#4B5C74] hover:bg-[#F5F8FA]'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '12 Months'}
              </button>
            ))}
          </div>
          <button className={`h-10 px-4 rounded-xl flex items-center gap-2 ${
            isDark ? 'bg-[#1A1F2E] text-white/60 border border-white/10' : 'bg-white text-[#4B5C74] border border-[#E6ECF5]'
          }`}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {renderMetricCard('Total Revenue', `$${metrics.totalRevenue.value.toLocaleString()}`, metrics.totalRevenue.change, metrics.totalRevenue.isPositive, DollarSign, '#00DFA2')}
        {renderMetricCard('Redemptions', metrics.totalRedemptions.value.toLocaleString(), metrics.totalRedemptions.change, metrics.totalRedemptions.isPositive, Gift, '#0084FF')}
        {renderMetricCard('Avg Order Value', `$${metrics.avgOrderValue.value}`, metrics.avgOrderValue.change, metrics.avgOrderValue.isPositive, Target, '#9D4EDD')}
        {renderMetricCard('Conversion Rate', `${metrics.conversionRate.value}%`, metrics.conversionRate.change, metrics.conversionRate.isPositive, Zap, '#FFC24C')}
        {renderMetricCard('Repeat Customers', `${metrics.repeatCustomers.value}%`, metrics.repeatCustomers.change, metrics.repeatCustomers.isPositive, Users, '#0084FF')}
        {renderMetricCard('Avg Rating', metrics.avgRating.value.toString(), metrics.avgRating.change, metrics.avgRating.isPositive, TrendingUp, '#00DFA2')}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Revenue Trend
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00DFA2]" />
                <span className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00DFA2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00DFA2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="date" stroke={isDark ? '#6B7886' : '#9CA3AF'} />
                <YAxis stroke={isDark ? '#6B7886' : '#9CA3AF'} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1A1F2E' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E6ECF5',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00DFA2" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours */}
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Peak Redemption Hours
            </h3>
            <Clock size={18} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HOURLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="hour" stroke={isDark ? '#6B7886' : '#9CA3AF'} />
                <YAxis stroke={isDark ? '#6B7886' : '#9CA3AF'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1A1F2E' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E6ECF5',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="redemptions" fill="#0084FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Demographics & User Types Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Demographics */}
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Age Demographics
          </h3>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEMOGRAPHICS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {DEMOGRAPHICS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {DEMOGRAPHICS_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  {item.name}: {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Types */}
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            User Types
          </h3>
          <div className="h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={USER_TYPE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {USER_TYPE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {USER_TYPE_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={isDark ? 'text-white' : 'text-[#0B1220]'}>{item.name}</span>
                </div>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{item.value}%</span>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-4 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
            Premium users pay fewer gems per redemption
          </p>
        </div>

        {/* Top Locations */}
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Top Locations
            </h3>
            <MapPin size={18} className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'} />
          </div>
          <div className="space-y-3">
            {TOP_LOCATIONS.slice(0, 5).map((location, index) => (
              <div key={location.city} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-[#00DFA2] text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-[#F5F8FA] text-[#4B5C74]'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={isDark ? 'text-white' : 'text-[#0B1220]'}>{location.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {location.redemptions}
                  </span>
                  <span className={`text-xs font-medium ${location.growth >= 0 ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'}`}>
                    {location.growth >= 0 ? '+' : ''}{location.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-gradient-to-br from-[#00DFA2]/10 to-[#0084FF]/10 border-[#00DFA2]/20' : 'bg-gradient-to-br from-[#00DFA2]/5 to-[#0084FF]/5 border-[#00DFA2]/10'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/20 flex items-center justify-center">
            <Zap size={20} className="text-[#00DFA2]" />
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            AI-Powered Insights
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]/50' : 'bg-white/50'}`}>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              <span className="font-semibold text-[#00DFA2]">Peak Performance:</span> Your offers perform 42% better between 4-7 PM. Consider scheduling promotions during this window.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]/50' : 'bg-white/50'}`}>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              <span className="font-semibold text-[#0084FF]">User Preference:</span> Premium users redeem 2.3x more frequently. Your free item offer attracts the most premium conversions.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]/50' : 'bg-white/50'}`}>
            <p className={`text-sm ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              <span className="font-semibold text-[#9D4EDD]">Growth Opportunity:</span> San Francisco shows 24% growth. Consider increasing your offer visibility in this market.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnerAnalyticsDetailed;
