import { useEffect, useState } from 'react'
import { QrCode, Plus, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { partnerApi } from '@/services/partnerApi'
import ScannerWorkspace from '@/components/partner/ScannerWorkspace'

interface TeamLink {
  id: string
  token: string
  label: string
  created_at?: string
}

export default function ScannerPage() {
  const [links, setLinks] = useState<TeamLink[]>([])
  const [selectedToken, setSelectedToken] = useState('')
  const partnerId = localStorage.getItem('snaproad_partner_id') || 'default_partner'

  useEffect(() => {
    const load = async () => {
      const res = await partnerApi.getTeamLinks()
      if (res.success && Array.isArray(res.data)) {
        setLinks(res.data)
        if (res.data[0]?.token) setSelectedToken(res.data[0].token)
      }
    }
    load()
  }, [])

  const createLink = async () => {
    const res = await partnerApi.generateTeamLink(`Scanner ${links.length + 1}`)
    if (res.success && res.data) {
      const next = [res.data as TeamLink, ...links]
      setLinks(next)
      setSelectedToken((res.data as TeamLink).token)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/portal/partner" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-3">
              <ArrowLeft size={16} /> Back to Partner Portal
            </Link>
            <h1 className="text-3xl font-bold">Partner Scanner</h1>
            <p className="text-slate-400 mt-1">Dedicated in-portal scanning workflow for staff devices and tablet counters.</p>
          </div>
          <button
            onClick={createLink}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 inline-flex items-center gap-2"
          >
            <Plus size={16} /> Create Team Link
          </button>
        </div>

        <div className="grid grid-cols-[320px,1fr] gap-6">
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode size={18} className="text-emerald-400" />
              <h2 className="font-semibold">Active Scan Links</h2>
            </div>
            <div className="space-y-3">
              {links.length === 0 ? (
                <p className="text-slate-500 text-sm">No team links yet. Create one to start scanning in-portal.</p>
              ) : links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setSelectedToken(link.token)}
                  className={`w-full text-left rounded-2xl px-4 py-3 border transition-colors ${
                    selectedToken === link.token
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                      : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <p className="font-medium">{link.label || 'Team Link'}</p>
                  <p className="text-xs text-slate-500 mt-1">{link.created_at ? new Date(link.created_at).toLocaleString() : 'Just created'}</p>
                </button>
              ))}
            </div>
          </div>

          <ScannerWorkspace
            partnerId={partnerId}
            token={selectedToken}
            title="In-Portal Counter Scanner"
            subtitle="Select a team link, then scan and apply discounts without leaving the authenticated portal."
          />
        </div>
      </div>
    </div>
  )
}
