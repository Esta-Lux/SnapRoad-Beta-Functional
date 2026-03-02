import { useState } from 'react';
import { ArrowLeft, Bell, Shield, Zap, Navigation, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface NotificationSettingsProps {
  onNavigate: (screen: string) => void;
}

export function NotificationSettings({ onNavigate }: NotificationSettingsProps) {
  const { theme } = useSnaproadTheme();
  
  const [channels, setChannels] = useState({
    safety: true,
    rewards: true,
    trips: true,
    circle: true,
    marketing: false
  });

  const toggle = (key: keyof typeof channels) => {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SECTIONS = [
    {
      title: 'Safety & Assistance',
      items: [
        { id: 'safety', icon: Shield, label: 'Safety Alerts', desc: 'Sudden braking, sharp turns & road hazards', color: 'text-red-500', bg: 'bg-red-500/10' },
        { id: 'trips', icon: Navigation, label: 'Trip Logs', desc: 'Summary of your journeys and safety scores', color: 'text-[#0084FF]', bg: 'bg-[#0084FF]/10' }
      ]
    },
    {
      title: 'Activity & Rewards',
      items: [
        { id: 'rewards', icon: Zap, label: 'Gem Rewards', desc: 'New gems earned and reward availability', color: 'text-[#00DFA2]', bg: 'bg-[#00DFA2]/10' },
        { id: 'circle', icon: MessageSquare, label: 'Circle Activity', desc: 'Alerts when friends start or finish trips', color: 'text-purple-500', bg: 'bg-purple-500/10' }
      ]
    }
  ];

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
            data-testid="notification-settings-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {/* Master Toggle */}
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0084FF] text-white flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bell size={24} />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black">Allow Push Notifications</h4>
                <p className="text-xs sm:text-sm font-medium opacity-80">System-level master switch</p>
              </div>
            </div>
            <div className="w-12 h-6 sm:w-14 sm:h-7 rounded-full bg-white/30 relative">
              <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white" />
            </div>
          </div>

          {/* Detailed Controls */}
          {SECTIONS.map((section, idx) => (
            <section key={idx}>
              <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>
                {section.title}
              </h3>
              <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${
                theme === 'dark' ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-slate-200'
              }`}>
                {section.items.map((item, itemIdx) => (
                  <button 
                    key={item.id}
                    onClick={() => toggle(item.id as keyof typeof channels)}
                    className={`w-full p-4 sm:p-5 flex items-center justify-between ${
                      itemIdx !== section.items.length - 1 
                        ? theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                        <item.icon size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className={`text-sm sm:text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {item.label}
                        </h4>
                        <p className={`text-[10px] sm:text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-colors relative ${
                      channels[item.id as keyof typeof channels] ? 'bg-[#0084FF]' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
                    }`}>
                      <motion.div 
                        animate={{ x: channels[item.id as keyof typeof channels] ? 26 : 2 }}
                        className="absolute top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-sm"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {/* Device Settings Link */}
          <div className={`p-4 rounded-2xl text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
            <p className={`text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
              To change sound and banner styles, visit your device Settings app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
