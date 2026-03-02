// Notification Center Tab
// =============================================

import { useState, useEffect } from 'react'
import { Bell, Search, Check, X, AlertTriangle, Info, Send } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

interface Notification {
  id: string
  type: 'system' | 'security' | 'marketing' | 'alert' | 'info'
  title: string
  message: string
  status: 'read' | 'unread'
  priority: 'high' | 'medium' | 'low'
  created_at: string
  recipients: string
}

interface NotificationsTabProps {
  theme: 'dark' | 'light'
}

function mapApiToNotification(api: { id: string; type: string; title: string; message: string; priority?: string; status?: string; is_read?: boolean; recipients?: string; created_at?: string }): Notification {
  const status = (api.status ?? (api.is_read ? 'read' : 'unread')) as 'read' | 'unread'
  const priority = (api.priority ?? 'medium') as 'high' | 'medium' | 'low'
  const type = (api.type ?? 'system') as Notification['type']
  return {
    id: api.id,
    type,
    title: api.title,
    message: api.message,
    status,
    priority,
    created_at: api.created_at ?? '',
    recipients: api.recipients ?? '',
  }
}

export default function NotificationsTab({ theme }: NotificationsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [priorityFilter, setPriorityFilter] = useState('All Priority')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'system' as const,
    priority: 'medium' as const,
    recipients: 'all_users'
  })

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getNotifications()
      if (res.success && res.data) {
        setNotifications(res.data.map(mapApiToNotification))
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await adminApi.markNotificationRead(notificationId)
      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      for (const n of notifications.filter(n => n.status === 'unread')) {
        await adminApi.markNotificationRead(n.id)
      }
      await loadNotifications()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleSendNotification = async () => {
    try {
      const res = await adminApi.createNotification(newNotification)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Notification sent successfully!' })
        setShowCreateModal(false)
        setNewNotification({
          title: '',
          message: '',
          type: 'system',
          priority: 'medium',
          recipients: 'all_users'
        })
        await loadNotifications()
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({ type: 'error', message: res.error ?? 'Failed to send notification' })
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      setFeedback({ type: 'error', message: 'Network error while sending notification' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = (typeFilter === 'All Types' || typeFilter === 'all') || notification.type === typeFilter.toLowerCase()
    const matchesStatus = (statusFilter === 'All Status' || statusFilter === 'all') || notification.status === statusFilter.toLowerCase()
    const matchesPriority = (priorityFilter === 'All Priority' || priorityFilter === 'all') || notification.priority === priorityFilter.toLowerCase()
    return matchesSearch && matchesType && matchesStatus && matchesPriority
  })

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return <Info className="text-blue-400" size={16} />
      case 'security': return <AlertTriangle className="text-red-400" size={16} />
      case 'marketing': return <Bell className="text-purple-400" size={16} />
      case 'alert': return <AlertTriangle className="text-amber-400" size={16} />
      default: return <Bell className="text-slate-400" size={16} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/20'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/20'
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/20'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/20'
    }
  }

  const markAsRead = async (id: string) => {
    await handleMarkAsRead(id)
  }

  const markAllAsRead = async () => {
    await handleMarkAllAsRead()
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
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border ${
          feedback.type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check size={16} /> : <X size={16} />}
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notification Center</h2>
          <p className="text-slate-400">Manage system notifications and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
          >
            <Check size={18} />
            Mark All Read
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400"
          >
            <Send size={18} />
            Send Notification
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Bell className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notifications?.length ?? 0}</div>
              <div className="text-xs text-slate-400">Total Notifications</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notifications?.filter(n => n.status === 'unread').length ?? 0}</div>
              <div className="text-xs text-slate-400">Unread</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notifications?.filter(n => n.priority === 'high').length ?? 0}</div>
              <div className="text-xs text-slate-400">High Priority</div>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${card}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Send className="text-purple-400" size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notifications?.filter(n => n.type === 'marketing').length ?? 0}</div>
              <div className="text-xs text-slate-400">Marketing</div>
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
              placeholder="Search notifications..."
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
            <option value="system">System</option>
            <option value="security">Security</option>
            <option value="marketing">Marketing</option>
            <option value="alert">Alert</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
            }`}
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 rounded-xl border transition-all ${
                card
              } ${notification.status === 'unread' ? 'ring-2 ring-purple-500/20' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  notification.status === 'unread' ? 'bg-purple-500/20' : 'bg-slate-700/50'
                }`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium">{notification.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                    {notification.status === 'unread' && (
                      <span className="w-2 h-2 bg-purple-400 rounded-full" />
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{notification.created_at}</span>
                    <span>•</span>
                    <span>Recipients: {notification.recipients}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notification.status === 'unread' && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center py-12 rounded-xl border ${card}`}>
            <Bell className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-400">
              {notifications.length === 0 
                ? 'No notifications yet' 
                : 'No notifications found matching your filters'}
            </p>
          </div>
        )}
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-xl border ${card}`}>
            <h3 className="text-xl font-semibold text-white mb-4">Send New Notification</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Notification Title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
              <textarea
                placeholder="Notification Message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
                rows={3}
              />
              <select
                value={newNotification.type}
                onChange={(e) => setNewNotification({...newNotification, type: e.target.value as Notification['type']})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              >
                <option value="system">System</option>
                <option value="security">Security</option>
                <option value="marketing">Marketing</option>
                <option value="alert">Alert</option>
                <option value="info">Info</option>
              </select>
              <select
                value={newNotification.priority}
                onChange={(e) => setNewNotification({...newNotification, priority: e.target.value as Notification['priority']})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <select
                value={newNotification.recipients}
                onChange={(e) => setNewNotification({...newNotification, recipients: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              >
                <option value="all_users">All Users</option>
                <option value="premium_users">Premium Users</option>
                <option value="admins">Admins Only</option>
                <option value="partners">Partners Only</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
