import { useState, useEffect } from 'react'
import { QrCode, Plus, Copy, Trash2, Check, ExternalLink, Link2 } from 'lucide-react'
import { partnerApi } from '@/services/partnerApi'

interface TeamLink {
  id: string
  token: string
  label: string
  scan_url?: string
  created_at?: string
  is_active: boolean
}

interface Props {
  partnerId: string
}

export default function TeamLinksTab({ partnerId }: Props) {
  const [links, setLinks] = useState<TeamLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = window.location.origin

  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    try {
      const res = await partnerApi.getTeamLinks()
      if (res.success) setLinks(res.data || [])
    } catch {}
    setLoading(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await partnerApi.generateTeamLink(newLabel || 'Team Link')
      if (res.success && res.data) {
        setLinks(prev => [res.data, ...prev])
        setNewLabel('')
        setShowCreate(false)
      }
    } catch {}
    setCreating(false)
  }

  const handleRevoke = async (linkId: string) => {
    try {
      await partnerApi.revokeTeamLink(linkId)
      setLinks(prev => prev.filter(l => l.id !== linkId))
    } catch {}
  }

  const copyLink = (link: TeamLink) => {
    const url = `${baseUrl}/scan/${partnerId}/${link.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
            <QrCode size={24} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-1">Team Scan Links</h3>
            <p className="text-slate-400 text-sm">
              Generate shareable links for your team members to scan customer QR codes. 
              Team members can open these links on any device — no login required.
            </p>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Active Links ({links.length})</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 hover:from-emerald-400 hover:to-teal-400"
        >
          <Plus size={18} />
          Create Link
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6">
          <h4 className="text-white font-semibold mb-3">New Team Link</h4>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Label (e.g., Front Counter, Drive-through)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Generate'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 bg-slate-700 text-slate-300 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-12 text-center">
          <Link2 className="text-slate-600 mx-auto mb-3" size={48} />
          <h3 className="text-slate-400 font-medium mb-1">No team links yet</h3>
          <p className="text-slate-500 text-sm mb-4">Create a link to let your team scan customer QR codes</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium inline-flex items-center gap-2"
          >
            <Plus size={16} /> Create First Link
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const scanUrl = `${baseUrl}/scan/${partnerId}/${link.token}`
            return (
              <div key={link.id} className="bg-slate-800/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <QrCode size={20} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{link.label || 'Team Link'}</p>
                  <p className="text-slate-500 text-xs truncate">{scanUrl}</p>
                  {link.created_at && (
                    <p className="text-slate-600 text-xs mt-0.5">
                      Created {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(link)}
                    className={`p-2.5 rounded-xl transition-colors ${
                      copiedId === link.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title="Copy link"
                  >
                    {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                    title="Open scan page"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => handleRevoke(link.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    title="Revoke link"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
