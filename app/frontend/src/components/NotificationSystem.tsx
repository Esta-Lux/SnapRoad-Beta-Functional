// Minimal replacement after cleanup — notification UI and service stubs

import { createContext, useContext, useCallback, type ReactNode } from 'react'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">Notifications</h3>
        <p className="text-slate-400 text-sm">No new notifications.</p>
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-500">
          Close
        </button>
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
  const sendNotification = useCallback((_type: NotificationType, _title: string, _message: string) => {
    // Stub: could wire to toast or state later
  }, [])
  return (
    <NotificationsContext.Provider value={{ sendNotification }}>
      {children}
    </NotificationsContext.Provider>
  )
}
