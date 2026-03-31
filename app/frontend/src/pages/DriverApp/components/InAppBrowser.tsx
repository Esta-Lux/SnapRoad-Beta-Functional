import { useState } from 'react'
import { X, ArrowLeft, RefreshCw } from 'lucide-react'

interface InAppBrowserProps {
  url: string
  title: string
  isOpen: boolean
  onClose: () => void
}

export default function InAppBrowser({ url, title, isOpen, onClose }: InAppBrowserProps) {
  const [loading, setLoading] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" data-testid="in-app-browser">
      {/* Browser Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0a1628] border-b border-white/10">
        <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition" data-testid="browser-close-btn">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/90 text-sm font-medium truncate">{title}</p>
          <p className="text-white/40 text-xs truncate">{url}</p>
        </div>
        <button onClick={() => setLoading(true)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <RefreshCw size={16} className="text-white/60" />
        </button>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <X size={16} className="text-white/60" />
        </button>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-0.5 bg-[#0a1628]">
          <div className="h-full bg-cyan-400 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Browser Content */}
      <div className="flex-1 bg-white">
        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={title}
        />
      </div>
    </div>
  )
}
