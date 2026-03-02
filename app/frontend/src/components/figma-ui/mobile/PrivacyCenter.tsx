import { useState } from 'react';
import { ArrowLeft, Shield, Eye, Lock, Share2, FileLock, UserMinus, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface PrivacyCenterProps {
  onNavigate: (screen: string) => void;
}

export function PrivacyCenter({ onNavigate }: PrivacyCenterProps) {
  const { theme } = useSnaproadTheme();
  
  const [settings, setSettings] = useState({
    incognito: false,
    shareLogs: true,
    telemetry: true,
    localCache: true
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
            data-testid="privacy-center-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Privacy Center
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* Protection Banner */}
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0084FF] to-[#004A93] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <Shield size={32} className="mb-4 text-[#00DFA2]" />
              <h3 className="text-xl sm:text-2xl font-black mb-2">Privacy is Priority</h3>
              <p className="text-sm sm:text-base font-medium opacity-80 leading-relaxed">
                Your location data is encrypted end-to-end. We never sell your personal information to third parties.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          </div>

          {/* Visibility Controls */}
          <section>
            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2 ${
              theme === 'dark' ? 'text-white/40' : 'text-slate-400'
            }`}>
              Visibility
            </h3>
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <button 
                onClick={() => toggle('incognito')}
                className={`w-full p-4 sm:p-5 flex items-center justify-between border-b ${
                  theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Incognito Mode
                    </h4>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                      Hide from Inner Circle members
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors relative ${
                  settings.incognito ? 'bg-purple-500' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
                }`}>
                  <motion.div 
                    animate={{ x: settings.incognito ? 26 : 2 }}
                    className="absolute top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-sm"
                  />
                </div>
              </button>
              <button 
                onClick={() => toggle('shareLogs')}
                className="w-full p-4 sm:p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#00DFA2]/10 text-[#00DFA2] flex items-center justify-center">
                    <Share2 size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Share Trip Stats
                    </h4>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                      Allow friends to see your safety scores
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors relative ${
                  settings.shareLogs ? 'bg-[#00DFA2]' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
                }`}>
                  <motion.div 
                    animate={{ x: settings.shareLogs ? 26 : 2 }}
                    className="absolute top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-sm"
                  />
                </div>
              </button>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2 ${
              theme === 'dark' ? 'text-white/40' : 'text-slate-400'
            }`}>
              Data Management
            </h3>
            <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <button className={`w-full p-4 sm:p-5 flex items-center justify-between border-b ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <FileLock size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Download My Data
                    </h4>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                      Get a copy of your trip history (.json)
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className={theme === 'dark' ? 'text-white/30' : 'text-slate-400'} />
              </button>
              <button className="w-full p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <UserMinus size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-red-500 text-sm sm:text-base font-black">Delete Account</h4>
                    <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                      Permanently remove all your data
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-red-500/50" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
