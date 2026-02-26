import { MapPin, Phone, ChevronRight, Shield, Clock, Battery, Users, Sparkles, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';
import { BottomNav } from './BottomNav';
import { useState } from 'react';

interface LiveLocationsProps {
  onNavigate: (screen: string) => void;
}

const FAMILY_MEMBERS = [
  {
    id: 1,
    name: 'Sarah Wilson',
    avatar: '👩',
    status: 'driving',
    location: 'Downtown',
    distance: '2.3 mi away',
    speed: 35,
    battery: 78,
    lastUpdate: '2 min ago',
    color: '#0A84FF',
  },
  {
    id: 2,
    name: 'Michael Wilson',
    avatar: '👨',
    status: 'arrived',
    location: 'Westside Mall',
    distance: '5.8 mi away',
    speed: 0,
    battery: 92,
    lastUpdate: '5 min ago',
    color: '#27D79F',
  },
  {
    id: 3,
    name: 'Emma Wilson',
    avatar: '👧',
    status: 'idle',
    location: 'Lincoln High School',
    distance: '1.2 mi away',
    speed: 0,
    battery: 45,
    lastUpdate: '15 min ago',
    color: '#FFB800',
  },
];

export function LiveLocations({ onNavigate }: LiveLocationsProps) {
  const { theme } = useSnaproadTheme();
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('family');

  const handleTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'map') onNavigate('map');
    else if (tab === 'gems') onNavigate('gems');
    else if (tab === 'profile') onNavigate('profile');
    else setActiveTab(tab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'driving': return '#0A84FF';
      case 'arrived': return '#27D79F';
      case 'idle': return '#98989D';
      default: return '#6E6E73';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'driving': return 'Driving';
      case 'arrived': return 'Arrived';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`min-h-screen pb-24 relative ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Coming Soon Banner */}
      <div className="sticky top-0 z-50 px-4 py-2 flex justify-center pointer-events-none">
        <div className="bg-[#0084FF] text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce border-2 border-white/20">
          <Sparkles size={14} className="fill-white" />
          <span className="text-xs font-black uppercase tracking-widest">Coming Soon</span>
        </div>
      </div>

      {/* Header - Responsive */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className={`text-xl sm:text-2xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Live Locations
            </h1>
            <button 
              className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${
                theme === 'dark' ? 'bg-[#1A1F2E]' : 'bg-white border border-slate-200'
              }`}
            >
              <Shield size={20} className="text-[#0A84FF]" />
            </button>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
            Track your family members in real-time
          </p>
        </div>
      </div>

      {/* View Toggle - Responsive */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className={`flex gap-2 p-1 rounded-xl ${theme === 'dark' ? 'bg-[#1A1F2E]' : 'bg-slate-100'}`}>
            <button className="flex-1 h-10 rounded-lg bg-[#0A84FF] text-white text-sm font-medium">
              List View
            </button>
            <button className={`flex-1 h-10 rounded-lg text-sm font-medium active:scale-95 transition-transform ${
              theme === 'dark' ? 'text-white/50' : 'text-slate-500'
            }`}>
              Map View
            </button>
          </div>
        </div>
      </div>

      {/* Family Members List - Responsive Grid */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FAMILY_MEMBERS.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer ${
                theme === 'dark' ? 'bg-[#1A1F2E]' : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar with Status Ring */}
                <div className="relative shrink-0">
                  <div 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl"
                    style={{ background: `linear-gradient(135deg, ${member.color} 0%, ${member.color}80 100%)` }}
                  >
                    {member.avatar}
                  </div>
                  <div 
                    className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full ${
                      theme === 'dark' ? 'border-[#1A1F2E]' : 'border-white'
                    }`}
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={`text-sm sm:text-base font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {member.name}
                    </h3>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium"
                      style={{ 
                        backgroundColor: `${getStatusColor(member.status)}20`,
                        color: getStatusColor(member.status)
                      }}
                    >
                      {getStatusLabel(member.status)}
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-1 mb-2 text-xs ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                    <MapPin size={14} />
                    <span className="truncate">{member.location} • {member.distance}</span>
                  </div>

                  {/* Stats Row */}
                  <div className={`flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                    {member.speed > 0 && (
                      <div className="flex items-center gap-1">
                        <Navigation size={12} />
                        <span>{member.speed} mph</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Battery size={12} />
                      <span>{member.battery}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{member.lastUpdate}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={16} className="text-[#0A84FF]" />
                  </button>
                  <button 
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronRight size={18} className={theme === 'dark' ? 'text-white/40' : 'text-slate-400'} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Member Button */}
      <div className="px-4 sm:px-6 lg:px-8 mt-6">
        <div className="max-w-4xl mx-auto">
          <button 
            className={`w-full h-12 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-sm font-medium ${
              theme === 'dark' ? 'border-white/20 text-white/50' : 'border-slate-300 text-slate-500'
            }`}
          >
            <Users size={20} />
            Add Family Member
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="px-4 sm:px-6 lg:px-8 mt-6">
        <div className="max-w-4xl mx-auto bg-[#0A84FF]/10 rounded-2xl p-4 border border-[#0A84FF]/20">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-[#0A84FF] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-[#0A84FF] font-semibold mb-1 text-sm">
                Privacy First
              </h4>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                All family members can enable Privacy Mode at any time. Location data is end-to-end encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
