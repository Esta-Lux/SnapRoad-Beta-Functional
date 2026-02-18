// SnapRoad Partner Portal - Payouts & Earnings
// Track earnings, payouts, and financial history

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Eye,
  Wallet
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface PartnerPayoutsProps {
  onNavigate: (page: string) => void;
}

interface Payout {
  id: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing';
  date: string;
  method: 'bank' | 'stripe';
  reference: string;
}

interface Transaction {
  id: string;
  type: 'earning' | 'fee' | 'payout';
  description: string;
  amount: number;
  date: string;
  offerId?: string;
}

const PAYOUTS: Payout[] = [
  { id: 'PAY-001', amount: 2840.50, status: 'completed', date: '2025-02-15', method: 'bank', reference: 'REF-2840550' },
  { id: 'PAY-002', amount: 3120.00, status: 'processing', date: '2025-02-01', method: 'bank', reference: 'REF-3120000' },
  { id: 'PAY-003', amount: 2650.75, status: 'completed', date: '2025-01-15', method: 'stripe', reference: 'REF-2650750' },
  { id: 'PAY-004', amount: 2980.25, status: 'completed', date: '2025-01-01', method: 'bank', reference: 'REF-2980250' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 'TRX-001', type: 'earning', description: 'Redemption: $0.15 off per gallon', amount: 0.50, date: '2025-02-17 14:32' },
  { id: 'TRX-002', type: 'earning', description: 'Redemption: Free Car Wash', amount: 0.50, date: '2025-02-17 13:45' },
  { id: 'TRX-003', type: 'earning', description: 'Redemption: $0.15 off per gallon', amount: 0.50, date: '2025-02-17 12:18' },
  { id: 'TRX-004', type: 'fee', description: 'Platform fee (February)', amount: -42.50, date: '2025-02-15 00:00' },
  { id: 'TRX-005', type: 'payout', description: 'Payout to Bank Account', amount: -2840.50, date: '2025-02-15 00:00' },
  { id: 'TRX-006', type: 'earning', description: 'Redemption: 20% off Oil Change', amount: 0.50, date: '2025-02-14 16:22' },
  { id: 'TRX-007', type: 'earning', description: 'Redemption: Free Car Wash', amount: 0.50, date: '2025-02-14 11:05' },
];

export function PartnerPayouts({ onNavigate }: PartnerPayoutsProps) {
  const { theme } = useSnaproadTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  
  const isDark = theme === 'dark';

  const earnings = {
    currentBalance: 1247.50,
    pendingPayout: 3120.00,
    thisMonth: 4280.75,
    lastMonth: 3650.25,
    totalEarned: 45680.00,
    redemptionFee: 0.50,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#00DFA2]/10 text-[#00DFA2]">
            <CheckCircle size={12} />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFC24C]/10 text-[#FFC24C]">
            <Clock size={12} />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#0084FF]/10 text-[#0084FF]">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
            Payouts & Earnings
          </h1>
          <p className={isDark ? 'text-white/60' : 'text-[#4B5C74]'}>
            Track your earnings and manage payouts
          </p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
        >
          <Wallet size={20} />
          Request Payout
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className={`p-6 rounded-xl border-2 border-[#00DFA2]/30 ${isDark ? 'bg-gradient-to-br from-[#00DFA2]/10 to-transparent' : 'bg-gradient-to-br from-[#00DFA2]/5 to-white'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#00DFA2]/20 flex items-center justify-center">
              <Wallet size={24} className="text-[#00DFA2]" />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Available Balance</p>
          <p className="text-3xl font-bold text-[#00DFA2]">${earnings.currentBalance.toLocaleString()}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
            Ready for payout
          </p>
        </motion.div>

        <motion.div
          className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFC24C]/10 flex items-center justify-center">
              <Clock size={24} className="text-[#FFC24C]" />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Pending Payout</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>${earnings.pendingPayout.toLocaleString()}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
            Processing (2-3 days)
          </p>
        </motion.div>

        <motion.div
          className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
              <Calendar size={24} className="text-[#0084FF]" />
            </div>
            <div className="flex items-center gap-1 text-[#00DFA2] text-sm font-medium">
              <TrendingUp size={14} />
              +17%
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>This Month</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>${earnings.thisMonth.toLocaleString()}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
            vs ${earnings.lastMonth.toLocaleString()} last month
          </p>
        </motion.div>

        <motion.div
          className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#9D4EDD]/10 flex items-center justify-center">
              <TrendingUp size={24} className="text-[#9D4EDD]" />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Total Earned</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>${earnings.totalEarned.toLocaleString()}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
            Since joining SnapRoad
          </p>
        </motion.div>
      </div>

      {/* Pricing Info */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0084FF]/5 border-[#0084FF]/20' : 'bg-[#0084FF]/5 border-[#0084FF]/10'}`}>
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-[#0084FF]" />
          <p className={isDark ? 'text-white' : 'text-[#0B1220]'}>
            <span className="font-semibold">Earning Structure:</span> You earn ${earnings.redemptionFee.toFixed(2)} for each offer redemption. Platform fees are deducted monthly.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'history', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#00DFA2] text-white'
                : isDark ? 'bg-[#1A1F2E] text-white/60 hover:text-white' : 'bg-white text-[#4B5C74] border border-[#E6ECF5] hover:bg-[#F5F8FA]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payouts */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Recent Payouts
              </h3>
              <button className="text-[#00DFA2] text-sm font-medium">View All</button>
            </div>
            <div className="space-y-3">
              {PAYOUTS.slice(0, 4).map((payout) => (
                <div key={payout.id} className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        payout.method === 'bank' ? 'bg-[#0084FF]/10' : 'bg-[#9D4EDD]/10'
                      }`}>
                        {payout.method === 'bank' ? (
                          <Building2 size={18} className="text-[#0084FF]" />
                        ) : (
                          <CreditCard size={18} className="text-[#9D4EDD]" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                          ${payout.amount.toLocaleString()}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-[#8A9BB6]'}`}>
                          {payout.date}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Recent Transactions
              </h3>
              <button className="text-[#00DFA2] text-sm font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {TRANSACTIONS.slice(0, 6).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E6ECF5' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      txn.type === 'earning' ? 'bg-[#00DFA2]/10' : txn.type === 'fee' ? 'bg-[#FF5A5A]/10' : 'bg-[#0084FF]/10'
                    }`}>
                      {txn.type === 'earning' ? (
                        <ArrowUpRight size={16} className="text-[#00DFA2]" />
                      ) : (
                        <ArrowDownRight size={16} className={txn.type === 'fee' ? 'text-[#FF5A5A]' : 'text-[#0084FF]'} />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                        {txn.description}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>
                        {txn.date}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    txn.amount >= 0 ? 'text-[#00DFA2]' : 'text-[#FF5A5A]'
                  }`}>
                    {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Payout History
            </h3>
            <button className={`h-10 px-4 rounded-xl flex items-center gap-2 ${
              isDark ? 'bg-[#0A0E16] text-white/60 border border-white/10' : 'bg-[#F5F8FA] text-[#4B5C74] border border-[#E6ECF5]'
            }`}>
              <Download size={18} />
              Export CSV
            </button>
          </div>
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'border-white/10' : 'border-[#E6ECF5]'}`}>
              <tr>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Reference</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Date</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Method</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Amount</th>
                <th className={`text-left py-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Status</th>
                <th className="text-right py-3"></th>
              </tr>
            </thead>
            <tbody>
              {PAYOUTS.map((payout) => (
                <tr key={payout.id} className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-[#E6ECF5]'}`}>
                  <td className={`py-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>{payout.reference}</td>
                  <td className={`py-4 ${isDark ? 'text-white/80' : 'text-[#4B5C74]'}`}>{payout.date}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {payout.method === 'bank' ? (
                        <Building2 size={16} className="text-[#0084FF]" />
                      ) : (
                        <CreditCard size={16} className="text-[#9D4EDD]" />
                      )}
                      <span className={isDark ? 'text-white/80' : 'text-[#4B5C74]'}>
                        {payout.method === 'bank' ? 'Bank Transfer' : 'Stripe'}
                      </span>
                    </div>
                  </td>
                  <td className={`py-4 font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    ${payout.amount.toLocaleString()}
                  </td>
                  <td className="py-4">{getStatusBadge(payout.status)}</td>
                  <td className="py-4 text-right">
                    <button className={isDark ? 'text-white/40 hover:text-white' : 'text-[#8A9BB6] hover:text-[#0B1220]'}>
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Payout Method */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Payout Method
            </h3>
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border-2 border-[#00DFA2] ${isDark ? 'bg-[#00DFA2]/5' : 'bg-[#00DFA2]/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0084FF]/10 flex items-center justify-center">
                      <Building2 size={24} className="text-[#0084FF]" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>Bank Account</p>
                      <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                        ****4589 - Chase Bank
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#00DFA2]/10 text-[#00DFA2]">Primary</span>
                    <button className="text-[#0084FF] text-sm font-medium">Edit</button>
                  </div>
                </div>
              </div>
              <button className={`w-full p-4 rounded-xl border-2 border-dashed text-center ${
                isDark ? 'border-white/10 text-white/60 hover:border-white/20' : 'border-[#E6ECF5] text-[#4B5C74] hover:border-[#0084FF]'
              }`}>
                + Add New Payout Method
              </button>
            </div>
          </div>

          {/* Payout Schedule */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#1A1F2E] border-white/10' : 'bg-white border-[#E6ECF5]'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
              Payout Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Frequency</p>
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>Monthly (15th)</p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#0A0E16]' : 'bg-[#F5F8FA]'}`}>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>Minimum Payout</p>
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>$50.00</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Payout Modal */}
      <AnimatePresence>
        {showPayoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPayoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-8 max-w-md w-full ${isDark ? 'bg-[#1A1F2E]' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                Request Payout
              </h2>
              <p className={`mb-6 ${isDark ? 'text-white/60' : 'text-[#4B5C74]'}`}>
                Available balance: <span className="text-[#00DFA2] font-semibold">${earnings.currentBalance.toLocaleString()}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Amount
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    defaultValue={earnings.currentBalance}
                    className={`w-full h-12 px-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00DFA2]/20 focus:border-[#00DFA2] ${
                      isDark ? 'bg-[#0A0E16] border-white/10 text-white' : 'bg-[#F5F8FA] border-[#E6ECF5] text-[#0B1220]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-[#0B1220]'}`}>
                    Payout Method
                  </label>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0A0E16] border-white/10' : 'bg-[#F5F8FA] border-[#E6ECF5]'}`}>
                    <div className="flex items-center gap-3">
                      <Building2 size={20} className="text-[#0084FF]" />
                      <div>
                        <p className={isDark ? 'text-white' : 'text-[#0B1220]'}>Bank Account ****4589</p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-[#8A9BB6]'}`}>Processing: 2-3 business days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className={`flex-1 h-12 rounded-xl border ${
                    isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-[#E6ECF5] text-[#0B1220] hover:bg-[#F5F8FA]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#00DFA2] to-[#00BF8F] text-white font-semibold"
                >
                  Request Payout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PartnerPayouts;
