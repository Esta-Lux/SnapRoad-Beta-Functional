// Finance & Revenue Tab
// =============================================

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, CreditCard, Download, Calendar, Filter, Search, BarChart3 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface FinanceTabProps {
  theme: 'dark' | 'light'
}

export default function FinanceTab({ theme }: FinanceTabProps) {
  const [finance, setFinance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [revenueType, setRevenueType] = useState('all')

  useEffect(() => {
    loadFinanceData()
  }, [dateRange, revenueType])

  const loadFinanceData = async () => {
    setLoading(true)
    try {
      // Mock data - in real app, this would call backend API
      const mockData = {
        summary: {
          total_revenue: 125680,
          net_profit: 45240,
          total_transactions: 3420,
          avg_transaction_value: 36.75,
          monthly_growth: 12.5,
          profit_margin: 36.0
        },
        revenue_trend: [
          { date: 'Jan 1', revenue: 8500, profit: 3200, transactions: 245 },
          { date: 'Jan 8', revenue: 9200, profit: 3480, transactions: 267 },
          { date: 'Jan 15', revenue: 8900, profit: 3360, transactions: 258 },
          { date: 'Jan 22', revenue: 9800, profit: 3720, transactions: 284 },
          { date: 'Jan 29', revenue: 10200, profit: 3870, transactions: 296 },
          { date: 'Feb 5', revenue: 10800, profit: 4100, transactions: 313 },
          { date: 'Feb 12', revenue: 11200, profit: 4250, transactions: 325 },
          { date: 'Feb 19', revenue: 11800, profit: 4480, transactions: 342 },
        ],
        revenue_sources: [
          { name: 'Premium Subscriptions', value: 45, color: '#8b5cf6' },
          { name: 'Partner Commissions', value: 25, color: '#3b82f6' },
          { name: 'Boost Services', value: 20, color: '#10b981' },
          { name: 'Transaction Fees', value: 10, color: '#f59e0b' },
        ],
        top_transactions: [
          { id: 'TXN001', type: 'Premium Subscription', amount: 29.99, user: 'John Smith', date: '2024-02-19', status: 'completed' },
          { id: 'TXN002', type: 'Partner Commission', amount: 45.00, user: 'Shell Gas Station', date: '2024-02-19', status: 'completed' },
          { id: 'TXN003', type: 'Boost Purchase', amount: 75.00, user: 'Sarah Wilson', date: '2024-02-19', status: 'completed' },
          { id: 'TXN004', type: 'Transaction Fee', amount: 2.50, user: 'Mike Johnson', date: '2024-02-19', status: 'completed' },
          { id: 'TXN005', type: 'Premium Subscription', amount: 29.99, user: 'Emily Davis', date: '2024-02-18', status: 'completed' },
        ]
      }
      setFinance(mockData)
    } catch (error) {
      console.error('Failed to load finance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">${finance.summary.total_revenue.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Revenue</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>+{finance.summary.monthly_growth}%</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">${finance.summary.net_profit.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Net Profit</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
            <TrendingUp size={12} />
            <span>{finance.summary.profit_margin}% margin</span>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <CreditCard className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{finance.summary.total_transactions.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Transactions</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">${finance.summary.avg_transaction_value}</div>
              <div className="text-xs text-slate-400">Avg Transaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search transactions..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <select
            value={revenueType}
            onChange={(e) => setRevenueType(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="all">All Revenue</option>
            <option value="subscriptions">Subscriptions</option>
            <option value="commissions">Commissions</option>
            <option value="fees">Transaction Fees</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={finance.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Sources */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={finance.revenue_sources}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {finance.revenue_sources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-slate-800/50' : 'bg-[#F8FAFC]'}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {finance.top_transactions.map((transaction) => (
                <tr key={transaction.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-[#F8FAFC]'}>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-white">{transaction.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">{transaction.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">${transaction.amount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">{transaction.user}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400">{transaction.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
