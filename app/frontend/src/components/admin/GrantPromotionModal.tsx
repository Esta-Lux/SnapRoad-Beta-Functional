import { useState, useEffect } from 'react'
import { X, Gift, Mail } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

type Target = 'users' | 'partners'

interface GrantPromotionModalProps {
  open: boolean
  target: Target
  selectedIds: string[]
  theme: 'dark' | 'light'
  onClose: () => void
  onSuccess: () => void
}

export default function GrantPromotionModal({
  open,
  target,
  selectedIds,
  theme,
  onClose,
  onSuccess,
}: GrantPromotionModalProps) {
  const [days, setDays] = useState(30)
  const [plan, setPlan] = useState(target === 'partners' ? 'growth' : 'premium')
  const [sendEmail, setSendEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultRef, setResultRef] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPlan(target === 'partners' ? 'growth' : 'premium')
      setDays(30)
      setSendEmail(false)
      setError(null)
      setResultRef(null)
    }
  }, [open, target])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'

  if (!open) return null

  const submit = async () => {
    setError(null)
    setResultRef(null)
    if (selectedIds.length === 0) {
      setError('Select at least one row first.')
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.grantPromotions({
        user_ids: target === 'users' ? selectedIds : [],
        partner_ids: target === 'partners' ? selectedIds : [],
        days,
        plan,
        send_email: sendEmail,
      })
      if (!res.success || !res.data) {
        setError((res as { message?: string }).message || 'Grant failed')
        return
      }
      setResultRef(res.data.reference)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className={`w-full max-w-md rounded-2xl border shadow-xl ${card}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-[#E6ECF5]'}`}>
          <div className="flex items-center gap-2">
            <Gift className="text-purple-400" size={22} />
            <h3 className={`font-semibold ${textPrimary}`}>
              Grant promotion ({target === 'users' ? 'drivers' : 'partners'})
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className={`text-sm ${textSecondary}`}>
            {selectedIds.length} selected — extends from today (or stacks after any current promo end) by{' '}
            <strong className={textPrimary}>paid-tier benefits</strong> until the new end date.
          </p>

          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Days</label>
            <input
              type="number"
              min={1}
              max={730}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(730, Number(e.target.value) || 1)))}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Plan tier</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            >
              {target === 'users' ? (
                <>
                  <option value="premium">Premium (driver)</option>
                  <option value="family">Family (driver)</option>
                </>
              ) : (
                <>
                  <option value="starter">Starter (partner)</option>
                  <option value="growth">Growth (partner)</option>
                  <option value="enterprise">Enterprise (partner)</option>
                </>
              )}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-slate-500"
            />
            <Mail size={16} className="text-slate-400" />
            <span className={`text-sm ${textPrimary}`}>Send email notice (requires Resend on API)</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {resultRef && (
            <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Saved. Reference <code className="text-xs">{resultRef}</code>
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                isDark ? 'border-white/15 text-slate-300' : 'border-[#E6ECF5] text-[#4B5C74]'
              }`}
            >
              Close
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Applying…' : 'Apply promotion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
