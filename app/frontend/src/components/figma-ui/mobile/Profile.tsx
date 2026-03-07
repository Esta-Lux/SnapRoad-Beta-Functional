import { useState } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  ChevronRight, 
  Car, 
  MapPin, 
  Award,
  Fuel,
  Clock,
  Shield,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { GemIcon } from '../primitives/GemIcon';
import { BottomNav } from './BottomNav';

interface ProfileProps {
  onNavigate: (screen: string) => void;
}

const MENU_ITEMS = [
  { id: 'analytics', icon: BarChart3, label: 'Analytics', subtitle: 'Performance insights' },
  { id: 'account-info', icon: Settings, label: 'Account Info', subtitle: 'Personal details' },
  { id: 'trip-logs', icon: Clock, label: 'Trip History', subtitle: 'View past trips' },
  { id: 'fuel-dashboard', icon: Fuel, label: 'Fuel Dashboard', subtitle: 'Track expenses' },
  { id: 'favorite-routes', icon: MapPin, label: 'Saved Routes', subtitle: 'Your favorites' },
  { id: 'leaderboard', icon: Award, label: 'Leaderboard', subtitle: 'Rankings' },
  { id: 'car-skin-showcase', icon: Car, label: 'Car Studio', subtitle: 'Customize your ride' },
];

const SETTINGS_ITEMS = [
  { id: 'privacy-center', icon: Shield, label: 'Privacy', subtitle: 'Data & permissions' },
  { id: 'notifications-settings', icon: Bell, label: 'Notifications', subtitle: 'Alert preferences' },
  { id: 'pricing', icon: CreditCard, label: 'Subscription', subtitle: 'Manage plan' },
  { id: 'support', icon: HelpCircle, label: 'Help & Support', subtitle: 'Get assistance' },
];

export function Profile({ onNavigate }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('profile');

  const handleTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'map') {
      onNavigate('map');
    } else if (tab === 'gems') {
      onNavigate('gems');
    } else if (tab === 'family') {
      onNavigate('family');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E16] pb-24">
      {/* Header */}
      <div className="relative h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004A93] via-[#0084FF] to-[#00FFD7]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0E16]" />
        
        {/* Settings button */}
        <button 
          onClick={() => onNavigate('settings')}
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
          data-testid="profile-settings-btn"
        >
          <Settings size={20} className="text-white" />
        </button>
      </div>

      {/* Profile Card - Overlapping Header */}
      <div className="px-4 -mt-24 relative z-10">
        <motion.div 
          className="bg-[#1A1F2E] border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center text-white text-2xl font-bold">
              JD
            </div>
            <div className="flex-1">
              <h2 className="text-white text-xl font-bold">John Doe</h2>
              <p className="text-white/60 text-sm">Premium Member</p>
              <div className="flex items-center gap-2 mt-2">
                <GemIcon size={16} />
                <span className="text-[#00FFD7] font-semibold">2,450</span>
                <span className="text-white/40 text-sm">gems</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-white text-xl font-bold">92</p>
              <p className="text-white/40 text-xs">Safety Score</p>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold">1,247</p>
              <p className="text-white/40 text-xs">Miles Driven</p>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold">28</p>
              <p className="text-white/40 text-xs">Badges</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 mt-6 space-y-6">
        {/* Main Menu */}
        <div className="bg-[#1A1F2E] border border-white/10 rounded-2xl overflow-hidden">
          {MENU_ITEMS.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                index < MENU_ITEMS.length - 1 ? 'border-b border-white/5' : ''
              }`}
              data-testid={`profile-menu-${item.id}`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <item.icon size={20} className="text-[#0084FF]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-white/40 text-sm">{item.subtitle}</p>
              </div>
              <ChevronRight size={20} className="text-white/30" />
            </button>
          ))}
        </div>

        {/* Settings Menu */}
        <div>
          <h3 className="text-white/40 text-sm font-medium px-2 mb-3">Settings</h3>
          <div className="bg-[#1A1F2E] border border-white/10 rounded-2xl overflow-hidden">
            {SETTINGS_ITEMS.map((item, index) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                  index < SETTINGS_ITEMS.length - 1 ? 'border-b border-white/5' : ''
                }`}
                data-testid={`profile-settings-${item.id}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <item.icon size={20} className="text-white/60" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-white/40 text-sm">{item.subtitle}</p>
                </div>
                <ChevronRight size={20} className="text-white/30" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => onNavigate('welcome')}
          className="w-full flex items-center justify-center gap-2 h-12 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors"
          data-testid="profile-logout-btn"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
