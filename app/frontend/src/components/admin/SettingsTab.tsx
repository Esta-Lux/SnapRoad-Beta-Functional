// Settings & Configuration Tab
// =============================================

import { useState, useEffect } from 'react'
import { Settings, Shield, Bell, Globe, Database, Save, RefreshCw, Cloud, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

/**
 * Same auth source as {@link adminApi} (`snaproad_admin_token` via getToken()).
 * Returns null when not logged in so callers skip requests and avoid 401s.
 */
function getAdminBearerHeaders(): Record<string, string> | null {
  const token = adminApi.getToken()
  if (!token) return null
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Backend base for admin-only raw fetch calls (Supabase status/migrate).
 * Prefer VITE_BACKEND_URL; fall back to VITE_API_URL so dev/proxy setups keep working.
 */
const API_URL = String(
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '')

interface SettingsTabProps {
  theme: 'dark' | 'light'
}

type SettingsData = Record<string, Record<string, any>>

const defaultGeneral = { platform_name: '', maintenance_mode: false, debug_mode: false }
const defaultSecurity = { jwt_expiry_hours: 24, password_min_length: 8, require_2fa: false }
const defaultNotifications = { email_notifications: true, push_notifications: false, system_alerts: true }
const defaultFeatures = { ai_moderation: false, real_time_analytics: false, partner_referrals: false }
const defaultDatabase = { connection_pool_size: 10, query_timeout_seconds: 30, backup_frequency_hours: 24 }

export default function SettingsTab({ theme }: SettingsTabProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase status shape varies by backend version
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null)
  const [sbLoading, setSbLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    loadSettings()
    checkSupabaseStatus()
  }, [])

  const checkSupabaseStatus = async () => {
    setSbLoading(true)
    try {
      const headers = getAdminBearerHeaders()
      if (!headers) return
      const res = await fetch(`${API_URL}/api/admin/supabase/status`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSupabaseStatus(data.data ?? data)
      }
    } catch { /* unavailable */ }
    finally {
      setSbLoading(false)
    }
  }

  const runMigration = async () => {
    setMigrating(true)
    try {
      const headers = getAdminBearerHeaders()
      if (!headers) return
      const res = await fetch(`${API_URL}/api/admin/supabase/migrate`, {
        method: 'POST',
        headers,
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          checkSupabaseStatus()
        }
      }
    } catch { /* unavailable */ }
    finally {
      setMigrating(false)
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSettings()
      if (res.success && res.data) {
        setSettings(res.data)
      } else {
        setSettings(null)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => {
      if (!prev) return prev
      const cat = prev[category] || {}
      return {
        ...prev,
        [category]: { ...cat, [key]: value }
      }
    })
  }

  const get = (category: string, key: string, fallback: any) => {
    return settings?.[category]?.[key] ?? fallback
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await adminApi.updateSettings(settings)
      if (res.success) {
      } else {
        console.error('Failed to save settings:', res.error || res.message)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-slate-800/50 border-white/[0.08]' : 'bg-white border-[#E6ECF5]'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">Failed to load settings</p>
      </div>
    )
  }

  const general = settings.general ?? defaultGeneral
  const security = settings.security ?? defaultSecurity
  const notifications = settings.notifications ?? defaultNotifications
  const features = settings.features ?? defaultFeatures

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Settings & Configuration</h2>
          <p className="text-slate-400">Manage platform settings and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30">
            <RefreshCw size={18} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="text-purple-400" size={20} />
            <h3 className="text-lg font-semibold text-white">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Platform Name</div>
                <div className="text-xs text-slate-400">Display name for the platform</div>
              </div>
              <input
                type="text"
                value={get('general', 'platform_name', defaultGeneral.platform_name)}
                onChange={(e) => updateSetting('general', 'platform_name', e.target.value)}
                className={`px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Maintenance Mode</div>
                <div className="text-xs text-slate-400">Temporarily disable platform</div>
              </div>
              <button
                onClick={() => updateSetting('general', 'maintenance_mode', !general.maintenance_mode)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {general.maintenance_mode ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Debug Mode</div>
                <div className="text-xs text-slate-400">Enable detailed logging</div>
              </div>
              <button
                onClick={() => updateSetting('general', 'debug_mode', !general.debug_mode)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {general.debug_mode ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-green-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Security Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">JWT Expiry (hours)</div>
                <div className="text-xs text-slate-400">Token validity period</div>
              </div>
              <input
                type="number"
                value={get('security', 'jwt_expiry_hours', defaultSecurity.jwt_expiry_hours)}
                onChange={(e) => updateSetting('security', 'jwt_expiry_hours', parseInt(e.target.value) || 0)}
                className={`w-20 px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Password Min Length</div>
                <div className="text-xs text-slate-400">Minimum password characters</div>
              </div>
              <input
                type="number"
                value={get('security', 'password_min_length', defaultSecurity.password_min_length)}
                onChange={(e) => updateSetting('security', 'password_min_length', parseInt(e.target.value) || 0)}
                className={`w-20 px-3 py-2 rounded-lg border ${
                  isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
                }`}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Require 2FA</div>
                <div className="text-xs text-slate-400">Two-factor authentication</div>
              </div>
              <button
                onClick={() => updateSetting('security', 'require_2fa', !security.require_2fa)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {security.require_2fa ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Email Notifications</div>
                <div className="text-xs text-slate-400">Send email alerts</div>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'email_notifications', !notifications.email_notifications)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {notifications.email_notifications ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Push Notifications</div>
                <div className="text-xs text-slate-400">Mobile push alerts</div>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'push_notifications', !notifications.push_notifications)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {notifications.push_notifications ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">System Alerts</div>
                <div className="text-xs text-slate-400">Critical system notifications</div>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'system_alerts', !notifications.system_alerts)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {notifications.system_alerts ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Settings */}
        <div className={`p-5 rounded-xl border ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="text-purple-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Feature Flags</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">AI Moderation</div>
                <div className="text-xs text-slate-400">AI-powered content moderation</div>
              </div>
              <button
                onClick={() => updateSetting('features', 'ai_moderation', !features.ai_moderation)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {features.ai_moderation ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Real-time Analytics</div>
                <div className="text-xs text-slate-400">Live data processing</div>
              </div>
              <button
                onClick={() => updateSetting('features', 'real_time_analytics', !features.real_time_analytics)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {features.real_time_analytics ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Partner Referrals</div>
                <div className="text-xs text-slate-400">Referral program features</div>
              </div>
              <button
                onClick={() => updateSetting('features', 'partner_referrals', !features.partner_referrals)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {features.partner_referrals ? (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-green-500 transition-transform translate-x-6" />
                ) : (
                  <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition-transform translate-x-1" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Database Settings */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <Database className="text-amber-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Database Configuration</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Connection Pool Size</div>
              <div className="text-xs text-slate-400">Database connections</div>
            </div>
            <input
              type="number"
              value={get('database', 'connection_pool_size', defaultDatabase.connection_pool_size)}
              onChange={(e) => updateSetting('database', 'connection_pool_size', parseInt(e.target.value) || 0)}
              className={`w-20 px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Query Timeout (s)</div>
              <div className="text-xs text-slate-400">Query time limit</div>
            </div>
            <input
              type="number"
              value={get('database', 'query_timeout_seconds', defaultDatabase.query_timeout_seconds)}
              onChange={(e) => updateSetting('database', 'query_timeout_seconds', parseInt(e.target.value) || 0)}
              className={`w-20 px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Backup Frequency (h)</div>
              <div className="text-xs text-slate-400">Backup interval</div>
            </div>
            <input
              type="number"
              value={get('database', 'backup_frequency_hours', defaultDatabase.backup_frequency_hours)}
              onChange={(e) => updateSetting('database', 'backup_frequency_hours', parseInt(e.target.value) || 0)}
              className={`w-20 px-3 py-2 rounded-lg border ${
                isDark ? 'bg-slate-700/50 border-white/10 text-white' : 'bg-white border-[#E6ECF5] text-[#0B1220]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Supabase Status & Migration */}
      <div className={`p-5 rounded-xl border ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="text-emerald-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Supabase</h3>
          </div>
          <button
            onClick={checkSupabaseStatus}
            disabled={sbLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={sbLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {sbLoading && !supabaseStatus ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Checking status...
          </div>
        ) : supabaseStatus ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {supabaseStatus.connected ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
              <span className="text-sm text-white">
                {supabaseStatus.connected ? 'Connected' : 'Not connected'}
              </span>
              {supabaseStatus.tables && (
                <span className="text-xs text-slate-400 ml-2">
                  {supabaseStatus.tables} tables
                </span>
              )}
            </div>
            <button
              onClick={runMigration}
              disabled={migrating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50 text-sm"
            >
              {migrating ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              {migrating ? 'Running Migration...' : 'Run Migration'}
            </button>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Unable to fetch Supabase status</p>
        )}
      </div>
    </div>
  )
}
