import { useState } from 'react';
import { 
  ChevronLeft, 
  Trophy, 
  Award, 
  Star, 
  Shield, 
  Crown, 
  Medal, 
  Globe, 
  ChevronDown,
  Diamond
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface LeaderboardProps {
  onNavigate: (screen: string) => void;
}

interface Driver {
  id: number;
  name: string;
  gems: number;
  safetyScore: number;
  carModel: string;
  weeklyGems: number;
  safetyStreak: number;
  badges: number;
  milesDriven: number;
  fuelSaved: string;
}

const OHIO_DRIVERS: Driver[] = [
  { id: 1, name: 'Sarah M.', gems: 12450, safetyScore: 98, carModel: 'Tesla Model 3', weeklyGems: 850, safetyStreak: 47, badges: 12, milesDriven: 3420, fuelSaved: '18%' },
  { id: 2, name: 'Marcus J.', gems: 11890, safetyScore: 96, carModel: 'Honda Civic', weeklyGems: 720, safetyStreak: 38, badges: 10, milesDriven: 2980, fuelSaved: '15%' },
  { id: 3, name: 'Jessica R.', gems: 10230, safetyScore: 94, carModel: 'Toyota Camry', weeklyGems: 680, safetyStreak: 29, badges: 9, milesDriven: 2650, fuelSaved: '14%' },
  { id: 4, name: 'David K.', gems: 9870, safetyScore: 92, carModel: 'Ford Mustang', weeklyGems: 640, safetyStreak: 24, badges: 8, milesDriven: 2340, fuelSaved: '12%' },
  { id: 5, name: 'Emily T.', gems: 8920, safetyScore: 95, carModel: 'Mazda CX-5', weeklyGems: 590, safetyStreak: 31, badges: 7, milesDriven: 2120, fuelSaved: '13%' },
  { id: 6, name: 'Chris P.', gems: 8450, safetyScore: 91, carModel: 'Subaru Outback', weeklyGems: 550, safetyStreak: 19, badges: 6, milesDriven: 1980, fuelSaved: '11%' },
];

const GLOBAL_DRIVERS: Driver[] = [
  { id: 101, name: 'Alex Chen', gems: 24680, safetyScore: 99, carModel: 'Tesla Model S', weeklyGems: 1820, safetyStreak: 89, badges: 24, milesDriven: 8940, fuelSaved: '22%' },
  { id: 102, name: 'Maria Garcia', gems: 22150, safetyScore: 98, carModel: 'BMW i4', weeklyGems: 1650, safetyStreak: 76, badges: 22, milesDriven: 7850, fuelSaved: '21%' },
  { id: 103, name: 'James W.', gems: 19870, safetyScore: 97, carModel: 'Audi e-tron', weeklyGems: 1480, safetyStreak: 68, badges: 20, milesDriven: 7120, fuelSaved: '20%' },
  { id: 104, name: 'Priya P.', gems: 18340, safetyScore: 97, carModel: 'Rivian R1T', weeklyGems: 1390, safetyStreak: 64, badges: 19, milesDriven: 6780, fuelSaved: '19%' },
  { id: 105, name: 'Michael B.', gems: 16920, safetyScore: 96, carModel: 'Porsche Taycan', weeklyGems: 1280, safetyStreak: 59, badges: 18, milesDriven: 6340, fuelSaved: '18%' },
  { id: 106, name: 'Yuki T.', gems: 15480, safetyScore: 96, carModel: 'Nissan Ariya', weeklyGems: 1180, safetyStreak: 55, badges: 17, milesDriven: 5890, fuelSaved: '17%' },
];

const FAMILY_DRIVERS: Driver[] = [
  { id: 201, name: 'You', gems: 8920, safetyScore: 95, carModel: 'Mazda CX-5', weeklyGems: 590, safetyStreak: 31, badges: 7, milesDriven: 2120, fuelSaved: '13%' },
  { id: 202, name: 'Mom', gems: 7240, safetyScore: 94, carModel: 'Toyota RAV4', weeklyGems: 480, safetyStreak: 42, badges: 8, milesDriven: 1890, fuelSaved: '14%' },
  { id: 203, name: 'Dad', gems: 6580, safetyScore: 91, carModel: 'Ford F-150', weeklyGems: 420, safetyStreak: 28, badges: 6, milesDriven: 1750, fuelSaved: '10%' },
  { id: 204, name: 'Alex', gems: 5890, safetyScore: 89, carModel: 'Jeep Wrangler', weeklyGems: 380, safetyStreak: 18, badges: 5, milesDriven: 1580, fuelSaved: '9%' },
  { id: 205, name: 'Emma', gems: 5120, safetyScore: 93, carModel: 'Honda Accord', weeklyGems: 340, safetyStreak: 22, badges: 5, milesDriven: 1420, fuelSaved: '12%' },
];

export function Leaderboard({ onNavigate }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'ohio' | 'friends'>('ohio');
  const [expandedDriver, setExpandedDriver] = useState<number | null>(null);
  const { theme } = useSnaproadTheme();

  const LEADERBOARD_DATA: { [key: string]: Driver[] } = {
    global: GLOBAL_DRIVERS,
    ohio: OHIO_DRIVERS,
    friends: FAMILY_DRIVERS
  };

  const currentLeaderboard = LEADERBOARD_DATA[activeTab];
  const drivers = [...currentLeaderboard].sort((a, b) => b.safetyScore - a.safetyScore || b.gems - a.gems);
  const topDrivers = drivers.slice(0, 3);
  const otherDrivers = drivers.slice(3);

  const CarAvatar = ({ rank, size = 'md' }: { rank?: number; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' };
    const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
    
    return (
      <div className={`relative ${sizeClasses[size]} rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center text-white font-black ${textSizes[size]}`}>
        🚗
        {rank && rank <= 3 && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black border-2 border-white flex items-center justify-center shadow-lg">
            {rank === 1 ? <Crown size={12} className="text-[#FFD700] fill-[#FFD700]" /> : 
             rank === 2 ? <Medal size={12} className="text-[#C0C0C0] fill-[#C0C0C0]" /> : 
             <Medal size={12} className="text-[#CD7F32] fill-[#CD7F32]" />}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F8FAFC]'
    }`}>
      {/* Background Ambient Glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none ${
        theme === 'dark' ? 'bg-[#0084FF]/20' : 'bg-[#0084FF]/10'
      }`} />

      {/* Header - Responsive */}
      <div className={`sticky top-0 z-50 backdrop-blur-2xl border-b px-4 sm:px-6 lg:px-8 py-3 sm:py-4 pt-6 sm:pt-8 transition-colors ${
        theme === 'dark' ? 'bg-[#0A0E16]/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => onNavigate('profile')}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-90 transition-all ${
                theme === 'dark' ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}
              data-testid="leaderboard-back-btn"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <Trophy className="text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]" size={18} />
                <h1 className={`text-sm sm:text-base lg:text-lg font-black uppercase tracking-widest ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Hall of Fame</h1>
              </div>
              <span className="text-[#0084FF] text-[10px] font-black uppercase tracking-widest mt-0.5">
                {activeTab === 'ohio' ? 'Ohio Division' : activeTab === 'global' ? 'World Series' : 'Inner Circle'}
              </span>
            </div>

            <button className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-90 transition-all ${
              theme === 'dark' ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}>
              <Globe size={18} />
            </button>
          </div>

          {/* Tab Picker - Responsive */}
          <div className={`mt-4 sm:mt-6 flex p-1.5 rounded-2xl border transition-colors ${
            theme === 'dark' ? 'bg-black/40 border-white/10 shadow-inner' : 'bg-slate-100 border-slate-200 shadow-sm'
          }`}>
            {['global', 'ohio', 'friends'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'global' | 'ohio' | 'friends')}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab 
                  ? 'bg-[#0084FF] text-white shadow-lg' 
                  : theme === 'dark' ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid={`leaderboard-tab-${tab}`}
              >
                {tab === 'friends' ? 'Circle' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* TOP 3 PODIUM - Responsive */}
          <div className="py-8 sm:py-12 relative">
            <div className="flex items-end justify-center gap-2 sm:gap-4 h-48 sm:h-56">
              {/* Rank 2 */}
              <div className="flex flex-col items-center flex-1 max-w-[120px] sm:max-w-[140px]">
                <div className="mb-2 sm:mb-3">
                  <CarAvatar rank={2} size="md" />
                </div>
                <div className={`w-full border rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center h-24 sm:h-32 flex flex-col justify-end shadow-xl border-b-4 ${
                  theme === 'dark' 
                  ? 'bg-[#1A1F26] border-white/10 border-b-[#C0C0C0]/30' 
                  : 'bg-white border-slate-200 border-b-[#C0C0C0]'
                }`}>
                  <p className={`text-xs sm:text-sm font-black leading-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {topDrivers[1]?.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Shield size={10} className="text-[#0084FF]" />
                    <span className="text-[#0084FF] text-xs sm:text-sm font-black">{topDrivers[1]?.safetyScore}</span>
                  </div>
                  <div className={`mt-1 sm:mt-2 font-black text-base sm:text-lg tracking-tighter ${theme === 'dark' ? 'text-[#C0C0C0]' : 'text-slate-400'}`}>2ND</div>
                </div>
              </div>

              {/* Rank 1 */}
              <div className="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[160px] -mb-4 sm:-mb-6 z-10 scale-105 sm:scale-110">
                <div className="mb-2 sm:mb-3 relative">
                  <Crown size={24} className="text-[#FFD700] absolute -top-8 left-1/2 -translate-x-1/2 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] fill-[#FFD700]/20" />
                  <CarAvatar rank={1} size="lg" />
                </div>
                <div className={`w-full border rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center h-32 sm:h-44 flex flex-col justify-end shadow-2xl border-b-4 relative overflow-hidden ${
                  theme === 'dark' 
                  ? 'bg-gradient-to-t from-[#1A1F26] to-[#2A3441] border-[#FFD700]/30 border-b-[#FFD700]' 
                  : 'bg-white border-slate-200 border-b-[#FFD700]'
                }`}>
                  <p className={`text-sm sm:text-base font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {topDrivers[0]?.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Shield size={12} className="text-[#0084FF]" />
                    <span className="text-[#0084FF] text-sm sm:text-base font-black">{topDrivers[0]?.safetyScore}</span>
                  </div>
                  <div className="mt-1 sm:mt-2 text-[#FFD700] font-black text-2xl sm:text-4xl tracking-tighter drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]">1ST</div>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="flex flex-col items-center flex-1 max-w-[120px] sm:max-w-[140px]">
                <div className="mb-2 sm:mb-3">
                  <CarAvatar rank={3} size="md" />
                </div>
                <div className={`w-full border rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center h-20 sm:h-28 flex flex-col justify-end shadow-xl border-b-4 ${
                  theme === 'dark' 
                  ? 'bg-[#1A1F26] border-white/10 border-b-[#CD7F32]/30' 
                  : 'bg-white border-slate-200 border-b-[#CD7F32]'
                }`}>
                  <p className={`text-xs sm:text-sm font-black leading-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {topDrivers[2]?.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Shield size={10} className="text-[#0084FF]" />
                    <span className="text-[#0084FF] text-xs sm:text-sm font-black">{topDrivers[2]?.safetyScore}</span>
                  </div>
                  <div className={`mt-1 sm:mt-2 font-black text-base sm:text-lg tracking-tighter ${theme === 'dark' ? 'text-[#CD7F32]' : 'text-slate-400'}`}>3RD</div>
                </div>
              </div>
            </div>
          </div>

          {/* PRO TIP */}
          <div className={`mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xl relative overflow-hidden transition-colors ${
            theme === 'dark' ? 'bg-[#1A1F26] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-3 sm:gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#00DFA2]/20 flex items-center justify-center border border-[#00DFA2]/30 flex-shrink-0">
                <Shield size={20} className="text-[#00DFA2]" />
              </div>
              <p className={`text-xs sm:text-sm font-bold leading-relaxed ${theme === 'dark' ? 'text-white/80' : 'text-slate-600'}`}>
                <span className="text-[#00DFA2] font-black uppercase tracking-widest mr-2">Hall of Fame:</span> 
                Drivers are ranked by <span className="font-black text-[#0084FF]">Safety Score</span>. Safe driving is the ultimate status symbol.
              </p>
            </div>
          </div>

          {/* Driver List */}
          <div className="pb-24 sm:pb-32 space-y-3 sm:space-y-4">
            {otherDrivers.map((driver, index) => {
              const rank = index + 4;
              const isExpanded = expandedDriver === driver.id;

              return (
                <div key={driver.id} className="group relative">
                  <button
                    onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
                    className={`w-full p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-300 flex items-center gap-3 sm:gap-4 active:scale-[0.98] shadow-lg relative z-10 ${
                      isExpanded 
                      ? theme === 'dark' ? 'bg-[#1A1F26] border-[#0084FF]' : 'bg-white border-[#0084FF]'
                      : theme === 'dark' ? 'bg-[#121820] border-white/5' : 'bg-white border-slate-200'
                    }`}
                    data-testid={`driver-row-${driver.id}`}
                  >
                    <div className={`w-6 sm:w-8 text-sm sm:text-base font-black italic ${
                      isExpanded ? 'text-[#0084FF]' : theme === 'dark' ? 'text-white/20' : 'text-slate-300'
                    }`}>
                      {rank}
                    </div>

                    <CarAvatar size="sm" />

                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm sm:text-base font-black mb-1 tracking-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {driver.name}
                      </p>
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Diamond size={12} className="text-[#00DFA2]" />
                          <span className="text-[#00DFA2] text-xs sm:text-sm font-black">{driver.gems.toLocaleString()}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                          theme === 'dark' ? 'bg-white/5 border-white/5 text-white/50' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                          <Shield size={10} className="text-[#0084FF]" />
                          <span className="text-[10px] sm:text-xs font-black">{driver.safetyScore}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isExpanded ? 'bg-[#0084FF] text-white rotate-180' : theme === 'dark' ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-2 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-4 sm:space-y-6 ${
                          theme === 'dark' ? 'bg-[#1A1F26] border-white/10' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Vehicle</p>
                              <p className={`text-sm sm:text-base font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{driver.carModel}</p>
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-[#00DFA2]/10 border border-[#00DFA2]/20 text-center sm:text-right">
                              <p className="text-[#00DFA2]/60 text-[10px] font-black uppercase tracking-widest">Efficiency</p>
                              <p className="text-[#00DFA2] text-sm sm:text-base font-black italic">{driver.fuelSaved}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {[
                              { label: 'Weekly', value: `+${driver.weeklyGems}`, icon: Diamond, color: '#00DFA2' },
                              { label: 'Streak', value: `${driver.safetyStreak}d`, icon: Star, color: '#FFD700' },
                              { label: 'Badges', value: driver.badges, icon: Award, color: '#0084FF' }
                            ].map((stat) => (
                              <div key={stat.label} className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center ${
                                theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: `${stat.color}60` }}>
                                  <stat.icon size={12} />
                                  <p className="text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
                                </div>
                                <p className={`text-sm sm:text-base font-black italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className={`pt-4 sm:pt-6 border-t flex items-center justify-between ${
                            theme === 'dark' ? 'border-white/5' : 'border-slate-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                              }`}>
                                <Globe size={16} className={theme === 'dark' ? 'text-white/30' : 'text-slate-400'} />
                              </div>
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'}`}>Lifetime</p>
                                <p className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>{driver.milesDriven.toLocaleString()} mi</p>
                              </div>
                            </div>
                            <button className="h-10 px-4 sm:px-6 rounded-xl bg-[#0084FF] text-white text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                              View Profile
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
