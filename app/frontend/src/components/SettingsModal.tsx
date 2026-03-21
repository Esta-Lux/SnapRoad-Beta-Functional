// Minimal replacement after cleanup — partner/admin settings modal

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

export default function SettingsModal({ isOpen, onClose, onLogout }: SettingsModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
        <p className="text-slate-400 text-sm mb-4">Account and app settings.</p>
        <div className="flex flex-col gap-2">
          <button onClick={onClose} className="w-full py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-500">
            Close
          </button>
          {onLogout && (
            <button onClick={onLogout} className="w-full py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30">
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
