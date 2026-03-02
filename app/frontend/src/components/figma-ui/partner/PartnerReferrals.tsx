// SnapRoad Partner Portal - Business Referral System
// Partners can refer other businesses for $5 credit (usable for subscription or offer boosting)

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Gift,
  DollarSign,
  Copy,
  Check,
  Send,
  TrendingUp,
  Clock,
  CheckCircle,
  Mail,
  Link2,
  Share2,
  Sparkles,
  Rocket,
  Crown,
  ArrowRight
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface PartnerReferralsProps {
  onNavigate: (page: string) => void;
}

interface Referral {
  id: string;
  businessName: string;
  email: string;
  status: 'pending' | 'signed_up' | 'active';
  creditEarned: number;
  referredAt: string;
  activatedAt?: string;
}

const SAMPLE_REFERRALS: Referral[] = [
  { id: '1', businessName: 'Quick Lube Express', email: 'owner@quicklube.com', status: 'active', creditEarned: 5.00, referredAt: '2025-02-10', activatedAt: '2025-02-12' },
  { id: '2', businessName: 'City Car Wash', email: 'manager@citywash.com', status: 'signed_up', creditEarned: 0, referredAt: '2025-02-14' },
  { id: '3', businessName: 'Prime Auto Repair', email: 'info@primeauto.com', status: 'pending', creditEarned: 0, referredAt: '2025-02-16' },
  { id: '4', businessName: 'Gas & Go Station', email: 'partner@gasgo.com', status: 'active', creditEarned: 5.00, referredAt: '2025-01-28', activatedAt: '2025-02-01' },
  { id: '5', businessName: 'TireMax Center', email: 'sales@tiremax.com', status: 'active', creditEarned: 5.00, referredAt: '2025-01-20', activatedAt: '2025-01-25' },
];

export function PartnerReferrals({ onNavigate }: PartnerReferralsProps) {
  const { theme } = useSnaproadTheme();
  const [referrals] = useState<Referral[]>(SAMPLE_REFERRALS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCreditUse, setSelectedCreditUse] = useState<'subscription' | 'boosting' | null>(null);
  
  const isDark = theme === 'dark';
  
  const referralCode = 'SNAPPARTNER-FUEL2025';
  const referralLink = `https://snaproad.com/partner/join?ref=${referralCode}`;
  
  const stats = {
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter(r => r.status === 'active').length,
    pendingReferrals: referrals.filter(r => r.status === 'pending' || r.status === 'signed_up').length,
    totalCreditsEarned: referrals.reduce((acc, r) => acc + r.creditEarned, 0),
    availableCredits: 15.00,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00DFA2]/10 text-[#00DFA2]">
            <CheckCircle size={12} />
            Active
          </span>
        );
      case 'signed_up':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#0084FF]/10 text-[#0084FF]">
            <Users size={12} />
            Signed Up
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFC24C]/10 text-[#FFC24C]">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" data-testid="partner-referrals-page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Business Referrals
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            Refer other businesses and earn $5 credit each
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
          data-testid="invite-business-btn"
        >
          <Send size={20} />
          Invite Business
        </button>
      </div>

      {/* How It Works Banner */}
      <motion.div 
        className={`rounded-xl p-5 border-2 border-[#00DFA2]/30 ${
          isDark ? 'bg-gradient-to-r from-[#00DFA2]/10 to-transparent' : 'bg-gradient-to-r from-[#00DFA2]/5 to-white'
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#00DFA2]/20 flex items-center justify-center flex-shrink-0">
            <Gift size={28} className="text-[#00DFA2]" />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Earn $5 for Every Business You Refer
            </h3>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
              When a business you refer becomes active on SnapRoad, you both receive $5 in credits.
              Use your credits for monthly subscription discounts or boost your offers for more visibility.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#0084FF]/10 flex items-center justify-center">
              <Users size={20} className="text-[#0084FF]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.totalReferrals}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Total Referrals</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-[#00DFA2]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{stats.activeReferrals}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Active Partners</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#9D4EDD]/10 flex items-center justify-center">
              <TrendingUp size={20} className="text-[#9D4EDD]" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>${stats.totalCreditsEarned.toFixed(2)}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Total Earned</p>
        </motion.div>

        <motion.div
          className={`p-5 rounded-xl border-2 border-[#00DFA2]/30 ${isDark ? 'bg-gradient-to-br from-[#00DFA2]/10 to-transparent' : 'bg-gradient-to-br from-[#00DFA2]/5 to-white'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00DFA2]/20 flex items-center justify-center">
              <DollarSign size={20} className="text-[#00DFA2]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#00DFA2]">${stats.availableCredits.toFixed(2)}</p>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>Available Credits</p>
        </motion.div>
      </div>

      {/* Use Credits Section */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
          Use Your Credits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedCreditUse('subscription')}
            className={`p-5 rounded-xl border-2 transition-all text-left ${
              selectedCreditUse === 'subscription'
                ? 'border-[#00DFA2] bg-[#00DFA2]/5'
                : isDark ? 'border-white/10 hover:border-white/20' : 'border-[#E6ECF5] hover:border-[#0084FF]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center flex-shrink-0">
                <Crown size={24} className="text-[#0084FF]" />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  Subscription Discount
                </h4>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Apply credits to reduce your monthly subscription cost
                </p>
                <p className="text-xs text-[#00DFA2] mt-2 font-medium">
                  Save ${stats.availableCredits.toFixed(2)} on your next bill
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedCreditUse('boosting')}
            className={`p-5 rounded-xl border-2 transition-all text-left ${
              selectedCreditUse === 'boosting'
                ? 'border-[#00DFA2] bg-[#00DFA2]/5'
                : isDark ? 'border-white/10 hover:border-white/20' : 'border-[#E6ECF5] hover:border-[#0084FF]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#9D4EDD]/10 flex items-center justify-center flex-shrink-0">
                <Rocket size={24} className="text-[#9D4EDD]" />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  Boost Your Offers
                </h4>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                  Use credits to promote your offers for more visibility
                </p>
                <p className="text-xs text-[#9D4EDD] mt-2 font-medium">
                  Get featured placement for {Math.floor(stats.availableCredits / 5)} days
                </p>
              </div>
            </div>
          </button>
        </div>
        
        {selectedCreditUse && (
          <motion.div 
            className="mt-4 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2">
              Apply ${stats.availableCredits.toFixed(2)} to {selectedCreditUse === 'subscription' ? 'Subscription' : 'Offer Boost'}
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Referral Code Card */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
          Your Referral Link
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                  Referral Code
                </p>
                <p className={`text-lg font-mono font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                  {referralCode}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(referralCode)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  copied ? 'bg-[#00DFA2] text-white' : isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-white text-[#4B5C74] hover:bg-[#E6ECF5]'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                  Referral Link
                </p>
                <p className={`text-sm font-mono truncate ${isDark ? 'text-white/80' : 'text-[#4B5C74]'}`}>
                  {referralLink}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(referralLink)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ml-3 ${
                  isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-white text-[#4B5C74] hover:bg-[#E6ECF5]'
                }`}
              >
                <Link2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Your Referrals
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'border-white/10' : 'border-[#E6ECF5]'}`}>
              <tr>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Business</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Email</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Referred</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Status</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Credit Earned</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr 
                  key={referral.id}
                  className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-[#E6ECF5]'}`}
                >
                  <td className={`py-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00DFA2] to-[#0084FF] flex items-center justify-center text-white font-bold text-sm">
                        {referral.businessName.charAt(0)}
                      </div>
                      <span className="font-medium">{referral.businessName}</span>
                    </div>
                  </td>
                  <td className={`py-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {referral.email}
                  </td>
                  <td className={`py-4 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    {referral.referredAt}
                  </td>
                  <td className="py-4">
                    {getStatusBadge(referral.status)}
                  </td>
                  <td className="py-4">
                    {referral.creditEarned > 0 ? (
                      <span className="text-[#00DFA2] font-semibold">+${referral.creditEarned.toFixed(2)}</span>
                    ) : (
                      <span className={isDark ? 'text-white/40' : 'text-[#8A9BB6]'}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-8 max-w-md w-full ${isDark ? 'bg-[#1A1F2E]' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
              data-testid="invite-modal"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#00DFA2]/10 flex items-center justify-center">
                  <Send size={24} className="text-[#00DFA2]" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Invite a Business
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                    Both of you earn $5 credit
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="partner@business.com"
                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00DFA2]/20 focus:border-[#00DFA2] ${
                      isDark ? 'bg-[#0A0E16] border-white/10 text-white placeholder:text-white/30' : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220] placeholder:text-[#8A9BB6]'
                    }`}
                    data-testid="invite-email-input"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Hey! I've been using SnapRoad for my business and thought you might like it too..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00DFA2]/20 focus:border-[#00DFA2] resize-none ${
                      isDark ? 'bg-[#0A0E16] border-white/10 text-white placeholder:text-white/30' : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220] placeholder:text-[#8A9BB6]'
                    }`}
                  />
                </div>

                <div className={`p-3 rounded-xl ${isDark ? 'bg-[#00DFA2]/5 border border-[#00DFA2]/20' : 'bg-[#00DFA2]/5'}`}>
                  <div className="flex items-center gap-2 text-[#00DFA2]">
                    <Sparkles size={16} />
                    <span className="text-sm font-medium">When they sign up, you both get $5!</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`flex-1 h-12 rounded-xl border ${
                    isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-[#E6ECF5] text-[#0B1220] hover:bg-[#F5F8FA]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle invite
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage('');
                  }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center justify-center gap-2"
                  data-testid="send-invite-btn"
                >
                  <Mail size={18} />
                  Send Invite
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PartnerReferrals;
