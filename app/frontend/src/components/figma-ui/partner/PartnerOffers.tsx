// SnapRoad Partner Portal - Offers Management
// Partners can view their offers and see performance (cannot set gem prices)

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Users,
  TrendingUp,
  Gift,
  Diamond,
  Clock,
  CheckCircle,
  Pause,
  Edit2,
  BarChart2,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';
import { getOfferTier, GEM_PRICING_TIERS } from '../../../lib/offer-pricing';

interface PartnerOffersProps {
  onNavigate: (page: string) => void;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  type: 'percentage' | 'dollar' | 'free';
  discountValue: number;
  isFreeItem: boolean;
  gemCostFree: number;
  gemCostPremium: number;
  status: 'active' | 'pending' | 'paused' | 'expired';
  views: number;
  redemptions: number;
  revenue: number;
  conversionRate: number;
  createdAt: string;
  expiresAt?: string;
}

const SAMPLE_OFFERS: Offer[] = [
  {
    id: '1',
    title: '$0.15 off per gallon',
    description: 'Save on every gallon of premium fuel',
    type: 'dollar',
    discountValue: 8,
    isFreeItem: false,
    gemCostFree: 50,
    gemCostPremium: 40,
    status: 'active',
    views: 12400,
    redemptions: 847,
    revenue: 4235.00,
    conversionRate: 6.8,
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    title: 'Free Car Wash',
    description: 'Complimentary premium car wash with any fill-up',
    type: 'free',
    discountValue: 100,
    isFreeItem: true,
    gemCostFree: 100,
    gemCostPremium: 80,
    status: 'active',
    views: 8200,
    redemptions: 234,
    revenue: 1170.00,
    conversionRate: 2.9,
    createdAt: '2025-02-01',
    expiresAt: '2025-03-01',
  },
  {
    id: '3',
    title: '20% off Oil Change',
    description: 'Premium synthetic oil change at discount',
    type: 'percentage',
    discountValue: 20,
    isFreeItem: false,
    gemCostFree: 80,
    gemCostPremium: 65,
    status: 'paused',
    views: 5600,
    redemptions: 142,
    revenue: 710.00,
    conversionRate: 2.5,
    createdAt: '2025-01-20',
  },
  {
    id: '4',
    title: '5% off Accessories',
    description: 'Small discount on car accessories',
    type: 'percentage',
    discountValue: 5,
    isFreeItem: false,
    gemCostFree: 50,
    gemCostPremium: 40,
    status: 'pending',
    views: 0,
    redemptions: 0,
    revenue: 0,
    conversionRate: 0,
    createdAt: '2025-02-17',
  },
];

export function PartnerOffers({ onNavigate }: PartnerOffersProps) {
  const { theme } = useSnaproadTheme();
  const [offers] = useState<Offer[]>(SAMPLE_OFFERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPricingInfo, setShowPricingInfo] = useState(false);

  const isDark = theme === 'dark';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#00DFA2]/10 text-[#00DFA2]';
      case 'paused': return 'bg-[#FFC24C]/10 text-[#FFC24C]';
      case 'pending': return 'bg-[#0084FF]/10 text-[#0084FF]';
      case 'expired': return 'bg-[#8A9BB6]/10 text-[#8A9BB6]';
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} />;
      case 'paused': return <Pause size={14} />;
      case 'pending': return <Clock size={14} />;
      default: return null;
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalStats = {
    activeOffers: offers.filter(o => o.status === 'active').length,
    totalViews: offers.reduce((acc, o) => acc + o.views, 0),
    totalRedemptions: offers.reduce((acc, o) => acc + o.redemptions, 0),
    totalRevenue: offers.reduce((acc, o) => acc + o.revenue, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            My Offers
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            View and manage your active offers on SnapRoad
          </p>
        </div>
        <button
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
        >
          <Plus size={20} />
          Request New Offer
        </button>
      </div>

      {/* Gem Pricing Info Banner */}
      <motion.div 
        className={`rounded-xl p-4 border ${
          isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-[#F5F8FA] border-[#E6ECF5]'
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-[#0084FF]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                How Gem Pricing Works
              </h4>
              <button 
                onClick={() => setShowPricingInfo(!showPricingInfo)}
                className="text-[#0084FF] text-sm font-medium"
              >
                {showPricingInfo ? 'Hide Details' : 'Learn More'}
              </button>
            </div>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
              Gem prices are automatically set based on your discount value to ensure fair pricing for all users.
            </p>
            
            {showPricingInfo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-dashed grid grid-cols-3 gap-4"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E6ECF5' }}
              >
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0A0E16]' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Diamond size={16} className="text-[#0084FF]" />
                    <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-[#4B5C74]'}`}>
                      Standard
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>50 gems</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Discounts ≤10%</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0A0E16]' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Diamond size={16} className="text-[#9D4EDD]" />
                    <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-[#4B5C74]'}`}>
                      Premium
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>80 gems</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Discounts &gt;10%</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-[#0A0E16]' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Diamond size={16} className="text-[#00DFA2]" />
                    <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-[#4B5C74]'}`}>
                      Exclusive
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>100 gems</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Free items</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center">
              <Gift size={20} className="text-[#00DFA2]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{totalStats.activeOffers}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Active Offers</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center">
              <Eye size={20} className="text-[#0084FF]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{totalStats.totalViews.toLocaleString()}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Total Views</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/10 flex items-center justify-center">
              <Users size={20} className="text-[#9D4EDD]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{totalStats.totalRedemptions.toLocaleString()}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Redemptions</p>
        </div>
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFC24C]/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-[#FFC24C]" />
            </div>
          </div>
          <p className={`text-2xl font-bold text-[#00DFA2]`}>${totalStats.totalRevenue.toLocaleString()}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Revenue Generated</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9BB6]" />
          <input
            type="text"
            placeholder="Search offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full h-11 pl-11 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00DFA2]/20 focus:border-[#00DFA2] ${
              isDark 
                ? 'bg-[#1A1F2E] border-white/10 text-white placeholder:text-white/40' 
                : 'bg-white border-[#E6ECF5] text-[#0B1220] placeholder:text-[#8A9BB6]'
            }`}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'paused', 'pending'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#00DFA2] text-white'
                  : isDark 
                    ? 'bg-[#1A1F2E] text-white/60 border border-white/10 hover:text-white' 
                    : 'bg-white text-[#4B5C74] border border-[#E6ECF5] hover:bg-[#F5F8FA]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {filteredOffers.map((offer) => {
          const tier = getOfferTier(offer.discountValue, offer.isFreeItem);
          
          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl border ${
                isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${tier.color}20` }}>
                    <Gift size={24} style={{ color: tier.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                        {offer.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                        {getStatusIcon(offer.status)}
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                      {offer.description}
                    </p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Diamond size={16} className="text-[#8A9BB6]" />
                        <span className={`text-sm ${isDark ? 'text-white/80' : 'text-[#0B1220]'}`}>
                          <span className="font-semibold">{offer.gemCostFree}</span> gems (free users)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Diamond size={16} className="text-[#9D4EDD]" />
                        <span className={`text-sm ${isDark ? 'text-white/80' : 'text-[#0B1220]'}`}>
                          <span className="font-semibold">{offer.gemCostPremium}</span> gems (premium)
                        </span>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                      >
                        {tier.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      {offer.views.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>Views</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      {offer.redemptions.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>Redeemed</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${offer.conversionRate >= 5 ? 'text-[#00DFA2]' : isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                      {offer.conversionRate}%
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>Conv. Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#00DFA2]">
                      ${offer.revenue.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>Revenue</p>
                  </div>
                  <div className="flex gap-2">
                    <button className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-[#F5F8FA] hover:bg-[#E6ECF5] text-[#4B5C74]'
                    }`}>
                      <BarChart2 size={18} />
                    </button>
                    <button className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-[#F5F8FA] hover:bg-[#E6ECF5] text-[#4B5C74]'
                    }`}>
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PartnerOffers;
