import { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Camera, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface AccountInfoProps {
  onNavigate: (screen: string) => void;
}

const INFO_ITEMS = [
  { label: 'Full Name', value: 'John Doe', icon: User },
  { label: 'Email Address', value: 'john.d@snaproad.app', icon: Mail },
  { label: 'Phone Number', value: '+1 (555) 123-4567', icon: Phone },
  { label: 'Location', value: 'Columbus, Ohio', icon: MapPin },
  { label: 'Member Since', value: 'October 2024', icon: Calendar }
];

export function AccountInfo({ onNavigate }: AccountInfoProps) {
  const { theme } = useSnaproadTheme();

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Header */}
      <div className={`pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-20 backdrop-blur-xl border-b ${
        theme === 'dark' ? 'bg-[#0A0E16]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => onNavigate('profile')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            data-testid="account-info-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Account Info
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-gradient-to-br from-[#0084FF] to-[#00DFA2] p-1 shadow-2xl">
                <div className={`w-full h-full rounded-[1.8rem] flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#1A1F26]' : 'bg-white'
                }`}>
                  <span className="text-[32px] sm:text-[40px] font-black bg-gradient-to-br from-[#0084FF] to-[#00DFA2] bg-clip-text text-transparent">
                    JD
                  </span>
                </div>
              </div>
              <button className={`absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0084FF] text-white flex items-center justify-center shadow-lg border-4 ${
                theme === 'dark' ? 'border-[#1A1F26]' : 'border-white'
              }`}>
                <Camera size={16} />
              </button>
            </div>
            <h2 className={`text-xl sm:text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              John Doe
            </h2>
            <span className="text-[#0084FF] text-xs sm:text-sm font-black uppercase tracking-widest">Verified Driver</span>
          </div>

          {/* Details List */}
          <div className="space-y-3">
            {INFO_ITEMS.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-2xl sm:rounded-3xl border flex items-center gap-4 ${
                  theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-white/5 text-white/50' : 'bg-slate-100 text-slate-500'
                }`}>
                  <item.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
                    theme === 'dark' ? 'text-white/40' : 'text-slate-400'
                  }`}>
                    {item.label}
                  </p>
                  <p className={`text-sm sm:text-base font-black truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {item.value}
                  </p>
                </div>
                <button className="text-[#0084FF] text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  Edit
                </button>
              </motion.div>
            ))}
          </div>

          {/* Security Summary */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#00DFA2]/10 border border-[#00DFA2]/20 flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#00DFA2] flex items-center justify-center text-white shadow-lg shadow-[#00DFA2]/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-[#00DFA2] text-sm sm:text-base font-black">Identity Verified</h4>
              <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                Your account is secured with 2FA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
