import { useState } from 'react';
import { 
  ArrowLeft, 
  Fuel, 
  Clock, 
  MapPin, 
  Navigation, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  BarChart3, 
  Zap, 
  Leaf, 
  Trophy,
  Share2,
  Settings
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
import { BottomNav } from './BottomNav';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface FuelDashboardProps {
  onNavigate: (screen: string) => void;
}

const CHART_DATA = [
  { day: 'Mon', saved: 2.4, efficiency: 78 },
  { day: 'Tue', saved: 1.8, efficiency: 82 },
  { day: 'Wed', saved: 3.2, efficiency: 91 },
  { day: 'Thu', saved: 1.5, efficiency: 75 },
  { day: 'Fri', saved: 2.1, efficiency: 88 },
  { day: 'Sat', saved: 0.8, efficiency: 94 },
  { day: 'Sun', saved: 1.2, efficiency: 85 },
];

const TRIP_LOG = [
  {
    id: 1,
    from: 'Home',
    to: 'Downtown Office',
    date: 'Today',
    time: '8:45 AM',
    distance: '12.3 mi',
    fuelSaved: '8%',
    timeSaved: '5 min',
    moneySaved: '$2.40',
    score: 92
  },
  {
    id: 2,
    from: 'Downtown Office',
    to: 'Grocery Store',
    date: 'Today',
    time: '6:20 PM',
    distance: '4.7 mi',
    fuelSaved: '12%',
    timeSaved: '3 min',
    moneySaved: '$1.80',
    score: 85
  },
  {
    id: 3,
    from: 'Grocery Store',
    to: 'Home',
    date: 'Today',
    time: '7:15 PM',
    distance: '8.9 mi',
    fuelSaved: '15%',
    timeSaved: '7 min',
    moneySaved: '$3.20',
    score: 98
  }
];

const STATS = [
  { label: 'Money Saved', value: '$42.80', icon: DollarSign, color: '#00FFD7', bg: 'bg-[#00FFD7]/10', trend: '+12%' },
  { label: 'Fuel Saved', value: '4.2 gal', icon: Fuel, color: '#0084FF', bg: 'bg-[#0084FF]/10', trend: '+8%' },
  { label: 'CO₂ Reduced', value: '38 kg', icon: Leaf, color: '#10B981', bg: 'bg-[#10B981]/10', trend: '+15%' },
  { label: 'Time Saved', value: '2.4 hrs', icon: Clock, color: '#F59E0B', bg: 'bg-[#F59E0B]/10', trend: '+5%' }
];

export function FuelDashboard({ onNavigate }: FuelDashboardProps) {
  const { theme } = useSnaproadTheme();
  const efficiencyScore = 87;
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('map');

  const handleTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'map') onNavigate('map');
    else if (tab === 'gems') onNavigate('gems');
    else if (tab === 'family') onNavigate('family');
    else if (tab === 'profile') onNavigate('profile');
  };

  return (
    <div className={`min-h-screen flex flex-col pb-24 ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Header - Responsive */}
      <header className={`sticky top-0 z-50 px-4 pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-6 flex items-center justify-between backdrop-blur-md border-b ${
        theme === 'dark' ? 'bg-[#0A0E16]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('profile')}
            className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            data-testid="fuel-back-btn"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Efficiency
            </h1>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
              Weekly performance
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Share2 size={18} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* Main Score Hero Card - Responsive */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #004A93 0%, #0084FF 100%)' }}
        >
          <div className="absolute -top-24 -right-24 w-48 sm:w-64 h-48 sm:h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 sm:w-64 h-48 sm:h-64 bg-[#00FFD7]/20 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Circular Progress */}
            <div className="relative w-36 h-36 sm:w-48 sm:h-48">
              <svg className="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="40%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                <motion.circle 
                  cx="50%" cy="50%" r="40%" 
                  fill="none" stroke="white" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - efficiencyScore/100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{ strokeDasharray: '251.2', strokeDashoffset: `${251.2 * (1 - efficiencyScore/100)}` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="text-4xl sm:text-5xl font-black">{efficiencyScore}</span>
                <span className="text-xs sm:text-sm font-medium opacity-80">ECO SCORE</span>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-3 sm:space-y-4 text-white text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                <Trophy size={14} className="text-[#FFD700]" />
                <span className="text-xs font-semibold">Top 5% in your city</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Excellent efficiency this week!</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                You've saved enough fuel to plant 3 trees and drive an extra 42 miles for free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <div className="flex-1 p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                  <div className="text-white/60 text-xs mb-1">Weekly Goal</div>
                  <div className="font-bold">85% Complete</div>
                </div>
                <div className="flex-1 p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                  <div className="text-white/60 text-xs mb-1">Est. Savings</div>
                  <div className="font-bold">+$12.40</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Grid Stats - Responsive 2x2 → 4x1 on larger screens */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STATS.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border flex flex-col gap-2 sm:gap-3 ${
                theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
                <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <div>
                <div className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {stat.value}
                </div>
                <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${
                  theme === 'dark' ? 'text-white/50' : 'text-slate-500'
                }`}>
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Chart - Responsive */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-[#0084FF]" />
              <h3 className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Savings Over Time
              </h3>
            </div>
            <select className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          <div className={`h-56 sm:h-64 w-full p-3 sm:p-4 rounded-2xl sm:rounded-3xl border ${
            theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FFD7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00FFD7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0084FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0084FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#6B7886' : '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#6B7886' : '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1A1F2E' : '#fff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E6ECF5',
                    borderRadius: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="saved" stroke="#00FFD7" strokeWidth={3} fillOpacity={1} fill="url(#colorSaved)" />
                <Area type="monotone" dataKey="efficiency" stroke="#0084FF" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent Trips - Responsive */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation size={20} className="text-[#10B981]" />
              <h3 className={`text-base sm:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Efficient Trips
              </h3>
            </div>
            <button className="text-sm font-semibold text-[#0084FF]">See all</button>
          </div>

          <div className="space-y-3">
            {TRIP_LOG.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`group p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all active:scale-[0.98] ${
                  theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 hover:bg-[#1A1F2E]/80' : 'bg-white border-slate-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border ${
                        theme === 'dark' ? 'bg-[#0A0E16] border-white/10' : 'bg-slate-100 border-slate-200'
                      }`}>
                        <MapPin size={14} className={theme === 'dark' ? 'text-white/50' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {trip.from} <span className={`font-normal px-1 ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>to</span> {trip.to}
                        </div>
                        <div className={`text-[10px] font-medium uppercase tracking-tighter ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                          {trip.date} • {trip.time}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {[
                        { label: 'Dist', value: trip.distance, color: theme === 'dark' ? 'text-white' : 'text-slate-900' },
                        { label: 'Fuel', value: trip.fuelSaved, color: 'text-[#10B981]' },
                        { label: 'Time', value: trip.timeSaved, color: 'text-[#0084FF]' },
                        { label: 'Saved', value: trip.moneySaved, color: 'text-[#F59E0B]' }
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <div className={`text-[10px] mb-0.5 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>{item.label}</div>
                          <div className={`text-[10px] sm:text-xs font-bold ${item.color}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 ${
                        trip.score > 90 ? 'border-[#10B981] bg-[#10B981]/10' : 'border-[#0084FF] bg-[#0084FF]/10'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-black ${trip.score > 90 ? 'text-[#10B981]' : 'text-[#0084FF]'}`}>
                        {trip.score}
                      </span>
                    </div>
                    <ChevronRight size={16} className={`group-hover:translate-x-1 transition-transform ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Eco Tip */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#10B981]/20 to-transparent border border-[#10B981]/30">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#10B981] flex items-center justify-center shadow-lg shadow-[#10B981]/30">
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Eco-Tip of the Day</h4>
              <p className={`text-xs sm:text-sm leading-relaxed ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                Maintain a steady speed of 45-55 mph for maximum fuel efficiency. Smooth acceleration saves up to 15% fuel.
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
