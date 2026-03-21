import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { X, Bell, Mail, Volume2 } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface NotificationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const modalBg = isLight ? 'bg-white' : 'bg-slate-900'
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'
  const textPrimary = isLight ? 'text-slate-900' : 'text-white'
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400'
  const backdrop = isLight ? 'bg-black/50' : 'bg-black/80'

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/settings/notifications`)
      const data = await res.json()
      if (data.success) setSettings(data.data)
    } catch (e) {
      // Use defaults
      setSettings({
        push_notifications: { trip_summary: true, challenges: true, offers: true, gems_earned: true, friend_activity: false, safety_alerts: true },
        email_alerts: { weekly_summary: true, monthly_report: true, special_offers: false, account_updates: true },
        in_app_sounds: { navigation_voice: true, notifications: true, achievements: true }
      })
    }
    setLoading(false)
  }

  const handleToggle = async (category: string, setting: string) => {
    if (!settings) return
    
    const newValue = !settings[category][setting]
    setSettings({
      ...settings,
      [category]: { ...settings[category], [setting]: newValue }
    })

    try {
      await fetch(`${API_URL}/api/settings/notifications?category=${category}&setting=${setting}&enabled=${newValue}`, {
        method: 'PUT'
      })
      toast.success(`${setting.replace(/_/g, ' ')} ${newValue ? 'enabled' : 'disabled'}`)
    } catch (e) {
      toast.error('Could not update setting')
    }
  }

  const settingLabels: Record<string, string> = {
    trip_summary: 'Trip Summary',
    challenges: 'Challenges',
    offers: 'New Offers',
    gems_earned: 'Gems Earned',
    friend_activity: 'Friend Activity',
    safety_alerts: 'Safety Alerts',
    weekly_summary: 'Weekly Summary',
    monthly_report: 'Monthly Report',
    special_offers: 'Special Offers',
    account_updates: 'Account Updates',
    navigation_voice: 'Navigation Voice',
    notifications: 'Sound Effects',
    achievements: 'Achievement Sounds',
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 ${backdrop} z-50 flex items-center justify-center p-2`} onClick={onClose}>
      <div className={`w-full max-w-md h-[85vh] ${modalBg} rounded-2xl overflow-hidden flex flex-col shadow-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`} onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="text-white" size={20} />
              <h2 className="text-white font-bold text-lg">Notifications</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <X className="text-white" size={16} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-auto p-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
          {loading ? (
            <div className={`text-center py-8 ${textMuted}`}>Loading...</div>
          ) : settings && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="text-blue-500" size={16} />
                  <h3 className={`font-semibold ${textPrimary}`}>Push Notifications</h3>
                </div>
                <div className={`${cardBg} rounded-xl overflow-hidden border`}>
                  {Object.entries(settings.push_notifications).map(([key, value], i, arr) => (
                    <button key={key} onClick={() => handleToggle('push_notifications', key)}
                      className={`w-full flex items-center justify-between p-3 ${i < arr.length - 1 ? (isLight ? 'border-b border-slate-200' : 'border-b border-slate-700') : ''}`}>
                      <span className={`text-sm ${textMuted}`}>{settingLabels[key]}</span>
                      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-slate-600'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${value ? 'translate-x-4.5 ml-[18px]' : 'translate-x-0.5 ml-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="text-emerald-500" size={16} />
                  <h3 className={`font-semibold ${textPrimary}`}>Email Alerts</h3>
                </div>
                <div className={`${cardBg} rounded-xl overflow-hidden border`}>
                  {Object.entries(settings.email_alerts).map(([key, value], i, arr) => (
                    <button key={key} onClick={() => handleToggle('email_alerts', key)}
                      className={`w-full flex items-center justify-between p-3 ${i < arr.length - 1 ? (isLight ? 'border-b border-slate-200' : 'border-b border-slate-700') : ''}`}>
                      <span className={`text-sm ${textMuted}`}>{settingLabels[key]}</span>
                      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${value ? 'translate-x-4.5 ml-[18px]' : 'translate-x-0.5 ml-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="text-orange-500" size={16} />
                  <h3 className={`font-semibold ${textPrimary}`}>In-App Sounds</h3>
                </div>
                <div className={`${cardBg} rounded-xl overflow-hidden border`}>
                  {Object.entries(settings.in_app_sounds).map(([key, value], i, arr) => (
                    <button key={key} onClick={() => handleToggle('in_app_sounds', key)}
                      className={`w-full flex items-center justify-between p-3 ${i < arr.length - 1 ? (isLight ? 'border-b border-slate-200' : 'border-b border-slate-700') : ''}`}>
                      <span className={`text-sm ${textMuted}`}>{settingLabels[key]}</span>
                      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-slate-600'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${value ? 'translate-x-4.5 ml-[18px]' : 'translate-x-0.5 ml-0.5'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
