// Legal & Compliance Tab
// =============================================

import { useState, useEffect } from 'react'
import { FileText, Shield, Download, Upload, Search, Filter, Calendar, Check, AlertTriangle } from 'lucide-react'

interface LegalTabProps {
  theme: 'dark' | 'light'
}

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

export default function LegalTab({ theme }: LegalTabProps) {
  const [documents, setDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadDocuments()
  }, [typeFilter, statusFilter])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/legal-documents`)
      const data = await res.json()
      if (data.success) {
        setDocuments(data.data)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadDocument = async (docId: number) => {
    try {
      console.log(`Downloading document ${docId}`)
      // In a real app, this would trigger a file download
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleViewDocument = async (docId: number) => {
    try {
      console.log(`Viewing document ${docId}`)
      // In a real app, this would open a document viewer
    } catch (error) {
      console.error('Failed to view document:', error)
    }
  }

  const handleViewHistory = async (docId: number) => {
    try {
      console.log(`Viewing history for document ${docId}`)
      // In a real app, this would show document version history
    } catch (error) {
      console.error('Failed to view document history:', error)
    }
  }

  const filteredDocuments = documents ? documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  }) : []

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'privacy': return <Shield className="text-blue-400" size={16} />
      case 'terms': return <FileText className="text-purple-400" size={16} />
      case 'compliance': return <Check className="text-green-400" size={16} />
      case 'agreement': return <FileText className="text-amber-400" size={16} />
      case 'security': return <AlertTriangle className="text-red-400" size={16} />
      default: return <FileText className="text-slate-400" size={16} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'draft': return 'bg-amber-500/20 text-amber-400'
      case 'archived': return 'bg-slate-500/20 text-slate-400'
      default: return 'bg-slate-500/20 text-slate-400'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Legal & Compliance</h2>
          <p className="text-slate-400">Manage legal documents and compliance requirements</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400">
          <Upload size={18} />
          Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{documents?.length || 0}</div>
              <div className="text-xs text-slate-400">Total Documents</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="text-green-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{documents?.filter(d => d.status === 'active').length || 0}</div>
              <div className="text-xs text-slate-400">Active</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{documents?.filter(d => d.required === true).length || 0}</div>
              <div className="text-xs text-slate-400">Required</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{documents?.filter(d => d.type === 'compliance').length || 0}</div>
              <div className="text-xs text-slate-400">Compliance</div>
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
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              } placeholder-slate-500`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
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
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
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
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  {getTypeIcon(doc.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{doc.name}</h3>
                  <p className="text-xs text-slate-400">{doc.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
                {doc.required && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                    Required
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Type</span>
                <div className="flex items-center gap-1">
                  {getTypeIcon(doc.type)}
                  <span className="text-white capitalize">{doc.type}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Version</span>
                <span className="text-white">v{doc.version}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Last Updated</span>
                <span className="text-white">{doc.lastUpdated}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
              <button 
                onClick={() => handleDownloadDocument(doc.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
              >
                <Download size={14} />
                Download
              </button>
              <button 
                onClick={() => handleViewDocument(doc.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm"
              >
                <FileText size={14} />
                View
              </button>
              <button 
                onClick={() => handleViewHistory(doc.id)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm"
              >
                <Calendar size={14} />
                History
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${card}`}>
          <FileText className="mx-auto text-slate-400 mb-4" size={48} />
          <p className="text-slate-400">No documents found matching your filters</p>
        </div>
      )}
    </div>
  )
}
