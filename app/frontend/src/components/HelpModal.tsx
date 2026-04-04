// Minimal replacement after cleanup — help modal

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  appType?: 'partner' | 'admin' | 'driver'
  /** Partner portal: starts the multi-step product tour again */
  onReplayTour?: () => void
}

export default function HelpModal({ isOpen, onClose, appType, onReplayTour }: HelpModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">Help</h3>
        <p className="text-slate-400 text-sm mb-4">
          {appType === 'partner' && 'Partner dashboard: manage offers, locations, boosts, and analytics. Use the tour for a quick walkthrough.'}
          {appType === 'admin' && 'Admin console: users, incidents, rewards, and settings.'}
          {!appType && 'Need help? Contact support or check the docs.'}
        </p>
        <div className="flex flex-col gap-2">
          {appType === 'partner' && onReplayTour && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onReplayTour()
              }}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-teal-500"
            >
              Replay product tour
            </button>
          )}
          <button type="button" onClick={onClose} className="w-full py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-500">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
