import { useState } from 'react'
import { 
  X, Settings, Bell, Moon, Sun, Volume2, VolumeX, Shield, 
  MapPin, Car, User, Lock, HelpCircle, LogOut, ChevronRight,
  Globe, Smartphone, Eye, Zap
} from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userPlan?: 'basic' | 'premium' | null
  onLogout?: () => void
}

export default function SettingsModal({ isOpen, onClose, userPlan, onLogout }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      offers: true,
      challenges: true,
      safety: true,
      marketing: false,
    },
    privacy: {
      shareLocation: true,
      showOnLeaderboard: true,
      allowChallenges: true,
    },
    display: {
      darkMode: true,
      autoNightMode: true,
      mapStyle: 'dark',
    },
    audio: {
      soundEffects: true,
      voiceGuidance: true,
      orionAlerts: true,
    },
    navigation: {
      avoidTolls: false,
      avoidHighways: false,
      preferScenicRoutes: false,
    },
  })

  const toggleSetting = (category: string, setting: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: !prev[category as keyof typeof prev][setting as keyof typeof prev[typeof category]]
      }
    }))
  }

  if (!isOpen) return null

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-emerald-500' : 'bg-slate-600'
      }`}
    >
      <div 
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
          enabled ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  )

  const SettingRow = ({ 
    icon: Icon, 
    label, 
    description, 
    enabled, 
    onChange,
    premium = false 
  }: { 
    icon: any
    label: string
    description?: string
    enabled: boolean
    onChange: () => void
    premium?: boolean
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-700/50 rounded-xl flex items-center justify-center">
          <Icon className="text-slate-300" size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">{label}</span>
            {premium && userPlan !== 'premium' && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full">
                PREMIUM
              </span>
            )}
          </div>
          {description && (
            <p className="text-slate-500 text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ToggleSwitch 
        enabled={enabled && (!premium || userPlan === 'premium')} 
        onChange={premium && userPlan !== 'premium' ? () => {} : onChange} 
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-slate-800/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <Settings className="text-white" size={20} />
            <h2 className="text-white font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Notifications Section */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell size={14} />
              Notifications
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-3 divide-y divide-white/5">
              <SettingRow
                icon={Bell}
                label="Nearby Offers"
                description="Get alerts for deals near you"
                enabled={settings.notifications.offers}
                onChange={() => toggleSetting('notifications', 'offers')}
              />
              <SettingRow
                icon={Zap}
                label="Challenge Updates"
                description="Know when friends challenge you"
                enabled={settings.notifications.challenges}
                onChange={() => toggleSetting('notifications', 'challenges')}
              />
              <SettingRow
                icon={Shield}
                label="Safety Alerts"
                description="Road hazards and safety tips"
                enabled={settings.notifications.safety}
                onChange={() => toggleSetting('notifications', 'safety')}
              />
            </div>
          </div>

          {/* Privacy Section */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock size={14} />
              Privacy
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-3 divide-y divide-white/5">
              <SettingRow
                icon={MapPin}
                label="Share Location"
                description="Required for offers and navigation"
                enabled={settings.privacy.shareLocation}
                onChange={() => toggleSetting('privacy', 'shareLocation')}
              />
              <SettingRow
                icon={Eye}
                label="Show on Leaderboard"
                description="Let others see your ranking"
                enabled={settings.privacy.showOnLeaderboard}
                onChange={() => toggleSetting('privacy', 'showOnLeaderboard')}
              />
              <SettingRow
                icon={User}
                label="Allow Challenges"
                description="Friends can challenge you"
                enabled={settings.privacy.allowChallenges}
                onChange={() => toggleSetting('privacy', 'allowChallenges')}
              />
            </div>
          </div>

          {/* Display Section */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sun size={14} />
              Display
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-3 divide-y divide-white/5">
              <SettingRow
                icon={Moon}
                label="Dark Mode"
                description="Use dark theme"
                enabled={settings.display.darkMode}
                onChange={() => toggleSetting('display', 'darkMode')}
              />
              <SettingRow
                icon={Sun}
                label="Auto Night Mode"
                description="Switch themes based on time"
                enabled={settings.display.autoNightMode}
                onChange={() => toggleSetting('display', 'autoNightMode')}
                premium
              />
            </div>
          </div>

          {/* Audio Section */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Volume2 size={14} />
              Audio
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-3 divide-y divide-white/5">
              <SettingRow
                icon={Volume2}
                label="Sound Effects"
                description="Play sounds for actions"
                enabled={settings.audio.soundEffects}
                onChange={() => toggleSetting('audio', 'soundEffects')}
              />
              <SettingRow
                icon={Smartphone}
                label="Voice Guidance"
                description="Turn-by-turn voice navigation"
                enabled={settings.audio.voiceGuidance}
                onChange={() => toggleSetting('audio', 'voiceGuidance')}
              />
              <SettingRow
                icon={Globe}
                label="Orion Alerts"
                description="Orion announces nearby offers"
                enabled={settings.audio.orionAlerts}
                onChange={() => toggleSetting('audio', 'orionAlerts')}
                premium
              />
            </div>
          </div>

          {/* Navigation Section */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Car size={14} />
              Navigation
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-3 divide-y divide-white/5">
              <SettingRow
                icon={MapPin}
                label="Avoid Tolls"
                description="Prefer routes without tolls"
                enabled={settings.navigation.avoidTolls}
                onChange={() => toggleSetting('navigation', 'avoidTolls')}
              />
              <SettingRow
                icon={Car}
                label="Avoid Highways"
                description="Prefer local roads"
                enabled={settings.navigation.avoidHighways}
                onChange={() => toggleSetting('navigation', 'avoidHighways')}
              />
            </div>
          </div>

          {/* Help & Support */}
          <div className="mb-6">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <HelpCircle size={14} />
              Help & Support
            </h3>
            <div className="bg-slate-800/50 rounded-xl divide-y divide-white/5">
              <button className="w-full flex items-center justify-between p-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    <HelpCircle className="text-slate-300" size={18} />
                  </div>
                  <span className="text-white text-sm">Help Center</span>
                </div>
                <ChevronRight className="text-slate-500" size={18} />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    <Globe className="text-slate-300" size={18} />
                  </div>
                  <span className="text-white text-sm">Privacy Policy</span>
                </div>
                <ChevronRight className="text-slate-500" size={18} />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-700/50 rounded-xl flex items-center justify-center">
                    <Lock className="text-slate-300" size={18} />
                  </div>
                  <span className="text-white text-sm">Terms of Service</span>
                </div>
                <ChevronRight className="text-slate-500" size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/95 backdrop-blur">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-3 rounded-xl hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Sign Out</span>
          </button>
          <p className="text-slate-500 text-xs text-center mt-3">
            SnapRoad v1.0.0 • Made with 💚 in Columbus
          </p>
        </div>
      </div>
    </div>
  )
}
