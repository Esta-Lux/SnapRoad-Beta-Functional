// SnapRoad Admin - Offer Management
// Create and manage partner offers with automatic gem pricing

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
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
  Sparkles,
  Upload,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { calculateAutoGems, getOfferTier, OFFER_CATEGORIES } from '../../../lib/offer-pricing';
import { adminApi } from '../../../services/adminApi';

interface AdminOfferManagementProps {
  onNavigate: (page: string) => void;
  theme?: 'dark' | 'light';
}

interface Offer {
  id: string;
  partnerId: string;
  partnerName: string;
  title: string;
  description: string;
  type: string;
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
  offerSource: string;
}

const SOURCE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  direct:    { label: 'Direct',    color: '#00DFA2', bg: '#00DFA2' },
  groupon:   { label: 'Groupon',   color: '#FF6B00', bg: '#FF6B00' },
  affiliate: { label: 'Affiliate', color: '#9D4EDD', bg: '#9D4EDD' },
  yelp:      { label: 'Yelp',      color: '#FF1A1A', bg: '#FF1A1A' },
  manual:    { label: 'Manual',    color: '#0084FF', bg: '#0084FF' },
};

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
    offerSource: 'direct',
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
    offerSource: 'direct',
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
    offerSource: 'direct',
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
    offerSource: 'direct',
  },
];

export function AdminOfferManagement({ onNavigate, theme = 'dark' }: AdminOfferManagementProps) {
  const isDark = theme === 'dark';
  const c = {
    bg: isDark ? 'bg-slate-900' : 'bg-[#F5F8FC]',
    card: isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]',
    cardSolid: isDark ? 'bg-slate-800' : 'bg-white',
    headerBg: isDark ? 'bg-slate-800 border-white/[0.08]' : 'bg-white border-[#E6ECF5]',
    text: isDark ? 'text-white' : 'text-[#0B1220]',
    textSec: isDark ? 'text-slate-400' : 'text-[#4B5C74]',
    textMuted: isDark ? 'text-slate-500' : 'text-[#8A9BB6]',
    border: isDark ? 'border-white/[0.08]' : 'border-[#E6ECF5]',
    input: isDark ? 'bg-slate-700/50 border-white/10 text-white placeholder:text-slate-500' : 'bg-[#F5F8FC] border-[#E6ECF5] text-[#0B1220] placeholder:text-[#8A9BB6]',
    tableHead: isDark ? 'bg-slate-800/80' : 'bg-[#F5F8FC]',
    rowHover: isDark ? 'hover:bg-slate-700/30' : 'hover:bg-[#F5F8FC]/50',
    modal: isDark ? 'bg-slate-800' : 'bg-white',
  };

  const [offers, setOffers] = useState<Offer[]>(SAMPLE_OFFERS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', discountValue: 0, isFreeItem: false, sourceUrl: '', category: 'food', type: 'percentage', expiresAt: '' });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGrouponModal, setShowGrouponModal] = useState(false);
  const [grouponDeals, setGrouponDeals] = useState<any[]>([]);
  const [grouponLoading, setGrouponLoading] = useState(false);
  const [grouponArea, setGrouponArea] = useState('Columbus, OH');
  const [grouponApproving, setGrouponApproving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ created_count: number; error_count: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const res = await adminApi.getOffers('all');
      if (res.success && res.data && Array.isArray(res.data)) {
        const mapped: Offer[] = res.data.map((o: any) => ({
          id: String(o.id),
          partnerId: o.partner_id || '',
          partnerName: o.business_name || '',
          title: o.title || o.description?.substring(0, 60) || '',
          description: o.description || '',
          type: o.is_free_item ? 'free' : 'percentage',
          discountValue: o.discount_percent || 0,
          isFreeItem: o.is_free_item || false,
          sourceUrl: o.offer_url || '',
          category: o.business_type || 'food',
          status: (o.status || 'active') as any,
          reach: o.views || 0,
          redemptions: o.redemption_count || 0,
          revenue: (o.redemption_count || 0) * 0.50,
          gemCostFree: o.base_gems || 45,
          gemCostPremium: o.base_gems || 45,
          createdAt: o.created_at?.split('T')[0] || '',
          expiresAt: o.expires_at?.split('T')[0],
          offerSource: o.offer_source || 'direct',
        }));
        if (mapped.length > 0) setOffers(mapped);
      }
    } catch (e) {
      console.log('Using sample offers');
    }
  };

  const handleExcelUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await adminApi.uploadExcel(file);
      if (res.data) {
        setUploadResult(res.data as any);
        loadOffers();
      }
    } catch (e) {
      setUploadResult({ created_count: 0, error_count: 1, errors: ['Upload failed'] });
    }
    setUploading(false);
  };
  
  const handleGrouponFetch = async () => {
    setGrouponLoading(true);
    setGrouponDeals([]);
    try {
      const res = await adminApi.importGrouponDeals(grouponArea);
      if (res.success && res.data?.deals) {
        setGrouponDeals(res.data.deals);
      }
    } catch (e) {
      console.error('Groupon fetch failed', e);
    }
    setGrouponLoading(false);
  };

  const handleApproveGrouponDeals = async (selectedDeals: any[]) => {
    setGrouponApproving(true);
    try {
      const res = await adminApi.approveImports(selectedDeals);
      if (res.success) {
        setShowGrouponModal(false);
        setGrouponDeals([]);
        loadOffers();
      }
    } catch (e) {
      console.error('Approve imports failed', e);
    }
    setGrouponApproving(false);
  };

  const [newOffer, setNewOffer] = useState({
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

  const handleCreateOffer = async () => {
    const autoGems = calculateAutoGems(newOffer.discountValue, newOffer.isFreeItem);
    
    try {
      await adminApi.createOffer({
        business_name: newOffer.partnerName,
        business_type: newOffer.category,
        description: newOffer.description || newOffer.title,
        title: newOffer.title,
        discount_percent: newOffer.discountValue,
        is_free_item: newOffer.isFreeItem,
        base_gems: autoGems,
        offer_url: newOffer.sourceUrl,
        is_admin_offer: true,
        status: 'active',
      });
      loadOffers();
    } catch (e) {
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
        gemCostFree: autoGems,
        gemCostPremium: autoGems,
        createdAt: new Date().toISOString().split('T')[0],
        expiresAt: newOffer.expiresAt || undefined,
        offerSource: 'direct',
      };
      setOffers([offer, ...offers]);
    }

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

  const deleteOffer = async (offerId: string) => {
    try { await adminApi.deleteOffer(offerId); } catch {}
    setOffers(offers.filter(offer => offer.id !== offerId));
  };

  const handleEditOpen = (offer: Offer) => {
    setEditingOffer(offer);
    setEditForm({
      title: offer.title,
      description: offer.description,
      discountValue: offer.discountValue,
      isFreeItem: offer.isFreeItem,
      sourceUrl: offer.sourceUrl,
      category: offer.category,
      type: offer.type,
      expiresAt: offer.expiresAt || '',
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingOffer) return;
    const autoGems = calculateAutoGems(editForm.discountValue, editForm.isFreeItem);
    try {
      await adminApi.updateOffer(editingOffer.id, {
        title: editForm.title,
        description: editForm.description,
        discount_percent: editForm.discountValue,
        is_free_item: editForm.isFreeItem,
        base_gems: autoGems,
        offer_url: editForm.sourceUrl,
        business_type: editForm.category,
      });
      loadOffers();
    } catch {
      setOffers(offers.map(o => o.id === editingOffer.id ? {
        ...o,
        title: editForm.title,
        description: editForm.description,
        discountValue: editForm.discountValue,
        isFreeItem: editForm.isFreeItem,
        sourceUrl: editForm.sourceUrl,
        category: editForm.category,
        type: editForm.type,
        gemCostFree: autoGems,
        gemCostPremium: autoGems,
        expiresAt: editForm.expiresAt || undefined,
      } : o));
    }
    setShowEditModal(false);
    setEditingOffer(null);
  };

  const editPreviewTier = getOfferTier(editForm.discountValue, editForm.isFreeItem);
  const editPreviewGems = calculateAutoGems(editForm.discountValue, editForm.isFreeItem);

  const previewTier = getOfferTier(newOffer.discountValue, newOffer.isFreeItem);
  const previewAutoGems = calculateAutoGems(newOffer.discountValue, newOffer.isFreeItem);

  return (
    <div className={`min-h-screen ${c.bg}`}>
      {/* Header */}
      <div className={`${c.headerBg} border-b ${c.border} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${c.text} text-[24px] font-bold`}>Offer Management</h1>
            <p className={`${c.textSec} text-[14px]`}>Create and manage partner offers with automatic gem pricing</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGrouponModal(true)}
              className="h-11 px-5 rounded-xl bg-[#FF6B00] text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={18} />
              Import Groupon
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="h-11 px-5 rounded-xl bg-[#9D4EDD] text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Upload size={18} />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Plus size={20} />
              Add New Offer
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className={`rounded-xl p-4 border ${c.card}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center">
                <Gift size={20} className="text-[#0084FF]" />
              </div>
              <div className="flex items-center gap-1 text-[#00DFA2]">
                <TrendingUp size={14} />
                <span className="text-[12px] font-semibold">+12%</span>
              </div>
            </div>
            <p className={`${c.textSec} text-[12px]`}>Total Offers</p>
            <p className={`${c.text} text-[24px] font-bold`}>{offers.length}</p>
          </div>
          
          <div className={`rounded-xl p-4 border ${c.card}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-[#00DFA2]" />
              </div>
            </div>
            <p className={`${c.textSec} text-[12px]`}>Active Offers</p>
            <p className={`${c.text} text-[24px] font-bold`}>{offers.filter(o => o.status === 'active').length}</p>
          </div>
          
          <div className={`rounded-xl p-4 border ${c.card}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/10 flex items-center justify-center">
                <Users size={20} className="text-[#9D4EDD]" />
              </div>
            </div>
            <p className={`${c.textSec} text-[12px]`}>Total Redemptions</p>
            <p className={`${c.text} text-[24px] font-bold`}>{offers.reduce((acc, o) => acc + o.redemptions, 0).toLocaleString()}</p>
          </div>
          
          <div className={`rounded-xl p-4 border ${c.card}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#FFC24C]/10 flex items-center justify-center">
                <DollarSign size={20} className="text-[#FFC24C]" />
              </div>
            </div>
            <p className={`${c.textSec} text-[12px]`}>Revenue Generated</p>
            <p className={`${c.text} text-[24px] font-bold`}>${offers.reduce((acc, o) => acc + o.revenue, 0).toLocaleString()}</p>
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
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Standard (&lt;5% off)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#0084FF]" />
                <span className="font-bold">45 gems</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Premium (≥5% off)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#9D4EDD]" />
                <span className="font-bold">100 gems</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wider mb-1">Exclusive (Free Items)</p>
              <div className="flex items-center gap-2">
                <Diamond size={16} className="text-[#00DFA2]" />
                <span className="font-bold">125 gems</span>
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
              className={`w-full h-11 pl-11 pr-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
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
                    : `border ${c.card} ${c.textSec} ${c.rowHover}`
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
        <div className={`rounded-xl border ${c.card} overflow-hidden`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${c.border} ${c.tableHead}`}>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Offer</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Source</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Gem Cost</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Status</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Performance</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Revenue</th>
                <th className={`text-left p-4 ${c.textSec} text-[12px] font-semibold uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className={`border-b ${c.border} ${c.rowHover} transition-colors`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0084FF] to-[#00DFA2] flex items-center justify-center text-white">
                        <Tag size={18} />
                      </div>
                      <div>
                        <p className={`${c.text} font-semibold`}>{offer.title}</p>
                        <p className={`${c.textMuted} text-[13px]`}>{offer.partnerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1.5">
                      {(() => {
                        const badge = SOURCE_BADGE[offer.offerSource] || SOURCE_BADGE.direct;
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: badge.bg }}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                      {offer.sourceUrl && (
                        <div className="flex items-center gap-1.5">
                          <Link size={12} className="text-[#8A9BB6]" />
                          <a
                            href={offer.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0084FF] text-[12px] hover:underline truncate max-w-[120px]"
                          >
                            {offer.sourceUrl.replace('https://', '').split('/')[0]}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Diamond size={14} className={c.textMuted} />
                        <span className={`${c.text} font-semibold`}>{offer.gemCostFree}</span>
                        <span className={`${c.textMuted} text-[11px]`}>free users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Diamond size={14} className="text-[#9D4EDD]" />
                        <span className={`${c.text} font-semibold`}>{offer.gemCostPremium}</span>
                        <span className={`${c.textMuted} text-[11px]`}>premium</span>
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
                        <Eye size={14} className={c.textMuted} />
                        <span className={c.text}>{offer.reach.toLocaleString()} reach</span>
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <Users size={14} className={c.textMuted} />
                        <span className={c.text}>{offer.redemptions.toLocaleString()} redeemed</span>
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
                        onClick={() => handleEditOpen(offer)}
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

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowUploadModal(false); setUploadResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${c.modal} rounded-2xl p-8 max-w-lg w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`${c.text} text-[24px] font-bold mb-2`}>Bulk Upload Offers</h2>
              <p className={`${c.textSec} text-[14px] mb-6`}>Upload an Excel file (.xlsx) with offer data. Gems and discount tiers are auto-calculated.</p>
              
              <div
                className={`border-2 border-dashed ${c.border} rounded-xl p-8 text-center hover:border-[#0084FF] transition-colors cursor-pointer mb-4`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleExcelUpload(file);
                }}
              >
                <FileSpreadsheet size={40} className="text-[#0084FF] mx-auto mb-3" />
                <p className={`${c.text} font-medium mb-1`}>
                  {uploading ? 'Uploading...' : 'Drop Excel file here or click to browse'}
                </p>
                <p className={`${c.textMuted} text-[13px]`}>Supported: .xlsx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExcelUpload(file);
                  }}
                />
              </div>

              <a
                href={adminApi.getTemplateUrl()}
                className="flex items-center gap-2 text-[#0084FF] text-[13px] hover:underline mb-4"
                download
              >
                <Download size={14} /> Download Template (.xlsx)
              </a>

              {uploadResult && (
                <div className={`rounded-xl p-4 mb-4 ${uploadResult.error_count > 0 ? 'bg-[#FFC24C]/10 border border-[#FFC24C]/20' : 'bg-[#00DFA2]/10 border border-[#00DFA2]/20'}`}>
                  <p className={`font-semibold ${c.text}`}>
                    {uploadResult.created_count} offers created
                    {uploadResult.error_count > 0 && `, ${uploadResult.error_count} errors`}
                  </p>
                  {uploadResult.errors.length > 0 && (
                    <ul className="text-[#FF5A5A] text-[12px] mt-2 space-y-1">
                      {uploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowUploadModal(false); setUploadResult(null); }}
                  className={`flex-1 h-12 rounded-xl border-2 ${c.border} ${c.text} font-medium ${c.rowHover}`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groupon Import Modal */}
      <AnimatePresence>
        {showGrouponModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowGrouponModal(false); setGrouponDeals([]); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${c.modal} rounded-2xl p-8 max-w-2xl w-full max-h-[85vh] flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`${c.text} text-[24px] font-bold mb-2`}>Import from Groupon</h2>
              <p className={`${c.textSec} text-[14px] mb-6`}>Fetch deals via CJ Affiliate API. Review and approve before they go live.</p>

              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Area (e.g. Columbus, OH)"
                  value={grouponArea}
                  onChange={(e) => setGrouponArea(e.target.value)}
                  className={`flex-1 h-11 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]`}
                />
                <button
                  onClick={handleGrouponFetch}
                  disabled={grouponLoading}
                  className="h-11 px-5 rounded-xl bg-[#FF6B00] text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {grouponLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Fetch Deals
                </button>
              </div>

              {grouponDeals.length === 0 && !grouponLoading && (
                <div className={`flex-1 flex items-center justify-center ${c.textMuted} text-[14px]`}>
                  {grouponArea ? 'Click "Fetch Deals" to search. (CJ_API_KEY must be set in .env)' : 'Enter an area to search'}
                </div>
              )}

              {grouponDeals.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {grouponDeals.map((deal: any, idx: number) => (
                    <div key={idx} className={`border ${c.border} rounded-xl p-4 flex items-start gap-3`}>
                      <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0">
                        <ExternalLink size={18} className="text-[#FF6B00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`${c.text} font-semibold text-[14px] truncate`}>{deal.title || deal.business_name}</p>
                        <p className={`${c.textSec} text-[12px] truncate`}>{deal.business_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {deal.discount_percent > 0 && (
                            <span className="text-[#00DFA2] text-[12px] font-semibold">{deal.discount_percent}% off</span>
                          )}
                          {deal.original_price > 0 && (
                            <span className="text-[#8A9BB6] text-[12px]">${deal.original_price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowGrouponModal(false); setGrouponDeals([]); }}
                  className={`flex-1 h-12 rounded-xl border-2 ${c.border} ${c.text} font-medium ${c.rowHover}`}
                >
                  Cancel
                </button>
                {grouponDeals.length > 0 && (
                  <button
                    onClick={() => handleApproveGrouponDeals(grouponDeals)}
                    disabled={grouponApproving}
                    className="flex-1 h-12 rounded-xl bg-[#FF6B00] text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {grouponApproving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    Approve All ({grouponDeals.length})
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className={`${c.modal} rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`${c.text} text-[24px] font-bold mb-6`}>Create New Offer</h2>
              
              <div className="space-y-6">
                {/* Partner Name */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Partner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Coffee House"
                    value={newOffer.partnerName}
                    onChange={(e) => setNewOffer({ ...newOffer, partnerName: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                </div>

                {/* Offer Title */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Offer Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., 15% off any drink"
                    value={newOffer.title}
                    onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                </div>

                {/* Source URL */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>
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
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                  <p className={`${c.textMuted} text-[12px] mt-1`}>Link to the partner's offer page for verification</p>
                </div>

                {/* Offer Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Offer Type</label>
                    <select
                      value={newOffer.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setNewOffer({ 
                          ...newOffer, 
                          type,
                          isFreeItem: type === 'free'
                        });
                      }}
                      className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="dollar">Dollar Off</option>
                      <option value="free">Free Item</option>
                      <option value="bogo">Buy One Get One</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block ${c.text} text-[14px] font-medium mb-2`}>
                      {newOffer.type === 'free' ? 'Original Value ($)' : 'Discount Value'}
                    </label>
                    <input
                      type="number"
                      placeholder={newOffer.type === 'percentage' ? '15' : '5'}
                      value={newOffer.discountValue || ''}
                      onChange={(e) => setNewOffer({ ...newOffer, discountValue: parseInt(e.target.value) || 0 })}
                      className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Category</label>
                  <select
                    value={newOffer.category}
                    onChange={(e) => setNewOffer({ ...newOffer, category: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
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
                    <span className={`${isDark ? 'text-white' : 'text-[#0B1220]'} font-bold`}>Automatic Gem Pricing Preview</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${isDark ? 'text-slate-300' : 'text-[#4B5C74]'} text-[12px] mb-1`}>Tier: <span className="font-semibold" style={{ color: previewTier.color }}>{previewTier.label}</span></p>
                      <p className={`${isDark ? 'text-slate-400' : 'text-[#8A9BB6]'} text-[11px]`}>
                        {newOffer.isFreeItem 
                          ? 'Free items have highest gem value' 
                          : newOffer.discountValue <= 10 
                            ? 'Standard discount (≤10%)' 
                            : 'Premium discount (>10%)'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Diamond size={18} className="text-[#9D4EDD]" />
                        <span className={`${isDark ? 'text-white' : 'text-[#0B1220]'} text-[24px] font-bold`}>{previewAutoGems}</span>
                      </div>
                      <p className={`${isDark ? 'text-slate-400' : 'text-[#8A9BB6]'} text-[11px]`}>Gem Reward</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#0084FF]/20">
                    <div className={`flex items-center gap-2 ${c.textSec} text-[12px]`}>
                      <AlertTriangle size={14} className="text-[#FFC24C]" />
                      <span>Gem costs are automatically calculated based on discount value. Partners cannot set custom gem prices.</span>
                    </div>
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Expiration Date (Optional)</label>
                  <input
                    type="date"
                    value={newOffer.expiresAt}
                    onChange={(e) => setNewOffer({ ...newOffer, expiresAt: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Description</label>
                  <textarea
                    placeholder="Brief description of the offer..."
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    className={`w-full h-24 p-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF] resize-none`}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 h-12 rounded-xl border-2 ${c.border} ${c.text} font-medium ${c.rowHover} transition-colors`}
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

      {/* Edit Offer Modal */}
      <AnimatePresence>
        {showEditModal && editingOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowEditModal(false); setEditingOffer(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${c.modal} rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`${c.text} text-[24px] font-bold mb-6`}>Edit Offer</h2>
              <div className="space-y-6">
                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Offer Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                </div>

                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Source URL</label>
                  <input
                    type="url"
                    value={editForm.sourceUrl}
                    onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Offer Type</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setEditForm({ ...editForm, type, isFreeItem: type === 'free' });
                      }}
                      className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="dollar">Dollar Off</option>
                      <option value="free">Free Item</option>
                      <option value="bogo">Buy One Get One</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Discount Value</label>
                    <input
                      type="number"
                      value={editForm.discountValue || ''}
                      onChange={(e) => setEditForm({ ...editForm, discountValue: parseInt(e.target.value) || 0 })}
                      className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className={`w-full h-12 px-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF]`}
                  >
                    {OFFER_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gradient-to-r from-[#004A93]/10 to-[#0084FF]/10 rounded-xl p-5 border border-[#0084FF]/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-[#0084FF]" />
                    <span className={`${isDark ? 'text-white' : 'text-[#0B1220]'} font-bold`}>Updated Gem Pricing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`${isDark ? 'text-slate-300' : 'text-[#4B5C74]'} text-[12px]`}>Tier: <span className="font-semibold" style={{ color: editPreviewTier.color }}>{editPreviewTier.label}</span></p>
                    <div className="flex items-center gap-1">
                      <Diamond size={18} className="text-[#9D4EDD]" />
                      <span className={`${isDark ? 'text-white' : 'text-[#0B1220]'} text-[24px] font-bold`}>{editPreviewGems}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block ${c.text} text-[14px] font-medium mb-2`}>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className={`w-full h-24 p-4 border rounded-xl ${c.input} focus:outline-none focus:ring-2 focus:ring-[#0084FF]/20 focus:border-[#0084FF] resize-none`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setShowEditModal(false); setEditingOffer(null); }}
                    className={`flex-1 h-12 rounded-xl border-2 ${c.border} ${c.text} font-medium ${c.rowHover} transition-colors`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    disabled={!editForm.title}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#00DFA2] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                  >
                    Save Changes
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
