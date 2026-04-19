import { useMemo } from 'react'
import { Download, ExternalLink, QrCode, Receipt } from 'lucide-react'
import type { PartnerFeeSummary, PartnerRedemption } from '@/types/partner'

interface Props {
  redemptions: PartnerRedemption[]
  feeInfo: PartnerFeeSummary | null
  onExportCsv: () => void
  onOpenScanner: () => void
}

function formatMoney(value?: number, cents?: number) {
  const amount = typeof value === 'number' ? value : (typeof cents === 'number' ? cents / 100 : 0)
  return `$${amount.toFixed(2)}`
}

function formatWhen(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function RedemptionsTab({ redemptions, feeInfo, onExportCsv, onOpenScanner }: Props) {
  const progress = useMemo(() => {
    if (!feeInfo?.next_threshold || !feeInfo.total_redemptions) return 0
    const inBand = feeInfo.total_redemptions % 500
    return Math.min(100, Math.max(0, (inBand / 500) * 100))
  }, [feeInfo])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <p className="text-slate-400 text-xs mb-1">This month</p>
          <p className="text-2xl font-bold text-white">{feeInfo?.total_redemptions?.toLocaleString() || 0}</p>
          <p className="text-slate-500 text-xs mt-1">verified redemptions</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <p className="text-slate-400 text-xs mb-1">Current fee tier</p>
          <p className="text-2xl font-bold text-amber-400">Tier {feeInfo?.current_tier || 1}</p>
          <p className="text-slate-500 text-xs mt-1">{formatMoney(feeInfo?.current_fee)}</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <p className="text-slate-400 text-xs mb-1">Fees owed</p>
          <p className="text-2xl font-bold text-red-400">{formatMoney(feeInfo?.total_owed)}</p>
          <p className="text-slate-500 text-xs mt-1">balance due {formatMoney(feeInfo?.balance_due)}</p>
        </div>
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
          <p className="text-slate-400 text-xs mb-1">Next threshold</p>
          <p className="text-2xl font-bold text-cyan-400">{feeInfo?.redemptions_until_next_tier ?? 0}</p>
          <p className="text-slate-500 text-xs mt-1">redemptions until next tier</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Receipt size={18} className="text-amber-400 shrink-0" /> Fee Tier Progress
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {feeInfo?.next_threshold
                ? `${feeInfo.redemptions_until_next_tier ?? 0} redemptions away from the next threshold`
                : 'No threshold data available yet'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            <button
              type="button"
              onClick={onExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 hover:bg-white/10 flex items-center justify-center gap-2 text-sm min-w-0"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 flex items-center justify-center gap-2 text-sm flex-1 sm:flex-initial min-w-[140px]"
            >
              <QrCode size={16} /> Team Scan Links
            </button>
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          <span>{feeInfo?.tier_range || '1-500'}</span>
          <span>Next: {feeInfo?.next_threshold || 500}</span>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-4 py-4 border-b border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h3 className="text-white font-semibold">Recent Redemptions</h3>
            <p className="text-slate-400 text-sm mt-1">Verified scans and direct redemptions recorded for your offers.</p>
          </div>
          <a
            href="/scan/default_partner"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 text-sm inline-flex items-center gap-2 hover:text-cyan-200"
          >
            Team scan page <ExternalLink size={14} />
          </a>
        </div>

        {redemptions.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No redemptions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Redeemed</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Offer</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Customer</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">In-store scan</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Discount</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Fee</th>
                  <th className="text-left px-3 py-3 font-medium sm:px-6">Tier</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((row, idx) => {
                  const used = Boolean(row.used_in_store) || (row.scanned_by_user_id != null && String(row.scanned_by_user_id).trim() !== '')
                  return (
                  <tr key={`${row.offer_id}-${row.redeemed_at || row.created_at || idx}`} className="border-t border-white/5 text-slate-200">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs">{formatWhen(row.redeemed_at || row.created_at)}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 min-w-[140px]">
                      <div className="font-medium text-white break-words">{row.offer_name || row.business_name || `Offer ${row.offer_id}`}</div>
                      <div className="text-xs text-slate-500">Offer #{row.offer_id}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 max-w-[120px] truncate sm:max-w-none">{row.user_name || row.customer_id || 'Driver'}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <span className={used ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>{used ? 'Yes' : 'Pending'}</span>
                      {used && row.scanned_by_user_id ? (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate max-w-[140px]" title={String(row.scanned_by_user_id)}>
                          staff {String(row.scanned_by_user_id).slice(0, 8)}…
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-emerald-300">{row.discount_applied ? `${row.discount_applied}%` : '—'}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-amber-300 whitespace-nowrap">{formatMoney(row.fee_amount, row.fee_cents)}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">{row.fee_tier ? `Tier ${row.fee_tier}` : '—'}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
