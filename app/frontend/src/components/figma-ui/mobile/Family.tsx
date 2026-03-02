import { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Plus, 
  MoreVertical,
  Phone,
  MessageCircle,
  Navigation,
  Shield,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { BottomNav } from './BottomNav';
import { GradientButton } from '../primitives/GradientButton';

interface FamilyProps {
  onNavigate: (screen: string) => void;
}

const FAMILY_MEMBERS = [
  { 
    id: 1, 
    name: 'Sarah Wilson', 
    relation: 'Spouse',
    status: 'driving',
    location: 'Highway 101',
    distance: '2.3 mi',
    battery: 85,
    avatar: 'SW'
  },
  { 
    id: 2, 
    name: 'Jake Wilson', 
    relation: 'Son',
    status: 'home',
    location: 'Home',
    distance: '0 mi',
    battery: 92,
    avatar: 'JW'
  },
  { 
    id: 3, 
    name: 'Emma Wilson', 
    relation: 'Daughter',
    status: 'offline',
    location: 'Last: School',
    distance: '3.1 mi',
    battery: 23,
    avatar: 'EW'
  },
];

export function Family({ onNavigate }: FamilyProps) {
  const [activeTab, setActiveTab] = useState<'map' | 'gems' | 'family' | 'profile'>('family');
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const handleBottomTabChange = (tab: 'map' | 'gems' | 'family' | 'profile') => {
    if (tab === 'map') {
      onNavigate('map');
    } else if (tab === 'gems') {
      onNavigate('gems');
    } else if (tab === 'profile') {
      onNavigate('profile');
    } else {
      setActiveTab(tab);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'driving': return 'bg-[#00FFD7]';
      case 'home': return 'bg-[#0084FF]';
      case 'offline': return 'bg-white/30';
      default: return 'bg-white/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'driving': return 'Driving';
      case 'home': return 'At Home';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E16] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Family</h1>
            <p className="text-white/60 text-sm">3 members active</p>
          </div>
          <button 
            className="w-12 h-12 rounded-2xl bg-[#0084FF]/10 flex items-center justify-center"
            data-testid="family-add-member-btn"
          >
            <Plus size={24} className="text-[#0084FF]" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => onNavigate('live-locations')}
            className="flex-1 h-12 bg-[#1A1F2E] border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white font-medium"
            data-testid="family-live-map-btn"
          >
            <MapPin size={18} className="text-[#0084FF]" />
            Live Map
          </button>
          <button 
            onClick={() => onNavigate('trip-logs')}
            className="flex-1 h-12 bg-[#1A1F2E] border border-white/10 rounded-xl flex items-center justify-center gap-2 text-white font-medium"
            data-testid="family-trip-logs-btn"
          >
            <Clock size={18} className="text-[#0084FF]" />
            Trip Logs
          </button>
        </div>
      </div>

      {/* Family Members List */}
      <div className="px-4 space-y-3">
        {FAMILY_MEMBERS.map((member) => (
          <motion.div
            key={member.id}
            className="bg-[#1A1F2E] border border-white/10 rounded-2xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: member.id * 0.1 }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar with status indicator */}
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center text-white font-bold">
                  {member.avatar}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1A1F2E] ${getStatusColor(member.status)}`} />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{member.name}</p>
                  <span className="text-white/40 text-xs">({member.relation})</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.status === 'driving' ? 'bg-[#00FFD7]/10 text-[#00FFD7]' :
                    member.status === 'home' ? 'bg-[#0084FF]/10 text-[#0084FF]' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {getStatusText(member.status)}
                  </span>
                  <span className="text-white/40 text-xs">{member.distance}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-white/30" />
                  <span className="text-white/40 text-xs">{member.location}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button 
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
                  data-testid={`family-navigate-${member.id}`}
                >
                  <Navigation size={18} className="text-[#0084FF]" />
                </button>
                <button 
                  onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
                  data-testid={`family-more-${member.id}`}
                >
                  <MoreVertical size={18} className="text-white/50" />
                </button>
              </div>
            </div>

            {/* Expanded Actions */}
            {selectedMember === member.id && (
              <motion.div 
                className="mt-4 pt-4 border-t border-white/10 flex gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <button className="flex-1 h-10 bg-[#0084FF]/10 rounded-xl flex items-center justify-center gap-2 text-[#0084FF] text-sm font-medium">
                  <Phone size={16} />
                  Call
                </button>
                <button className="flex-1 h-10 bg-[#00FFD7]/10 rounded-xl flex items-center justify-center gap-2 text-[#00FFD7] text-sm font-medium">
                  <MessageCircle size={16} />
                  Message
                </button>
                <button className="flex-1 h-10 bg-white/5 rounded-xl flex items-center justify-center gap-2 text-white/70 text-sm font-medium">
                  <Shield size={16} />
                  Safety
                </button>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add Member CTA */}
      <div className="px-4 mt-6">
        <GradientButton 
          className="w-full h-14 rounded-2xl"
          onClick={() => {}}
          data-testid="family-invite-btn"
        >
          <Plus size={20} />
          Invite Family Member
        </GradientButton>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleBottomTabChange} />
    </div>
  );
}
