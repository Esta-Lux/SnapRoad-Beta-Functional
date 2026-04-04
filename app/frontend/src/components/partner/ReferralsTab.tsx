import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Share2, CheckCircle, Wallet, Award, Download, Copy,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { QRCodeCanvas } from 'qrcode.react'
import { partnerApi } from '@/services/partnerApi'
import { getPartnerPortalBaseUrl } from '@/lib/partnerPortalUrl'

/** Milestones when referred partners complete first paid month (Stripe). */
const REFERRAL_TIERS = [
  { name: 'Tier 1', range: '5 qualified partners', credits: '30 credits', color: '#CD7F32' },
  { name: 'Tier 2', range: '10 qualified partners', credits: '60 credits total', color: '#C0C0C0' },
  { name: 'Tier 3', range: '15 qualified partners', credits: '90 credits total', color: '#00DFA2' },
  { name: 'Tier 4', range: '20 qualified partners', credits: '120 credits total', color: '#FFD700' },
]

type LeaderboardRow = {
  rank: number
  name: string
  referrals: number
  credits: number
  partner_id: string
  badge?: string | null
}

type ReferralRow = { created_at?: string }

function buildReferralTrend(rows: ReferralRow[]): { month: string; referrals: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!r.created_at) continue
    const d = new Date(r.created_at)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const keys = [...map.keys()].sort()
  const last12 = keys.slice(-12)
  return last12.map((k) => {
    const [y, m] = k.split('-').map(Number)
    const label = new Date(y, m - 1).toLocaleString('default', { month: 'short' })
    return { month: label, referrals: map.get(k) ?? 0 }
  })
}

interface Props {
  partnerId?: string
}

export default function ReferralsTab({ partnerId }: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0, total_earned: 0 })
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [trendData, setTrendData] = useState<{ month: string; referrals: number }[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const qrRef = useRef<HTMLDivElement>(null)
  const referralLink = useMemo(() => {
    const base = getPartnerPortalBaseUrl()
    if (!partnerId || !base) return ''
    return `${base}/join?ref=${encodeURIComponent(partnerId)}`
  }, [partnerId])

  useEffect(() => {
    const load = async () => {
      setLeaderboardLoading(true)
      try {
        const [refRes, lbRes] = await Promise.all([
          partnerApi.getReferrals(),
          partnerApi.getReferralLeaderboard(),
        ])
        if (refRes.success && refRes.stats) {
          setReferralStats(refRes.stats)
          const rows = (refRes.data ?? []) as ReferralRow[]
          setTrendData(buildReferralTrend(rows))
        }
        if (lbRes.success && Array.isArray(lbRes.data)) {
          const mapped: LeaderboardRow[] = lbRes.data.map((e: Record<string, unknown>) => ({
            rank: Number(e.rank) || 0,
            name: String(e.name ?? 'Partner'),
            referrals: Number(e.referrals) || 0,
            credits: Number(e.credits) || 0,
            partner_id: String(e.partner_id ?? ''),
            badge: (e.badge as string | null | undefined) ?? null,
          }))
          setLeaderboard(mapped)
        } else {
          setLeaderboard([])
        }
      } catch (e) {
        console.error(e)
        setLeaderboard([])
      } finally {
        setLeaderboardLoading(false)
      }
    }
    void load()
  }, [partnerId])

  const copyLink = useCallback(() => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }, [referralLink])

  const shareLink = useCallback(async () => {
    if (!referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join SnapRoad as a Partner', url: referralLink })
      } catch { /* user cancelled */ }
    } else {
      copyLink()
    }
  }, [referralLink, copyLink])

  const downloadQR = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `snaproad-referral-qr-${partnerId || 'code'}.png`
    a.click()
  }, [partnerId])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {[
          { label: 'Referral rows', value: String(referralStats.total), icon: Share2, color: '#0084FF' },
          { label: 'Paid 1st month', value: String(referralStats.active), icon: CheckCircle, color: '#00DFA2' },
          { label: 'Credits (milestones)', value: String(Math.round(referralStats.total_earned)), icon: Wallet, color: '#F59E0B' },
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              <p className="text-slate-400 text-sm">{kpi.label}</p>
            </div>
            <p className="text-4xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Referral Link + QR Code - 2-column grid per Figma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral Link card */}
        <div className="bg-gradient-to-br from-[#0084FF]/10 to-[#00DFA2]/5 border border-[#0084FF]/20 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1">Your Referral Link</h3>
          <p className="text-slate-400 text-sm mb-4">
            Share this link; you earn milestone credits when referred partners pay their first subscription month (+30 per 5, up to 120).
          </p>
          {!referralLink && (
            <p className="text-amber-400/90 text-sm mb-4">Loading your partner link… If this persists, open the dashboard again after sign-in.</p>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-300 text-sm font-mono truncate">
              {referralLink || '—'}
            </div>
            <button type="button" onClick={copyLink} disabled={!referralLink} data-testid="copy-referral-link-btn"
              className="p-3 rounded-xl transition-all shrink-0 disabled:opacity-40"
              style={{ backgroundColor: copiedLink ? '#00DFA2' : '#0084FF20', color: copiedLink ? '#0B1220' : '#0084FF' }}>
              {copiedLink ? <CheckCircle size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button type="button" onClick={() => void shareLink()} disabled={!referralLink}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-40">
            <Share2 size={16} />
            Share Link
          </button>
        </div>

        {/* QR Code card */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-white font-semibold mb-4">QR Code</h3>
          <div ref={qrRef} className="bg-white rounded-xl p-4 mb-4 min-h-[192px] min-w-[192px] flex items-center justify-center">
            {referralLink ? (
              <QRCodeCanvas
                value={referralLink}
                size={160}
                bgColor="#ffffff"
                fgColor="#0B1220"
                level="H"
                includeMargin={false}
              />
            ) : (
              <span className="text-slate-500 text-sm px-4 text-center">Your QR appears when the link is ready</span>
            )}
          </div>
          <p className="text-slate-400 text-xs text-center mb-4">Scan to open your referral link</p>
          <button type="button" onClick={downloadQR} disabled={!referralLink}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 bg-white/10 text-white hover:bg-white/15 transition-all disabled:opacity-40">
            <Download size={16} />
            Download QR Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 min-w-0">
          <h3 className="text-white font-semibold mb-4">Referral Trend</h3>
          {trendData.length === 0 ? (
            <p className="text-slate-400 text-sm py-10 text-center">
              Your referral history will appear here once partners join using your link.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="refGradLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0084FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0084FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="referrals" stroke="#0084FF" fill="url(#refGradLive)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 min-w-0">
          <h3 className="text-white font-semibold mb-4">Reward Tiers</h3>
          <div className="space-y-3">
            {REFERRAL_TIERS.map((tier, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: `${tier.color}30`, backgroundColor: `${tier.color}08` }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: tier.color }}>{tier.name}</p>
                  <p className="text-slate-400 text-xs">{tier.range}</p>
                </div>
                <span className="text-white text-sm font-medium">{tier.credits}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Award size={18} className="text-amber-400" />Partner Leaderboard
        </h3>
        {leaderboardLoading ? (
          <p className="text-slate-400 text-sm py-8 text-center">Loading leaderboard…</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No referral activity yet. Share your link to climb the board.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = Boolean(partnerId && entry.partner_id === partnerId)
              return (
                <div key={`${entry.rank}-${entry.partner_id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isMe ? 'border-[#0084FF]/30 bg-[#0084FF]/5' : 'border-white/5 bg-white/[0.02]'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                    entry.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                    entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-white/5 text-slate-400'
                  }`}>{entry.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? 'text-[#0084FF]' : 'text-white'}`}>
                      {entry.name}{isMe ? ' (You)' : ''}
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{entry.referrals} paid</span>
                  <span className="text-amber-400 font-semibold text-sm shrink-0">{Math.round(entry.credits)} credits</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
