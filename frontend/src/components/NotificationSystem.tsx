import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, X, Gift, Trophy, AlertTriangle, Gem, Check } from 'lucide-react'

interface Notification {
  id: string
  type: 'offer' | 'redemption' | 'challenge' | 'safety' | 'system'
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: any
}

// Notification Service - handles browser notifications
class NotificationService {
  private static instance: NotificationService
  private permission: NotificationPermission = 'default'
  private listeners: ((notification: Notification) => void)[] = []

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    }

    return false
  }

  isEnabled(): boolean {
    return this.permission === 'granted'
  }

  subscribe(callback: (notification: Notification) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  notify(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    }

    // Notify all listeners (in-app)
    this.listeners.forEach(listener => listener(fullNotification))

    // Show browser notification if permitted
    if (this.permission === 'granted') {
      const icons: Record<string, string> = {
        offer: '🎁',
        redemption: '✅',
        challenge: '🏆',
        safety: '🛡️',
        system: '📢',
      }

      new Notification(`${icons[notification.type]} ${notification.title}`, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: fullNotification.id,
        requireInteraction: false,
        silent: false,
      })
    }
  }

  // Simulate real-time notifications for demo
  startDemoNotifications(intervalMs: number = 30000): () => void {
    const demoNotifications = [
      { type: 'offer' as const, title: 'New Offer Nearby!', message: 'Shell Gas Station: 15% off fuel - 0.3 miles away' },
      { type: 'redemption' as const, title: 'Offer Redeemed!', message: 'You earned 50 gems from Starbucks Downtown' },
      { type: 'challenge' as const, title: 'Challenge Update', message: 'Mike just took the lead! Drive safe to catch up.' },
      { type: 'safety' as const, title: 'Great Driving!', message: 'Your safety score increased to 95. Keep it up!' },
      { type: 'offer' as const, title: 'Flash Deal!', message: 'Double gems at Quick Shine Car Wash for the next hour' },
    ]

    let index = 0
    const interval = setInterval(() => {
      const notification = demoNotifications[index % demoNotifications.length]
      this.notify(notification)
      index++
    }, intervalMs)

    return () => clearInterval(interval)
  }
}

export const notificationService = NotificationService.getInstance()

// Hook for using notifications in components
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    // Check if already enabled
    setIsEnabled(notificationService.isEnabled())

    // Subscribe to notifications
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep last 50
      setUnreadCount(prev => prev + 1)
    })

    return unsubscribe
  }, [])

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission()
    setIsEnabled(granted)
    return granted
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  const sendNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    data?: any
  ) => {
    notificationService.notify({ type, title, message, data })
  }, [])

  return {
    notifications,
    unreadCount,
    isEnabled,
    requestPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    sendNotification,
  }
}

// Notification Center Component
interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    isEnabled, 
    requestPermission, 
    markAsRead, 
    markAllAsRead,
    clearAll 
  } = useNotifications()

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'offer': return <Gift className="text-emerald-400" size={18} />
      case 'redemption': return <Check className="text-cyan-400" size={18} />
      case 'challenge': return <Trophy className="text-amber-400" size={18} />
      case 'safety': return <AlertTriangle className="text-blue-400" size={18} />
      default: return <Bell className="text-slate-400" size={18} />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="text-white" size={20} />
            <h2 className="text-white font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Permission Banner */}
        {!isEnabled && (
          <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
            <p className="text-blue-400 text-sm mb-2">Enable notifications to get real-time alerts</p>
            <button 
              onClick={requestPermission}
              className="bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <button 
              onClick={markAllAsRead}
              className="text-emerald-400 text-sm hover:text-emerald-300"
            >
              Mark all as read
            </button>
            <button 
              onClick={clearAll}
              className="text-slate-400 text-sm hover:text-white"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="text-slate-600 mx-auto mb-3" size={32} />
              <p className="text-slate-400">No notifications yet</p>
              <p className="text-slate-500 text-sm mt-1">You'll see alerts here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    !notification.read ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

// Notification Bell Button Component
interface NotificationBellProps {
  onClick: () => void
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount, isEnabled } = useNotifications()

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
      data-testid="notification-bell"
    >
      {isEnabled ? (
        <Bell className="text-white" size={20} />
      ) : (
        <BellOff className="text-slate-400" size={20} />
      )}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

export default NotificationCenter
