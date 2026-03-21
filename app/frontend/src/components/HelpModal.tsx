// Minimal replacement after cleanup — help modal

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  appType?: 'partner' | 'admin' | 'driver'
}

export default function HelpModal({ isOpen, onClose, appType }: HelpModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">Help</h3>
        <p className="text-slate-400 text-sm mb-4">
          {appType === 'partner' && 'Partner dashboard: manage offers, locations, and analytics.'}
          {appType === 'admin' && 'Admin console: users, incidents, rewards, and settings.'}
          {!appType && 'Need help? Contact support or check the docs.'}
        </p>
        <button onClick={onClose} className="w-full py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-500">
          Close
        </button>
      </div>
    </div>
  )
}
