// Partner portal notifications surface — polished shell (demo service remains a no-op until wired to API).

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { Bell, X } from 'lucide-react'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-6 bg-slate-950/55 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-slate-900/98 to-slate-950/98 shadow-[0_24px_64px_rgba(0,0,0,0.45)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <Bell size={20} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h3 id="notification-center-title" className="text-base font-semibold text-white tracking-tight">
                Partner notifications
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Offers, redemptions, and account alerts will appear here.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate-300 leading-relaxed">
            You&apos;re all caught up. We&apos;ll surface real-time partner alerts here as they roll out.
          </p>
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

type NotificationType = 'system' | 'offer' | string
const noop = () => {}

const NotificationsContext = createContext<{ sendNotification: (type: NotificationType, title: string, message: string) => void }>({
  sendNotification: noop,
})

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  return { sendNotification: ctx?.sendNotification ?? noop }
}

export const notificationService = {
  startDemoNotifications(_intervalMs: number) {
    return () => {}
  },
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const sendNotification = useCallback((_type: NotificationType, _title: string, _message: string) => {}, [])
  return (
    <NotificationsContext.Provider value={{ sendNotification }}>
      {children}
    </NotificationsContext.Provider>
  )
}
