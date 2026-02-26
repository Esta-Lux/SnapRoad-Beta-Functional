import { useState } from 'react';
import { 
  ArrowLeft, 
  Gift, 
  Trophy, 
  Target, 
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { GemIcon } from '../primitives/GemIcon';
import { BottomNav } from './BottomNav';

interface GemsProps {
  onNavigate: (screen: string) => void;
}

const OFFERS = [
  { id: 1, name: 'Coffee House', discount: '15% off any drink', gems: 50, expiry: '3 days' },
  { id: 2, name: 'Auto Spa Pro', discount: 'Free premium wash', gems: 150, expiry: '5 days' },
  { id: 3, name: 'Gas Plus', discount: '$0.15 off per gallon', gems: 75, expiry: '2 days' },
];

const CHALLENGES = [
  { id: 1, name: 'Safe Driver Week', description: 'No harsh braking for 7 days', reward: 200, progress: 65 },
  { id: 2, name: 'Early Bird', description: 'Complete 5 morning trips', reward: 100, progress: 40 },
  { id: 3, name: 'Eco Warrior', description: 'Maintain 30+ MPG average', reward: 150, progress: 80 },
];

const BADGES = [
  { id: 1, name: 'First Trip', icon: '🚗', earned: true },
  { id: 2, name: 'Road Warrior', icon: '🏆', earned: true },
  { id: 3, name: 'Safety Star', icon: '⭐', earned: false },
  { id: 4, name: 'Night Owl', icon: '🦉', earned: true },
];

export function Gems({ onNavigate }: GemsProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('gems');
  const [activeSection, setActiveSection] = useState<'offers' | 'challenges' | 'badges'>('offers');

  const handleBottomTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'map') {
      onNavigate('map');
    } else if (tab === 'family') {
      onNavigate('family');
    } else if (tab === 'profile') {
      onNavigate('profile');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E16] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-2xl font-bold">Gems & Rewards</h1>
          <button 
            onClick={() => onNavigate('gem-marketplace')}
            className="px-4 py-2 bg-[#0084FF]/10 rounded-full text-[#0084FF] text-sm font-medium"
            data-testid="gems-marketplace-btn"
          >
            Marketplace
          </button>
        </div>

        {/* Gem Balance Card */}
        <motion.div 
          className="bg-gradient-to-br from-[#1A1F2E] to-[#0D1117] border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Your Balance</p>
              <div className="flex items-center gap-3">
                <GemIcon size={32} />
                <span className="text-white text-4xl font-bold">2,450</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#00FFD7] text-sm font-medium">+125 this week</p>
              <p className="text-white/40 text-xs mt-1">Rank #42 in your area</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section Tabs */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 p-1 bg-[#1A1F2E] rounded-xl">
          {[
            { id: 'offers', icon: Gift, label: 'Offers' },
            { id: 'challenges', icon: Target, label: 'Challenges' },
            { id: 'badges', icon: Trophy, label: 'Badges' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all ${
                activeSection === tab.id
                  ? 'bg-[#0084FF] text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
              data-testid={`gems-tab-${tab.id}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeSection === 'offers' && (
          <div className="space-y-3">
            {OFFERS.map((offer) => (
              <motion.div
                key={offer.id}
                className="bg-[#1A1F2E] border border-white/10 rounded-2xl p-4 flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: offer.id * 0.1 }}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0084FF]/20 to-[#00FFD7]/20 flex items-center justify-center">
                  <Gift size={24} className="text-[#0084FF]" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{offer.name}</p>
                  <p className="text-[#00FFD7] text-sm">{offer.discount}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-white/40" />
                    <span className="text-white/40 text-xs">{offer.expiry}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <GemIcon size={14} />
                    <span className="text-white font-semibold">{offer.gems}</span>
                  </div>
                  <button className="mt-2 px-4 py-1.5 bg-[#0084FF] rounded-lg text-white text-sm font-medium">
                    Redeem
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'challenges' && (
          <div className="space-y-3">
            {CHALLENGES.map((challenge) => (
              <motion.div
                key={challenge.id}
                className="bg-[#1A1F2E] border border-white/10 rounded-2xl p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: challenge.id * 0.1 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{challenge.name}</p>
                    <p className="text-white/50 text-sm">{challenge.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <GemIcon size={14} />
                    <span className="text-[#00FFD7] font-semibold">{challenge.reward}</span>
                  </div>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#0084FF] to-[#00FFD7] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${challenge.progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">{challenge.progress}% complete</p>
              </motion.div>
            ))}
          </div>
        )}

        {activeSection === 'badges' && (
          <div className="grid grid-cols-2 gap-3">
            {BADGES.map((badge) => (
              <motion.div
                key={badge.id}
                className={`bg-[#1A1F2E] border rounded-2xl p-4 text-center ${
                  badge.earned ? 'border-white/10' : 'border-white/5 opacity-50'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: badge.earned ? 1 : 0.5, scale: 1 }}
                transition={{ delay: badge.id * 0.1 }}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <p className="text-white font-medium">{badge.name}</p>
                {badge.earned && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <CheckCircle size={14} className="text-[#00FFD7]" />
                    <span className="text-[#00FFD7] text-xs">Earned</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleBottomTabChange} />
    </div>
  );
}
