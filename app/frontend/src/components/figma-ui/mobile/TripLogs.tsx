import { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Navigation, 
  Shield, 
  Clock, 
  ChevronRight, 
  Filter, 
  TrendingUp 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';
import { GemIcon } from '../primitives/GemIcon';

interface TripLogsProps {
  onNavigate: (screen: string) => void;
}

interface Trip {
  id: string;
  date: string;
  time: string;
  startLocation: string;
  endLocation: string;
  distance: string;
  duration: string;
  safetyScore: number;
  gemsEarned: number;
  isShared?: boolean;
  userName?: string;
  avatarColor?: string;
}

const USER_TRIPS: Trip[] = [
  {
    id: 't1',
    date: 'Dec 30, 2025',
    time: '08:15 AM - 08:45 AM',
    startLocation: 'Home (Oak Street)',
    endLocation: 'Work (Design District)',
    distance: '8.4 miles',
    duration: '30 min',
    safetyScore: 98,
    gemsEarned: 45,
  },
  {
    id: 't2',
    date: 'Dec 29, 2025',
    time: '05:30 PM - 06:15 PM',
    startLocation: 'Work (Design District)',
    endLocation: 'Home (Oak Street)',
    distance: '9.1 miles',
    duration: '45 min',
    safetyScore: 92,
    gemsEarned: 38,
  },
  {
    id: 't3',
    date: 'Dec 29, 2025',
    time: '12:10 PM - 12:40 PM',
    startLocation: 'Home (Oak Street)',
    endLocation: 'Central Market',
    distance: '3.2 miles',
    duration: '12 min',
    safetyScore: 100,
    gemsEarned: 25,
  }
];

const SHARED_TRIPS: Trip[] = [
  {
    id: 'st1',
    userName: 'Marcus Chen',
    avatarColor: 'bg-blue-500',
    date: 'Dec 30, 2025',
    time: '10:00 AM',
    startLocation: 'The Heights',
    endLocation: 'Downtown',
    distance: '12.2 miles',
    duration: '22 min',
    safetyScore: 99,
    gemsEarned: 62,
    isShared: true,
  },
  {
    id: 'st2',
    userName: 'Elena Rodriguez',
    avatarColor: 'bg-purple-500',
    date: 'Dec 29, 2025',
    time: '09:15 PM',
    startLocation: 'Sunset Blvd',
    endLocation: 'Airport (LAX)',
    distance: '18.5 miles',
    duration: '40 min',
    safetyScore: 85,
    gemsEarned: 55,
    isShared: true,
  }
];

export function TripLogs({ onNavigate }: TripLogsProps) {
  const { theme } = useSnaproadTheme();
  const [activeTab, setActiveTab] = useState<'my-trips' | 'shared'>('my-trips');

  const tripsToDisplay = activeTab === 'my-trips' ? USER_TRIPS : SHARED_TRIPS;

  const getScoreColor = (score: number) => {
    if (score > 95) return 'text-[#00DFA2]';
    if (score > 85) return 'text-[#FFC24C]';
    return 'text-[#FF6B6B]';
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Header - Responsive */}
      <div className={`pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-20 backdrop-blur-xl border-b ${
        theme === 'dark' ? 'bg-[#0A0E16]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button 
              onClick={() => onNavigate('profile')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors border ${
                theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'
              }`}
              data-testid="trip-logs-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Trip Logs
            </h1>
            <button 
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Custom Tabs - Responsive */}
          <div className={`flex p-1 rounded-2xl border ${
            theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('my-trips')}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'my-trips' 
                  ? 'bg-[#0084FF] text-white shadow-lg' 
                  : theme === 'dark' ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="tab-my-trips"
            >
              My Journeys
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'shared' 
                  ? 'bg-[#0084FF] text-white shadow-lg' 
                  : theme === 'dark' ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="tab-shared"
            >
              Shared With Me
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 overflow-y-auto pb-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Analytics Card (My Trips only) */}
          {activeTab === 'my-trips' && (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-[#0084FF]/20 to-transparent relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-[#0084FF]" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#0084FF]">Performance Insights</span>
                </div>
                <h3 className={`text-lg sm:text-xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  96.5 Avg Score
                </h3>
                <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                  Your safety score improved by 4% this week. Keep up the steady braking!
                </p>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#0084FF]/10 rounded-full blur-3xl" />
            </div>
          )}

          {/* Trip Cards - Responsive Grid for larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tripsToDisplay.map((trip, idx) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-2xl sm:rounded-3xl border shadow-xl group active:scale-[0.98] transition-all ${
                  theme === 'dark' ? 'bg-[#1A1F2E] border-white/5' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    {trip.isShared ? (
                      <div className={`w-10 h-10 rounded-xl ${trip.avatarColor} flex items-center justify-center text-white text-sm font-black`}>
                        {trip.userName?.split(' ').map(n => n[0]).join('')}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0084FF]/10 flex items-center justify-center text-[#0084FF]">
                        <Navigation size={20} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {trip.isShared ? trip.userName : `Trip #${trip.id.replace('t', '')}`}
                        </span>
                        {trip.isShared && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#00DFA2]/10 text-[#00DFA2] text-[9px] font-black uppercase">Shared</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white/50' : 'text-slate-400'}`}>{trip.date}</span>
                        <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-white/30' : 'bg-slate-300'}`} />
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white/50' : 'text-slate-400'}`}>{trip.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <Shield size={14} className={getScoreColor(trip.safetyScore)} />
                      <span className={`text-base sm:text-lg font-black ${getScoreColor(trip.safetyScore)}`}>
                        {trip.safetyScore}
                      </span>
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                      Safety Score
                    </span>
                  </div>
                </div>

                {/* Route Timeline */}
                <div className="relative pl-5 sm:pl-6 space-y-3 sm:space-y-4 mb-3 sm:mb-4">
                  <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#0084FF] to-[#00DFA2]/30" />
                  <div className="relative">
                    <div className={`absolute -left-[18px] sm:-left-[23px] top-1.5 w-2 h-2 rounded-full border-2 border-[#0084FF] ${
                      theme === 'dark' ? 'bg-[#1A1F2E]' : 'bg-white'
                    }`} />
                    <p className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{trip.startLocation}</p>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-400'}`}>Departure Point</p>
                  </div>
                  <div className="relative">
                    <div className={`absolute -left-[18px] sm:-left-[23px] top-1.5 w-2 h-2 rounded-full border-2 border-[#00DFA2] ${
                      theme === 'dark' ? 'bg-[#1A1F2E]' : 'bg-white'
                    }`} />
                    <p className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{trip.endLocation}</p>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-400'}`}>Destination Reached</p>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className={`flex items-center justify-between pt-3 sm:pt-4 border-t ${
                  theme === 'dark' ? 'border-white/5' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col">
                      <span className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{trip.distance}</span>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>Distance</span>
                    </div>
                    <div className={`w-[1px] h-6 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className="flex flex-col">
                      <span className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{trip.duration}</span>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>Duration</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00DFA2]/10">
                    <GemIcon size={14} />
                    <span className="text-[#00DFA2] text-xs sm:text-sm font-black">+{trip.gemsEarned}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-4 text-center">
            <p className={`text-xs font-bold ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
              {activeTab === 'my-trips' ? 'Showing your last 30 days of activity' : 'Showing shared trips from your Inner Circle'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
