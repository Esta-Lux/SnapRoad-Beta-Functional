// Offer Management tab — admin offers (replaces figma-ui AdminOfferManagement)

import { useState, useEffect, useRef } from 'react'
import { Gift, Search, Trash2, Upload, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/services/adminApi'

interface AdminOfferManagementProps {
  theme: 'dark' | 'light'
  onNavigate?: (page: string) => void
}

export function AdminOfferManagement({ theme, onNavigate }: AdminOfferManagementProps) {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadOffers()
  }, [statusFilter])

  const loadOffers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getOffers(statusFilter)
      if (res.success && res.data) setOffers(Array.isArray(res.data) ? res.data : [])
      else setOffers([])
    } catch {
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await adminApi.downloadOfferUploadTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'snaproad-offers-upload-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Could not download template')
    }
  }

  const handleBulkFile = async (file: File | null) => {
    if (!file) return
    setBulkUploading(true)
    try {
      const res = await adminApi.uploadExcel(file)
      if (res.success) {
        toast.success(res.message || 'Upload processed')
        setBulkOpen(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        await loadOffers()
      } else {
        toast.error(res.message || res.error || 'Upload failed')
      }
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBulkUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return
    try {
      await adminApi.deleteOffer(id)
      loadOffers()
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = search.trim()
    ? offers.filter(
        (o) =>
          (o.business_name || o.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (o.title || '').toLowerCase().includes(search.toLowerCase())
      )
    : offers

  const isDark = theme === 'dark'

  return (
    <div className={isDark ? 'text-gray-200' : 'text-gray-900'}>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
            }`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-4 py-2 rounded-xl border text-sm ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            isDark ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200' : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
          }`}
        >
          <FileSpreadsheet size={18} />
          Bulk upload (Excel)
        </button>
        {onNavigate && (
          <button
            onClick={() => onNavigate('rewards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Gift size={18} />
            Rewards & Vouchers
          </button>
        )}
      </div>

      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !bulkUploading && setBulkOpen(false)}
        >
          <div
            className={`max-w-lg w-full rounded-2xl border p-6 shadow-xl ${
              isDark ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">Bulk upload offers</h2>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Use an <code className="text-xs">.xlsx</code> file with columns matching the admin template (e.g.{' '}
              <code className="text-xs">business_name</code>, <code className="text-xs">title</code>,{' '}
              <code className="text-xs">description</code>, <code className="text-xs">business_type</code>,{' '}
              <code className="text-xs">discount_percent</code>, <code className="text-xs">is_free_item</code>,{' '}
              <code className="text-xs">address</code>, <code className="text-xs">offer_url</code>,{' '}
              <code className="text-xs">lat</code>, <code className="text-xs">lng</code>,{' '}
              <code className="text-xs">expires_days</code>, <code className="text-xs">source</code>,{' '}
              <code className="text-xs">original_price</code>, <code className="text-xs">affiliate_tracking_url</code>,{' '}
              <code className="text-xs">external_id</code>).
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className={`text-sm font-medium underline ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
              >
                Download template (.xlsx)
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleBulkFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={bulkUploading}
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
                  isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } text-white disabled:opacity-50`}
              >
                <Upload size={18} />
                {bulkUploading ? 'Uploading…' : 'Choose Excel file'}
              </button>
              <button
                type="button"
                disabled={bulkUploading}
                onClick={() => setBulkOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading offers...</p>
      ) : filtered.length === 0 ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No offers found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer) => (
            <div
              key={offer.id ?? offer.offer_id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Gift size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">{offer.business_name ?? offer.name ?? 'Offer'}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {offer.discount_percent != null ? `${offer.discount_percent}% off` : ''}
                    {offer.gems_reward != null ? ` · ${offer.gems_reward} gems` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(String(offer.id ?? offer.offer_id))}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminOfferManagement
