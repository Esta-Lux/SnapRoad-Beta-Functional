// SnapRoad Admin - Offer Management
// Create and manage partner offers with automatic gem pricing

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Edit2,
  Trash2,
  Link,
  DollarSign,
  Diamond,
  Eye,
  TrendingUp,
  Users,
  Gift,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Sparkles
} from 'lucide-react';
import { calculateGemCost, getOfferTier, GEM_PRICING_TIERS, PARTNER_PRICING, OFFER_CATEGORIES, OFFER_TYPES } from '../../../lib/offer-pricing';

interface AdminOfferManagementProps {
  onNavigate: (page: string) => void;
}

interface Offer {
  id: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string;
  type: keyof typeof OFFER_TYPES;
  discountValue: number;
  isFreeItem: boolean;
  sourceUrl: string;
  category: string;
  status: 'pending' | 'active' | 'paused' | 'expired';
  reach: number;
  redemptions: number;
  revenue: number;
  gemCostFree: number;
  gemCostPremium: number;
  createdAt: string;
  expiresAt?: string;
}

const SAMPLE_OFFERS: Offer[] = [
  {
    id: '1',
    partnerId: 'p1',
    partnerName: 'Coffee House',
    title: '15% off any drink',
    description: 'Get 15% off your favorite beverages',
    type: 'percentage',
    discountValue: 15,
    isFreeItem: false,
    sourceUrl: 'https://coffeehouse.com/offers/15off',
    category: 'food',
    status: 'active',
    reach: 12400,
    redemptions: 847,
    revenue: 423.50,
    gemCostFree: 80,
    gemCostPremium: 65,
    createdAt: '2025-02-01',
    expiresAt: '2025-03-01',
  },
  {
    id: '2',
    partnerId: 'p2',
    partnerName: 'Auto Spa Pro',
    title: 'Free Premium Car Wash',
    description: 'Complimentary full-service car wash',
    type: 'free',
    discountValue: 100,
    isFreeItem: true,
    sourceUrl: 'https://autospa.com/promo/freewash',
    category: 'service',
    status: 'active',
    reach: 8200,
    redemptions: 234,
    revenue: 117.00,
    gemCostFree: 100,
    gemCostPremium: 80,
    createdAt: '2025-02-05',
  },
  {
    id: '3',
    partnerId: 'p3',
    partnerName: 'Gas Plus',
    title: '$0.15 off per gallon',
    description: 'Save on every gallon of fuel',
    type: 'dollar',
    discountValue: 8,
    isFreeItem: false,
    sourceUrl: 'https://gasplus.com/snaproad',
    category: 'gas',
    status: 'paused',
    reach: 5100,
    redemptions: 1203,
    revenue: 601.50,
    gemCostFree: 50,
    gemCostPremium: 40,
    createdAt: '2025-01-15',
  },
  {
    id: '4',
    partnerId: 'p4',
    partnerName: 'Burger Joint',
    title: '10% off your order',
    description: 'Discount on all menu items',
    type: 'percentage',
    discountValue: 10,
    isFreeItem: false,
    sourceUrl: 'https://burgerjoint.com/snap10',
    category: 'food',
    status: 'pending',
    reach: 0,
    redemptions: 0,
    revenue: 0,
    gemCostFree: 50,
    gemCostPremium: 40,
    createdAt: '2025-02-17',
  },
];

export function AdminOfferManagement({ onNavigate }: AdminOfferManagementProps) {
  const [offers, setOffers] = useState<Offer[]>(SAMPLE_OFFERS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  
  // Create form state
  const [newOffer, setNewOffer] = useState({
    partnerName: '',
    title: '',
    description: '',
    type: 'percentage' as keyof typeof OFFER_TYPES,
    discountValue: 0,
    isFreeItem: false,
    sourceUrl: '',
    category: 'food',
    expiresAt: '',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#00DFA2]/10 text-[#00DFA2]';
      case 'paused': return 'bg-[#FFC24C]/10 text-[#FFC24C]';
      case 'pending': return 'bg-[#0084FF]/10 text-[#0084FF]';
      case 'expired': return 'bg-[#8A9BB6]/10 text-[#8A9BB6]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} />;
      case 'paused': return <Pause size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'expired': return <XCircle size={14} />;
      default: return null;
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOffer = () => {
    const gemCostFree = calculateGemCost(newOffer.discountValue, newOffer.isFreeItem, false);
    const gemCostPremium = calculateGemCost(newOffer.discountValue, newOffer.isFreeItem, true);
    
    const offer: Offer = {
      id: Date.now().toString(),
      partnerId: 'new',
      partnerName: newOffer.partnerName,
      title: newOffer.title,
      description: newOffer.description,
      type: newOffer.type,
      discountValue: newOffer.discountValue,
      isFreeItem: newOffer.isFreeItem,
      sourceUrl: newOffer.sourceUrl,
      category: newOffer.category,
      status: 'pending',
      reach: 0,
      redemptions: 0,
      revenue: 0,
      gemCostFree,
      gemCostPremium,
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: newOffer.expiresAt || undefined,
    };
    
    setOffers([offer, ...offers]);
    setShowCreateModal(false);
    setNewOffer({
      partnerName: '',
      title: '',
      description: '',
      type: 'percentage',
      discountValue: 0,
      isFreeItem: false,
      sourceUrl: '',
      category: 'food',
      expiresAt: '',
    });
  };

  const toggleOfferStatus = (offerId: string) => {
    setOffers(offers.map(offer => {
      if (offer.id === offerId) {
        return {
          ...offer,
          status: offer.status === 'active' ? 'paused' : 'active'
        };
      }
      return offer;
    }));
  };

  const approveOffer = (offerId: string) => {
    setOffers(offers.map(offer => {
      if (offer.id === offerId) {
        return { ...offer, status: 'active' };
      }
      return offer;
    }));
  };

  const deleteOffer = (offerId: string) => {
    setOffers(offers.filter(offer => offer.id !== offerId));
  };

  // Calculate preview gem costs
  const previewTier = getOfferTier(newOffer.discountValue, newOffer.isFreeItem);
  const previewGemCostFree = calculateGemCost(newOffer.discountValue, newOffer.isFreeItem, false);
  const previewGemCostPremium = calculateGemCost(newOffer.discountValue, newOffer.isFreeItem, true);

  return (
    <div className="min-h-screen bg-[#F5F8FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E6ECF5] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#0B1220] text-[24px] font-bold">Offer Management</h1>
            <p className="text-[#4B5C74] text-[14px]">Create and manage partner offers with automatic gem pricing</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
          >
            <Plus size={20} />
            Add New Offer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#E6ECF5]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center">
                <Gift size={20} className="text-[#0084FF]" />
              </div>
              <div className="flex items-center gap-1 text-[#00DFA2]">
                <TrendingUp size={14} />
                <span className="text-[12px] font-semibold">+12%</span>
              </div>
            </div>
            <p className="text-[#4B5C74] text-[12px]">Total Offers</p>
            <p className="text-[#0B1220] text-[24px] font-bold">{offers.length}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-[#E6ECF5]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-[#00DFA2]" />
              </div>
            </div>
            <p className="text-[#4B5C74] text-[12px]">Active Offers</p>
            <p className="text-[#0B1220] text-[24px] font-bold">{offers.filter(o => o.status === 'active').length}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-[#E6ECF5]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/10 flex items-center justify-center">
                <Users size={20} className="text-[#9D4EDD]" />
              </div>
            </div>
            <p className="text-[#4B5C74] text-[12px]">Total Redemptions</p>
            <p className="text-[#0B1220] text-[24px] font-bold">{offers.reduce((acc, o) => acc + o.redemptions, 0).toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-[#E6ECF5]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#FFC24C]/10 flex items-center justify-center">
                <DollarSign size={20} className="text-[#FFC24C]" />
              </div>
            </div>
            <p className="text-[#4B5C74] text-[12px]">Revenue Generated</p>
            <p className="text-[#0B1220] text-[24px] font-bold">${offers.reduce((acc, o) => acc + o.revenue, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Gem Pricing Guide */}
      <div className="px-6 pb-4">
        <div className="bg-gradient-to-r from-[#004A93] to-[#0084FF] rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} />
            <span className="font-bold">Automatic Gem Pricing Guide</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Standard (≤10% off)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#0084FF]" />
                <span className="font-bold">50 gems</span>
                <span className="text-white/60 text-[12px]">(40 premium)</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Premium (&gt;10% off)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#9D4EDD]" />
                <span className="font-bold">80 gems</span>
                <span className="text-white/60 text-[12px]">(65 premium)</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Exclusive (Free Items)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#00DFA2]" />
                <span className="font-bold">100 gems</span>
                <span className="text-white/60 text-[12px]">(80 premium)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A9BB6]" />
            <input
              type="text"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'paused', 'pending', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`h-11 px-4 rounded-xl text-[13px] font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-[#0084FF] text-white'
                    : 'bg-white border border-[#E6ECF5] text-[#4B5C74] hover:bg-[#F5F8FC]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="px-6">
        <div className="bg-white rounded-xl border border-[#E6ECF5] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6ECF5] bg-[#F5F8FC]">
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Offer</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Source URL</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Gem Cost</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Performance</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Revenue</th>
                <th className="text-left p-4 text-[#4B5C74] text-[12px] font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className="border-b border-[#E6ECF5] hover:bg-[#F5F8FC]/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0084FF] to-[#00DFA2] flex items-center justify-center text-white">
                        <Tag size={18} />
                      </div>
                      <div>
                        <p className="text-[#0B1220] font-semibold">{offer.title}</p>
                        <p className="text-[#8A9BB6] text-[13px]">{offer.partnerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link size={14} className="text-[#8A9BB6]" />
                      <a 
                        href={offer.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#0084FF] text-[13px] hover:underline truncate max-w-[150px]"
                      >
                        {offer.sourceUrl.replace('https://', '')}
                      </a>
                      <button 
                        onClick={() => navigator.clipboard.writeText(offer.sourceUrl)}
                        className="text-[#8A9BB6] hover:text-[#0084FF]"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Diamond size={14} className="text-[#8A9BB6]" />
                        <span className="text-[#0B1220] font-semibold">{offer.gemCostFree}</span>
                        <span className="text-[#8A9BB6] text-[11px]">free users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Diamond size={14} className="text-[#9D4EDD]" />
                        <span className="text-[#0B1220] font-semibold">{offer.gemCostPremium}</span>
                        <span className="text-[#8A9BB6] text-[11px]">premium</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${getStatusColor(offer.status)}`}>
                      {getStatusIcon(offer.status)}
                      {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[13px]">
                        <Eye size={14} className="text-[#8A9BB6]" />
                        <span className="text-[#0B1220]">{offer.reach.toLocaleString()} reach</span>
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <Users size={14} className="text-[#8A9BB6]" />
                        <span className="text-[#0B1220]">{offer.redemptions.toLocaleString()} redeemed</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[#00DFA2] font-bold">${offer.revenue.toFixed(2)}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {offer.status === 'pending' ? (
                        <button
                          onClick={() => approveOffer(offer.id)}
                          className="w-8 h-8 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center text-[#00DFA2] hover:bg-[#00DFA2]/20 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleOfferStatus(offer.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            offer.status === 'active'
                              ? 'bg-[#FFC24C]/10 text-[#FFC24C] hover:bg-[#FFC24C]/20'
                              : 'bg-[#00DFA2]/10 text-[#00DFA2] hover:bg-[#00DFA2]/20'
                          }`}
                          title={offer.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {offer.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      )}
                      <button
                        className="w-8 h-8 rounded-lg bg-[#0084FF]/10 flex items-center justify-center text-[#0084FF] hover:bg-[#0084FF]/20 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteOffer(offer.id)}
                        className="w-8 h-8 rounded-lg bg-[#FF5A5A]/10 flex items-center justify-center text-[#FF5A5A] hover:bg-[#FF5A5A]/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Offer Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[#0B1220] text-[24px] font-bold mb-6">Create New Offer</h2>
              
              <div className="space-y-6">
                {/* Partner Name */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Partner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Coffee House"
                    value={newOffer.partnerName}
                    onChange={(e) => setNewOffer({ ...newOffer, partnerName: e.target.value })}
                    className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                  />
                </div>

                {/* Offer Title */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Offer Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., 15% off any drink"
                    value={newOffer.title}
                    onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                    className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                  />
                </div>

                {/* Source URL */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <Link size={16} />
                      Offer Source URL *
                    </div>
                  </label>
                  <input
                    type="url"
                    placeholder="https://partner.com/offers/snaproad-promo"
                    value={newOffer.sourceUrl}
                    onChange={(e) => setNewOffer({ ...newOffer, sourceUrl: e.target.value })}
                    className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                  />
                  <p className="text-[#8A9BB6] text-[12px] mt-1">Link to the partner's offer page for verification</p>
                </div>

                {/* Offer Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Offer Type</label>
                    <select
                      value={newOffer.type}
                      onChange={(e) => {
                        const type = e.target.value as keyof typeof OFFER_TYPES;
                        setNewOffer({ 
                          ...newOffer, 
                          type,
                          isFreeItem: type === 'free'
                        });
                      }}
                      className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="dollar">Dollar Off</option>
                      <option value="free">Free Item</option>
                      <option value="bogo">Buy One Get One</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[#0B1220] text-[14px] font-medium mb-2">
                      {newOffer.type === 'free' ? 'Original Value ($)' : 'Discount Value'}
                    </label>
                    <input
                      type="number"
                      placeholder={newOffer.type === 'percentage' ? '15' : '5'}
                      value={newOffer.discountValue || ''}
                      onChange={(e) => setNewOffer({ ...newOffer, discountValue: parseInt(e.target.value) || 0 })}
                      className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Category</label>
                  <select
                    value={newOffer.category}
                    onChange={(e) => setNewOffer({ ...newOffer, category: e.target.value })}
                    className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                  >
                    {OFFER_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Auto-Calculated Gem Preview */}
                <div className="bg-gradient-to-r from-[#004A93]/10 to-[#0084FF]/10 rounded-xl p-5 border border-[#0084FF]/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-[#0084FF]" />
                    <span className="text-[#0B1220] font-bold">Automatic Gem Pricing Preview</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#4B5C74] text-[12px] mb-1">Tier: <span className="font-semibold" style={{ color: previewTier.color }}>{previewTier.label}</span></p>
                      <p className="text-[#8A9BB6] text-[11px]">
                        {newOffer.isFreeItem 
                          ? 'Free items have highest gem value' 
                          : newOffer.discountValue <= 10 
                            ? 'Standard discount (≤10%)' 
                            : 'Premium discount (>10%)'}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Diamond size={18} className="text-[#8A9BB6]" />
                          <span className="text-[#0B1220] text-[24px] font-bold">{previewGemCostFree}</span>
                        </div>
                        <p className="text-[#8A9BB6] text-[11px]">Free Users</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Diamond size={18} className="text-[#9D4EDD]" />
                          <span className="text-[#0B1220] text-[24px] font-bold">{previewGemCostPremium}</span>
                        </div>
                        <p className="text-[#8A9BB6] text-[11px]">Premium Users</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#0084FF]/20">
                    <div className="flex items-center gap-2 text-[#4B5C74] text-[12px]">
                      <AlertTriangle size={14} className="text-[#FFC24C]" />
                      <span>Gem costs are automatically calculated based on discount value. Partners cannot set custom gem prices.</span>
                    </div>
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={newOffer.expiresAt}
                    onChange={(e) => setNewOffer({ ...newOffer, expiresAt: e.target.value })}
                    className="w-full h-12 px-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[#0B1220] text-[14px] font-medium mb-2">Description</label>
                  <textarea
                    placeholder="Brief description of the offer..."
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    className="w-full h-24 p-4 bg-[#F5F8FC] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#8A9BB6] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF] resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 rounded-xl border-2 border-[#E6ECF5] text-[#0B1220] font-medium hover:bg-[#F5F8FC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOffer}
                    disabled={!newOffer.partnerName || !newOffer.title || !newOffer.sourceUrl}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                  >
                    Create Offer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminOfferManagement;
