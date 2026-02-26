// SnapRoad - Enhanced Driver Analytics Dashboard
// Premium analytics view for drivers

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Shield,
  Zap,
  Target,
  Clock,
  MapPin,
  Fuel,
  Diamond,
  ChevronRight,
  Calendar,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Star,
  Trophy,
  Navigation,
  Car,
  Smartphone
} from 'lucide-react';

interface DriverAnalyticsProps {
  onNavigate: (screen: string) => void;
}

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface DrivingMetric {
  name: string;
  score: number;
  color: string;
  icon: React.ElementType;
  tip?: string;
}

export function DriverAnalytics({ onNavigate }: DriverAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const stats: StatCard[] = [
    { label: 'Safety Score', value: 94, change: 3, icon: Shield, color: '#00DFA2', trend: 'up' },
    { label: 'Total Miles', value: '1,247', change: 12, icon: MapPin, color: '#0084FF', trend: 'up' },
    { label: 'Gems Earned', value: '2,450', change: 8, icon: Diamond, color: '#9D4EDD', trend: 'up' },
    { label: 'Current Streak', value: '23 days', change: 0, icon: Zap, color: '#FFC24C', trend: 'neutral' },
  ];

  const drivingMetrics: DrivingMetric[] = [
    { name: 'Smooth Braking', score: 92, color: '#00DFA2', icon: Activity, tip: 'Excellent! Your braking is very smooth' },
    { name: 'Speed Control', score: 96, color: '#0084FF', icon: TrendingUp, tip: 'Great adherence to speed limits' },
    { name: 'Cornering', score: 88, color: '#FFC24C', icon: Navigation, tip: 'Try to take turns more gradually' },
    { name: 'Acceleration', score: 90, color: '#9D4EDD', icon: Zap, tip: 'Consistent and controlled acceleration' },
    { name: 'Phone Focus', score: 78, color: '#FF5A5A', icon: Smartphone, tip: 'Reduce phone handling while driving' },
    { name: 'Night Driving', score: 85, color: '#0084FF', icon: Clock, tip: 'Good awareness during night trips' },
  ];

  const weeklyData = [
    { day: 'Mon', score: 92, trips: 4, miles: 42 },
    { day: 'Tue', score: 88, trips: 3, miles: 28 },
    { day: 'Wed', score: 95, trips: 5, miles: 56 },
    { day: 'Thu', score: 91, trips: 4, miles: 38 },
    { day: 'Fri', score: 94, trips: 6, miles: 72 },
    { day: 'Sat', score: 97, trips: 2, miles: 24 },
    { day: 'Sun', score: 96, trips: 3, miles: 31 },
  ];

  const achievements = [
    { id: 1, name: 'Perfect Week', description: 'Maintain 90+ score for 7 days', progress: 5, total: 7, icon: Star, color: '#FFC24C' },
    { id: 2, name: 'Road Warrior', description: 'Drive 1000 miles safely', progress: 847, total: 1000, icon: Trophy, color: '#0084FF' },
    { id: 3, name: 'Eco Champion', description: 'Achieve 35+ MPG average', progress: 34, total: 35, icon: Fuel, color: '#00DFA2' },
  ];

  const recentTrips = [
    { id: 1, from: 'Home', to: 'Downtown Office', score: 97, gems: 45, time: '28 min', distance: '12.4 mi' },
    { id: 2, from: 'Coffee Shop', to: 'Home', score: 92, gems: 22, time: '15 min', distance: '5.8 mi' },
    { id: 3, from: 'Mall', to: 'Gas Station', score: 88, gems: 18, time: '12 min', distance: '4.2 mi' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#00DFA2';
    if (score >= 85) return '#0084FF';
    if (score >= 70) return '#FFC24C';
    return '#FF5A5A';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Excellent';
    if (score >= 85) return 'Great';
    if (score >= 70) return 'Good';
    return 'Needs Work';
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div 
        className="px-4 py-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #004A93 0%, #0084FF 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00DFA2]/10 rounded-full -ml-24 -mb-24 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-[24px] font-bold">Analytics</h1>
              <p className="text-white/70 text-[14px]">Your driving performance insights</p>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    timeRange === range
                      ? 'bg-white text-[#0084FF]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Main Score Display */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#00DFA2"
                    strokeWidth="12"
                    strokeDasharray={`${(94 / 100) * 352} 352`}
                    strokeLinecap="round"
                    className="drop-shadow-lg"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white text-[36px] font-bold">94</span>
                  <span className="text-[#00DFA2] text-[12px] font-semibold">Excellent</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-[12px] mb-1">This Week</p>
                  <p className="text-white text-[24px] font-bold">32 trips</p>
                </div>
                <div>
                  <p className="text-white/60 text-[12px] mb-1">Distance</p>
                  <p className="text-white text-[24px] font-bold">291 mi</p>
                </div>
                <div>
                  <p className="text-white/60 text-[12px] mb-1">Rank</p>
                  <p className="text-[#00DFA2] text-[24px] font-bold">#42</p>
                </div>
                <div>
                  <p className="text-white/60 text-[12px] mb-1">Improvement</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={18} className="text-[#00DFA2]" />
                    <p className="text-[#00DFA2] text-[24px] font-bold">+3%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl p-4 shadow-lg border"
              style={{ 
                backgroundColor: 'var(--bg-surface)', 
                borderColor: 'var(--bg-border)' 
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                {stat.change !== undefined && stat.change !== 0 && (
                  <div className={`flex items-center gap-1 text-[12px] font-semibold ${
                    stat.trend === 'up' ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'
                  }`}>
                    {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stat.change}%
                  </div>
                )}
              </div>
              <p className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Weekly Performance Chart */}
        <div 
          className="rounded-2xl p-5 mb-6 border shadow-lg"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>Weekly Performance</h3>
            <button className="flex items-center gap-1 text-[#0084FF] text-[13px] font-medium">
              Details <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((day, index) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full rounded-lg transition-all hover:opacity-80"
                  style={{ 
                    height: `${day.score}%`,
                    background: `linear-gradient(180deg, ${getScoreColor(day.score)} 0%, ${getScoreColor(day.score)}80 100%)`,
                  }}
                />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00DFA2]" />
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Excellent (95+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0084FF]" />
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Great (85-94)</span>
              </div>
            </div>
            <span className="text-[#00DFA2] font-semibold text-[14px]">Avg: 93</span>
          </div>
        </div>

        {/* Driving Behavior Analysis */}
        <div 
          className="rounded-2xl p-5 mb-6 border shadow-lg"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>Driving Behavior</h3>
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Last 7 days</span>
          </div>
          
          <div className="space-y-4">
            {drivingMetrics.map((metric) => (
              <div key={metric.name} className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${metric.color}20` }}
                >
                  <metric.icon size={18} style={{ color: metric.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[14px]" style={{ color: 'var(--text-primary)' }}>
                      {metric.name}
                    </span>
                    <span className="font-bold text-[16px]" style={{ color: metric.color }}>
                      {metric.score}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.score}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                  </div>
                  {metric.tip && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{metric.tip}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievement Progress */}
        <div 
          className="rounded-2xl p-5 mb-6 border shadow-lg"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>
              Achievements In Progress
            </h3>
            <button 
              onClick={() => onNavigate('badges')}
              className="flex items-center gap-1 text-[#0084FF] text-[13px] font-medium"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            {achievements.map((achievement) => {
              const progress = (achievement.progress / achievement.total) * 100;
              return (
                <div 
                  key={achievement.id} 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${achievement.color}20` }}
                    >
                      <achievement.icon size={24} style={{ color: achievement.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{achievement.name}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{achievement.description}</p>
                    </div>
                    <span className="font-bold" style={{ color: achievement.color }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: achievement.color }}
                    />
                  </div>
                  <p className="text-[11px] mt-2 text-right" style={{ color: 'var(--text-muted)' }}>
                    {achievement.progress} / {achievement.total}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Trips */}
        <div 
          className="rounded-2xl p-5 border shadow-lg"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>Recent Trips</h3>
            <button 
              onClick={() => onNavigate('trip-logs')}
              className="flex items-center gap-1 text-[#0084FF] text-[13px] font-medium"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentTrips.map((trip) => (
              <div 
                key={trip.id}
                className="p-4 rounded-xl flex items-center gap-4"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${getScoreColor(trip.score)}20` }}
                >
                  <Car size={20} style={{ color: getScoreColor(trip.score) }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trip.from}</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trip.to}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <span>{trip.distance}</span>
                    <span>•</span>
                    <span>{trip.time}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Diamond size={12} className="text-[#9D4EDD]" />
                      <span>+{trip.gems}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div 
                    className="text-[20px] font-bold"
                    style={{ color: getScoreColor(trip.score) }}
                  >
                    {trip.score}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {getScoreLabel(trip.score)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverAnalytics;
