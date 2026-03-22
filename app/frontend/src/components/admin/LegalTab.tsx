// Legal & Compliance Tab
// =============================================

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileText,
  Shield,
  Download,
  Upload,
  Search,
  Calendar,
  Check,
  AlertTriangle,
  Plus,
  Pencil,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '@/services/adminApi'
import type { LegalDocument } from '@/types/admin'

interface LegalTabProps {
  theme: 'dark' | 'light'
}

type LegalDraft = {
  id: string
  name: string
  type: string
  status: string
  version: string
  description: string
  content: string
  is_required: boolean
}

function emptyDraft(): LegalDraft {
  return {
    id: '',
    name: '',
    type: 'privacy',
    status: 'draft',
    version: '1.0',
    description: '',
    content: '',
    is_required: false,
  }
}

function docToDraft(doc: LegalDocument): LegalDraft {
  return {
    id: doc.id,
    name: doc.name || '',
    type: doc.type || 'privacy',
    status: doc.status || 'draft',
    version: doc.version || '1.0',
    description: doc.description || '',
    content: doc.content || '',
    is_required: Boolean(doc.is_required),
  }
}

export default function LegalTab({ theme }: LegalTabProps) {
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [draft, setDraft] = useState<LegalDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<LegalDocument | null>(null)

  const uploadInputRef = useRef<HTMLInputElement>(null)

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'
  const textPrimary = isDark ? 'text-white' : 'text-[#0B1220]'
  const textSecondary = isDark ? 'text-slate-400' : 'text-[#4B5C74]'
  const inputClass = isDark
    ? 'bg-slate-700/50 border-white/10 text-white'
    : 'bg-white border-[#E6ECF5] text-[#0B1220]'
  const modalBg = isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'

  useEffect(() => {
    loadDocuments()
  }, [typeFilter, statusFilter])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getLegalDocuments()
      if (res.success && Array.isArray(res.data)) {
        setDocuments(res.data)
      } else {
        setDocuments([])
        if (res.message) console.warn('Legal documents:', res.message)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setDraft(emptyDraft())
    setEditorMode('create')
    setEditorOpen(true)
  }

  const openEdit = (doc: LegalDocument) => {
    setDraft(docToDraft(doc))
    setEditorMode('edit')
    setEditorOpen(true)
  }

  const handleUploadPick = () => uploadInputRef.current?.click()

  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const textExtensions = new Set(['txt', 'md', 'html', 'htm', 'markdown', 'csv'])
    const looksText = file.type.startsWith('text/') || textExtensions.has(ext)
    if (!looksText) {
      toast.error('Use a text file (.txt, .md, .html) or Create to paste content. Word .docx is not supported here yet.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const base = file.name.replace(/\.[^/.]+$/, '')
      setDraft({
        ...emptyDraft(),
        name: base || 'Imported document',
        content: text,
        description: `Imported from ${file.name}`,
      })
      setEditorMode('create')
      setEditorOpen(true)
      toast.success('File loaded — review and save as a new document')
    }
    reader.onerror = () => toast.error('Could not read file')
    reader.readAsText(file)
  }

  const saveDraft = async () => {
    const name = draft.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    if (!draft.type) {
      toast.error('Type is required')
      return
    }

    const payload = {
      name,
      type: draft.type,
      status: draft.status,
      version: String(draft.version || '1.0'),
      description: draft.description || '',
      content: draft.content || '',
      is_required: draft.is_required,
    }

    setSaving(true)
    try {
      if (editorMode === 'create') {
        const res = await adminApi.createLegalDocument(payload)
        if (res.success) {
          toast.success(res.message || 'Document created')
          setEditorOpen(false)
          await loadDocuments()
        } else {
          toast.error(res.message || 'Create failed')
        }
      } else {
        const res = await adminApi.updateLegalDocument(draft.id, payload)
        if (res.success) {
          toast.success(res.message || 'Document updated')
          setEditorOpen(false)
          await loadDocuments()
        } else {
          toast.error(res.message || 'Update failed')
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadDocument = useCallback((docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    const body = doc.content ?? ''
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(doc.name || 'legal-document').replace(/[^\w\- ]+/g, '')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
  }, [documents])

  const handleViewDocument = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    setViewing(doc)
    setViewOpen(true)
  }

  const handleViewHistory = () => {
    toast(
      'Version history is not stored per edit yet. Bump the version field when you publish changes; full audit trail can be added later.',
      { icon: '📅', duration: 4500 },
    )
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'privacy':
        return <Shield className="text-blue-400" size={16} />
      case 'terms':
        return <FileText className="text-purple-400" size={16} />
      case 'compliance':
        return <Check className="text-green-400" size={16} />
      case 'agreement':
        return <FileText className="text-amber-400" size={16} />
      case 'security':
        return <AlertTriangle className="text-red-400" size={16} />
      default:
        return <FileText className="text-slate-400" size={16} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400'
      case 'draft':
        return 'bg-amber-500/20 text-amber-400'
      case 'archived':
        return 'bg-slate-500/20 text-slate-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".txt,.md,.html,.htm,.csv,text/plain"
        className="hidden"
        onChange={onUploadFile}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Legal & Compliance</h2>
          <p className={textSecondary}>Manage legal documents and compliance requirements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-400 hover:to-teal-400 shadow-sm"
          >
            <Plus size={18} />
            Create
          </button>
          <button
            type="button"
            onClick={handleUploadPick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400"
          >
            <Upload size={18} />
            Upload document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{documents.length}</div>
              <div className={`text-xs ${textSecondary}`}>Total Documents</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="text-green-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                {documents.filter((d) => d.status === 'active').length}
              </div>
              <div className={`text-xs ${textSecondary}`}>Active</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                {documents.filter((d) => d.is_required === true).length}
              </div>
              <div className={`text-xs ${textSecondary}`}>Required</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-400" size={20} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                {documents.filter((d) => d.type === 'compliance').length}
              </div>
              <div className={`text-xs ${textSecondary}`}>Compliance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${card}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${inputClass} placeholder-slate-500`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${inputClass}`}
          >
            <option value="all">All Types</option>
            <option value="privacy">Privacy</option>
            <option value="terms">Terms</option>
            <option value="compliance">Compliance</option>
            <option value="agreement">Agreements</option>
            <option value="security">Security</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${inputClass}`}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className={`p-5 rounded-xl border ${card} hover:shadow-lg transition-all`}>
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  {getTypeIcon(doc.type)}
                </div>
                <div className="min-w-0">
                  <h3 className={`font-semibold truncate ${textPrimary}`}>{doc.name}</h3>
                  <p className={`text-xs truncate ${textSecondary}`}>{doc.description}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
                {doc.is_required && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Required</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Type</span>
                <div className="flex items-center gap-1">
                  {getTypeIcon(doc.type)}
                  <span className={`capitalize ${textPrimary}`}>{doc.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Version</span>
                <span className={textPrimary}>v{doc.version}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={textSecondary}>Last Updated</span>
                <span className={textPrimary}>
                  {doc.last_updated ? new Date(doc.last_updated).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() => handleDownloadDocument(doc.id)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
              >
                <Download size={14} />
                Download
              </button>
              <button
                type="button"
                onClick={() => handleViewDocument(doc.id)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm"
              >
                <FileText size={14} />
                View
              </button>
              <button
                type="button"
                onClick={handleViewHistory}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm"
              >
                <Calendar size={14} />
                History
              </button>
              <button
                type="button"
                onClick={() => openEdit(doc)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 text-sm"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className={textSecondary}>
            {documents.length === 0 && !searchTerm && typeFilter === 'all' && statusFilter === 'all'
              ? 'No legal documents yet. Use Create or Upload to add one, or seed the legal_documents table in Supabase.'
              : 'No documents found matching your filters'}
          </p>
          {documents.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium"
            >
              <Plus size={16} />
              Create document
            </button>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-xl flex flex-col ${modalBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold ${textPrimary}`}>
                {editorMode === 'create' ? 'Create legal document' : 'Edit legal document'}
              </h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X size={20} className={textSecondary} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Name *</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                    placeholder="Privacy Policy"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Type *</label>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                  >
                    <option value="privacy">Privacy</option>
                    <option value="terms">Terms</option>
                    <option value="compliance">Compliance</option>
                    <option value="agreement">Agreement</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Version</label>
                  <input
                    value={draft.version}
                    onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                    placeholder="1.0"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Short description</label>
                <input
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                  placeholder="Shown in admin cards and listings"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.is_required}
                  onChange={(e) => setDraft((d) => ({ ...d, is_required: e.target.checked }))}
                  className="rounded border-slate-500"
                />
                <span className={`text-sm ${textPrimary}`}>Required for users / compliance</span>
              </label>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Full text (markdown or plain text)</label>
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  rows={14}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${inputClass}`}
                  placeholder="Paste or write the full legal text here…"
                />
              </div>
            </div>
            <div
              className={`flex justify-end gap-2 px-5 py-4 border-t ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveDraft}
                className="px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : editorMode === 'create' ? 'Create document' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal (read-only) */}
      {viewOpen && viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewOpen(false)}
        >
          <div
            className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-xl flex flex-col ${modalBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <div>
                <h3 className={`text-lg font-semibold ${textPrimary}`}>{viewing.name}</h3>
                <p className={`text-xs ${textSecondary}`}>
                  v{viewing.version} · {viewing.type} · {viewing.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <X size={20} className={textSecondary} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <pre
                className={`whitespace-pre-wrap text-sm font-mono rounded-lg p-4 ${
                  isDark ? 'bg-black/30 text-slate-200' : 'bg-gray-50 text-gray-800'
                }`}
              >
                {viewing.content?.trim() ? viewing.content : '(No body text stored for this document.)'}
              </pre>
            </div>
            <div
              className={`flex justify-end gap-2 px-5 py-4 border-t ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setViewOpen(false)
                  openEdit(viewing)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
