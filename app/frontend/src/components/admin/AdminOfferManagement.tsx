// Offer Management tab — admin offers (replaces figma-ui AdminOfferManagement)

import { useState, useEffect, useRef } from 'react'
import { Gift, Search, Trash2, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/services/adminApi'
import { useSupabaseRealtimeRefresh } from '@/hooks/useSupabaseRealtimeRefresh'
import OfferLocationPicker from '@/components/admin/OfferLocationPicker'

interface AdminOfferManagementProps {
  theme: 'dark' | 'light'
  onNavigate?: (page: string) => void
  initialBulkOpen?: boolean
}

export function AdminOfferManagement({ theme, onNavigate, initialBulkOpen = false }: AdminOfferManagementProps) {
  const [offers, setOffers] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [bulkOpen, setBulkOpen] = useState(initialBulkOpen)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [editingAllocation, setEditingAllocation] = useState<any | null>(null)
  const [savingAllocation, setSavingAllocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadOffers()
  }, [statusFilter])

  useEffect(() => {
    loadPartners()
  }, [])

  useSupabaseRealtimeRefresh(
    'admin-offer-management-realtime',
    [
      { table: 'offers' },
      { table: 'partner_locations' },
      { table: 'offer_analytics' },
    ],
    () => {
      loadOffers()
      loadPartners()
    },
  )

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

  const loadPartners = async () => {
    try {
      const res = await adminApi.getPartners()
      if (res.success && res.data) setPartners(res.data)
    } catch {
      setPartners([])
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

  const handleSetOfferStatus = async (id: string, status: 'active' | 'rejected') => {
    try {
      const res = await adminApi.setOfferStatus(String(id), status)
      if (res.success) {
        toast.success(status === 'active' ? 'Offer approved (active)' : 'Offer rejected (inactive)')
        await loadOffers()
      } else {
        toast.error(res.message || 'Could not update status')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status')
    }
  }

  const handleSaveAllocation = async () => {
    if (!editingAllocation) return
    setSavingAllocation(true)
    try {
      const allocated_locations = String(editingAllocation.allocated_locations || '')
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean)
      const payload = {
        offer_type: editingAllocation.offer_type || 'partner',
        partner_id: editingAllocation.offer_type === 'partner' ? editingAllocation.partner_id || null : null,
        allocated_locations,
        address: editingAllocation.address || null,
        lat: editingAllocation.lat ? Number(editingAllocation.lat) : null,
        lng: editingAllocation.lng ? Number(editingAllocation.lng) : null,
      }
      const res = await adminApi.updateOffer(String(editingAllocation.id), payload)
      if (res.success) {
        toast.success('Offer allocation updated')
        setEditingAllocation(null)
        loadOffers()
      } else {
        toast.error(res.message || 'Could not update allocation')
      }
    } catch (e) {
      console.error(e)
      toast.error('Could not update allocation')
    } finally {
      setSavingAllocation(false)
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

      {editingAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !savingAllocation && setEditingAllocation(null)}>
          <div
            className={`max-w-2xl w-full rounded-2xl border p-6 shadow-xl ${
              isDark ? 'bg-slate-900 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1">Offer Allocation Studio</h2>
            <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Assign uploaded offers to a partner, set admin trial status, and manage location placement without leaving the main offers surface.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2">Offer Type</label>
                <select
                  value={editingAllocation.offer_type || (editingAllocation.is_admin_offer ? 'admin' : 'partner')}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, offer_type: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                >
                  <option value="partner">Partner Offer</option>
                  <option value="admin">Admin Trial Offer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Assigned Partner</label>
                <select
                  value={editingAllocation.partner_id || ''}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, partner_id: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                >
                  <option value="">Unassigned / Admin Trial</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.business_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-2">Allocated Location IDs</label>
                <input
                  type="text"
                  value={editingAllocation.allocated_locations || ''}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, allocated_locations: e.target.value }))}
                  placeholder="Comma-separated location IDs"
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-2">Address</label>
                <input
                  type="text"
                  value={editingAllocation.address || ''}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State ZIP"
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={editingAllocation.lat ?? ''}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, lat: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={editingAllocation.lng ?? ''}
                  onChange={(e) => setEditingAllocation((prev: any) => ({ ...prev, lng: e.target.value }))}
                  className={`w-full rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-2">Map Allocation</label>
                <OfferLocationPicker
                  lat={editingAllocation.lat ? Number(editingAllocation.lat) : null}
                  lng={editingAllocation.lng ? Number(editingAllocation.lng) : null}
                  onChange={(lat, lng) => setEditingAllocation((prev: any) => ({ ...prev, lat, lng }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleSaveAllocation}
                disabled={savingAllocation}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} disabled:opacity-50`}
              >
                {savingAllocation ? 'Saving…' : 'Save Allocation'}
              </button>
              <button
                type="button"
                onClick={() => setEditingAllocation(null)}
                disabled={savingAllocation}
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
                    <span className="uppercase text-[10px] font-bold tracking-wide mr-2 opacity-80">{String(offer.status ?? '—')}</span>
                    {offer.discount_percent != null ? `${offer.discount_percent}% off` : ''}
                    {offer.gems_reward != null ? ` · ${offer.gems_reward} gems` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {String(offer.status || 'active') !== 'active' && (
                  <button
                    type="button"
                    onClick={() => handleSetOfferStatus(String(offer.id ?? offer.offer_id), 'active')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${isDark ? 'hover:bg-emerald-500/20 text-emerald-300' : 'hover:bg-emerald-50 text-emerald-700'}`}
                    title="Approve — set active"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                )}
                {String(offer.status || '') !== 'inactive' && (
                  <button
                    type="button"
                    onClick={() => handleSetOfferStatus(String(offer.id ?? offer.offer_id), 'rejected')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${isDark ? 'hover:bg-orange-500/20 text-orange-200' : 'hover:bg-orange-50 text-orange-800'}`}
                    title="Reject — set inactive"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                )}
                <button
                  onClick={() => setEditingAllocation({
                    ...offer,
                    offer_type: offer.offer_type || (offer.is_admin_offer ? 'admin' : 'partner'),
                    partner_id: offer.partner_id || '',
                    allocated_locations: Array.isArray(offer.allocated_locations) ? offer.allocated_locations.join(', ') : '',
                  })}
                  className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'hover:bg-cyan-500/20 text-cyan-300' : 'hover:bg-cyan-50 text-cyan-700'}`}
                  title="Manage allocation"
                >
                  Manage
                </button>
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
