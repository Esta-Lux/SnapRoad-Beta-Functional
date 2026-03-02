import { useState } from 'react';
import { 
  Search, 
  Menu, 
  Navigation, 
  Star, 
  MapPin, 
  AlertTriangle,
  Camera,
  Mic,
  Plus,
  ChevronRight,
  Home,
  Building2,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { GemIcon } from '../primitives/GemIcon';

interface MapScreenProps {
  onNavigate: (screen: string) => void;
  onOpenOrion?: () => void;
  onOpenPhotoCapture?: () => void;
}

const QUICK_LOCATIONS = [
  { id: 1, icon: Home, label: 'Home', subtitle: '2.3 mi' },
  { id: 2, icon: Building2, label: 'Work', subtitle: '5.1 mi' },
  { id: 3, icon: Heart, label: "Mom's", subtitle: '8.7 mi' },
];

const NEARBY_OFFERS = [
  { id: 1, name: 'Coffee House', discount: '15% off', gems: 50, distance: '0.3 mi' },
  { id: 2, name: 'Auto Spa', discount: 'Free wash', gems: 100, distance: '0.8 mi' },
  { id: 3, name: 'Gas Station', discount: '$0.10/gal', gems: 25, distance: '0.2 mi' },
];

export function MapScreen({ onNavigate, onOpenOrion, onOpenPhotoCapture }: MapScreenProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('map');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'gems') {
      onNavigate('gems');
    } else if (tab === 'family') {
      onNavigate('family');
    } else if (tab === 'profile') {
      onNavigate('profile');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E16] relative">
      {/* Map Background */}
      <div className="absolute inset-0 bg-[#121822]">
        {/* Grid overlay to simulate map */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Simulated route */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800">
          <path
            d="M 200 700 Q 150 500 200 400 Q 250 300 200 200 Q 180 150 200 100"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            className="route-glow"
          />
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0084FF" />
              <stop offset="100%" stopColor="#00FFD7" />
            </linearGradient>
          </defs>
        </svg>

        {/* User location marker */}
        <div className="absolute left-1/2 bottom-1/3 -translate-x-1/2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#0084FF]/20 animate-ping absolute inset-0" />
            <div className="w-16 h-16 rounded-full bg-[#0084FF]/10 flex items-center justify-center relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center shadow-lg">
                <Navigation size={16} className="text-white fill-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Gem markers on map */}
        <div className="absolute left-1/4 top-1/3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FFB800] to-[#FF6B00] rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <GemIcon size={18} />
          </div>
        </div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="px-4 pt-12 pb-4">
          {/* Menu & Search Row */}
          <div className="flex items-center gap-3">
            <button 
              className="w-12 h-12 rounded-2xl bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center"
              data-testid="map-menu-btn"
            >
              <Menu size={20} className="text-white" />
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Where to?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="w-full h-12 pl-12 pr-4 bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#0084FF]"
                data-testid="map-search-input"
              />
            </div>
          </div>

          {/* Quick Location Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar">
            {QUICK_LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                className="flex items-center gap-2 h-10 px-4 bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 rounded-full whitespace-nowrap"
                data-testid={`quick-location-${loc.label.toLowerCase()}`}
              >
                <loc.icon size={16} className="text-[#0084FF]" />
                <span className="text-white text-sm">{loc.label}</span>
                <span className="text-white/40 text-xs">{loc.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute right-4 top-1/3 space-y-3 z-20">
        <button 
          onClick={onOpenPhotoCapture}
          className="w-14 h-14 rounded-2xl bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg hover:border-[#FFB800]/50 transition-colors"
          data-testid="map-report-btn"
          title="Report Incident"
        >
          <AlertTriangle size={22} className="text-[#FFB800]" />
        </button>
        <button 
          onClick={onOpenPhotoCapture}
          className="w-14 h-14 rounded-2xl bg-[#1A1F2E]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg hover:border-white/30 transition-colors"
          data-testid="map-camera-btn"
          title="Take Photo"
        >
          <Camera size={22} className="text-white" />
        </button>
        <button 
          onClick={onOpenOrion}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          data-testid="map-orion-btn"
          title="Orion AI Coach"
        >
          <Mic size={22} className="text-white" />
        </button>
      </div>

      {/* Nearby Offers Card */}
      <div className="absolute left-4 right-4 bottom-28 z-10">
        <motion.div 
          className="bg-[#1A1F2E]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Nearby Offers</h3>
            <button 
              className="text-[#0084FF] text-sm flex items-center gap-1"
              onClick={() => onNavigate('offers')}
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {NEARBY_OFFERS.map((offer) => (
              <div 
                key={offer.id}
                className="flex-shrink-0 w-40 bg-white/5 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#00FFD7] text-xs font-medium">{offer.discount}</span>
                  <div className="flex items-center gap-1">
                    <GemIcon size={12} />
                    <span className="text-white/60 text-xs">{offer.gems}</span>
                  </div>
                </div>
                <p className="text-white text-sm font-medium truncate">{offer.name}</p>
                <p className="text-white/40 text-xs">{offer.distance}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
