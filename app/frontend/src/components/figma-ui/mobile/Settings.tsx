import { useState } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  Map, 
  Bell, 
  Shield, 
  Zap, 
  Smartphone, 
  ChevronRight, 
  Volume2, 
  Eye, 
  Navigation, 
  Database,
  Moon,
  Sun
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

const SETTING_GROUPS = [
  {
    title: 'Navigation & Map',
    items: [
      { id: 'units', icon: Map, label: 'Distance Units', value: 'Miles (mi)', desc: 'Imperial units for navigation' },
      { id: 'rerouting', icon: Navigation, label: 'Auto-Rerouting', value: 'Optimized', desc: 'Saves 4.2 mins on average' },
      { id: 'voice', icon: Volume2, label: 'Voice Guidance', value: 'Alex (Premium)', desc: 'High-fidelity natural voice' }
    ]
  },
  {
    title: 'Preferences',
    items: [
      { id: 'language', icon: Globe, label: 'App Language', value: 'English (US)', desc: 'System-wide translation' },
      { id: 'notifications', icon: Bell, label: 'Smart Alerts', value: 'Enabled', desc: 'Critical safety & reward alerts' },
      { id: 'privacy', icon: Eye, label: 'Stealth Mode', value: 'Disabled', desc: 'Hide live location from others' }
    ]
  },
  {
    title: 'System & Storage',
    items: [
      { id: 'offline', icon: Database, label: 'Offline Maps', value: '2.4 GB', desc: 'Downloaded for Ohio region' },
      { id: 'haptics', icon: Smartphone, label: 'Haptic Feedback', value: 'Tactile', desc: 'Physical response to interactions' },
      { id: 'performance', icon: Zap, label: 'Graphics Quality', value: 'Ultra', desc: 'Optimized for current hardware' }
    ]
  }
];

export function Settings({ onNavigate }: SettingsProps) {
  const { theme, toggleTheme } = useSnaproadTheme();

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Header - Responsive */}
      <div className={`pt-8 sm:pt-10 lg:pt-12 pb-4 sm:pb-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-20 backdrop-blur-xl border-b ${
        theme === 'dark' ? 'bg-[#0A0E16]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => onNavigate('profile')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all border ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10 text-white hover:scale-105' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
            }`}
            data-testid="settings-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Settings
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* Appearance Quick Toggle */}
          <section>
            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2 ${
              theme === 'dark' ? 'text-white/40' : 'text-slate-400'
            }`}>
              Appearance
            </h3>
            <div className={`rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-5 border shadow-xl flex items-center justify-between ${
              theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00DFA2] flex items-center justify-center text-white shadow-lg">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h4 className={`text-sm sm:text-base font-black mb-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Dynamic Theme
                  </h4>
                  <p className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                    Currently in {theme} mode
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all duration-500 ${
                  theme === 'dark' ? 'bg-[#0084FF]' : 'bg-slate-200'
                }`}
                data-testid="theme-toggle"
              >
                <motion.div 
                  animate={{ x: theme === 'dark' ? 20 : 4 }}
                  className="absolute top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  {theme === 'dark' ? <Moon size={10} className="text-[#0084FF]" /> : <Sun size={10} className="text-amber-500" />}
                </motion.div>
              </button>
            </div>
          </section>

          {/* Setting Groups */}
          {SETTING_GROUPS.map((group, groupIdx) => (
            <section key={groupIdx}>
              <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>
                {group.title}
              </h3>
              <div className={`rounded-2xl sm:rounded-[2.5rem] border shadow-xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
              }`}>
                {group.items.map((item, itemIdx) => (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left transition-colors active:scale-[0.99] ${
                      itemIdx !== group.items.length - 1 
                        ? theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100'
                        : ''
                    } ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                    data-testid={`setting-${item.id}`}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#0084FF]/10 flex items-center justify-center text-[#0084FF]">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {item.label}
                      </h4>
                      <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                        {item.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[#0084FF] text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none">{item.value}</span>
                      <ChevronRight size={16} className={theme === 'dark' ? 'text-white/30' : 'text-slate-400'} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {/* Version Info */}
          <div className="text-center pt-4">
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'}`}>
              SnapRoad Premium v2.4.0
            </p>
            <p className={`text-[9px] font-bold mt-1 ${theme === 'dark' ? 'text-white/10' : 'text-slate-200'}`}>
              Build 2025.12.30.01
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
