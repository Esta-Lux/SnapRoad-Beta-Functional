// Settings & Configuration Tab
// =============================================

import { useState, useEffect } from 'react'
import { Settings, Shield, Bell, Globe, Database, Save, RefreshCw, Cloud, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { adminApi } from '@/services/adminApi'

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
      const token = localStorage.getItem('snaproad_admin_token')
      const res = await fetch(`${API_URL}/api/admin/supabase/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
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
      const token = localStorage.getItem('snaproad_admin_token')
      const res = await fetch(`${API_URL}/api/admin/migrate`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
        console.log('Settings saved successfully!')
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
        <p className="text-slate-600 dark:text-slate-400">Failed to load settings</p>
      </div>
    )
  }

  const general = settings.general ?? defaultGeneral
  const security = settings.security ?? defaultSecurity
  const notifications = settings.notifications ?? defaultNotifications
  const features = settings.features ?? defaultFeatures

  const heading = isDark ? 'text-white' : 'text-[#0B1220]'
  const muted = isDark ? 'text-slate-400' : 'text-slate-600'
  const labelStrong = isDark ? 'text-white' : 'text-[#0B1220]'
  const row = 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
  const rowLabel = 'min-w-0 flex-1'

  return (
    <div className="max-w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className={`text-xl font-bold sm:text-2xl ${heading}`}>Settings & Configuration</h2>
          <p className={`mt-1 text-sm ${muted}`}>Manage platform settings and preferences</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/30"
          >
            <RefreshCw size={18} className="shrink-0" />
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm text-white hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
          >
            <Save size={18} className="shrink-0" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
          <div className="mb-4 flex items-center gap-2">
            <Settings className="shrink-0 text-purple-400" size={20} />
            <h3 className={`text-lg font-semibold ${heading}`}>General Settings</h3>
          </div>
          <div className="space-y-4">
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Platform Name</div>
                <div className={`text-xs ${muted}`}>Display name for the platform</div>
              </div>
              <input
                type="text"
                value={get('general', 'platform_name', defaultGeneral.platform_name)}
                onChange={(e) => updateSetting('general', 'platform_name', e.target.value)}
                className={`min-w-0 w-full rounded-lg border px-3 py-2 sm:max-w-xs ${
                  isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
                }`}
              />
            </div>
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Maintenance Mode</div>
                <div className={`text-xs ${muted}`}>Temporarily disable platform</div>
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
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Debug Mode</div>
                <div className={`text-xs ${muted}`}>Enable detailed logging</div>
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
        <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="shrink-0 text-green-400" size={20} />
            <h3 className={`text-lg font-semibold ${heading}`}>Security Settings</h3>
          </div>
          <div className="space-y-4">
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>JWT Expiry (hours)</div>
                <div className={`text-xs ${muted}`}>Token validity period</div>
              </div>
              <input
                type="number"
                value={get('security', 'jwt_expiry_hours', defaultSecurity.jwt_expiry_hours)}
                onChange={(e) => updateSetting('security', 'jwt_expiry_hours', parseInt(e.target.value) || 0)}
                className={`w-full max-w-[6.5rem] rounded-lg border px-3 py-2 sm:w-20 ${
                  isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
                }`}
              />
            </div>
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Password Min Length</div>
                <div className={`text-xs ${muted}`}>Minimum password characters</div>
              </div>
              <input
                type="number"
                value={get('security', 'password_min_length', defaultSecurity.password_min_length)}
                onChange={(e) => updateSetting('security', 'password_min_length', parseInt(e.target.value) || 0)}
                className={`w-full max-w-[6.5rem] rounded-lg border px-3 py-2 sm:w-20 ${
                  isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
                }`}
              />
            </div>
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Require 2FA</div>
                <div className={`text-xs ${muted}`}>Two-factor authentication</div>
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
        <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="shrink-0 text-blue-400" size={20} />
            <h3 className={`text-lg font-semibold ${heading}`}>Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Email Notifications</div>
                <div className={`text-xs ${muted}`}>Send email alerts</div>
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
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Push Notifications</div>
                <div className={`text-xs ${muted}`}>Mobile push alerts</div>
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
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>System Alerts</div>
                <div className={`text-xs ${muted}`}>Critical system notifications</div>
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
        <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
          <div className="mb-4 flex items-center gap-2">
            <Globe className="shrink-0 text-purple-400" size={20} />
            <h3 className={`text-lg font-semibold ${heading}`}>Feature Flags</h3>
          </div>
          <div className="space-y-4">
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>AI Moderation</div>
                <div className={`text-xs ${muted}`}>AI-powered content moderation</div>
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
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Real-time Analytics</div>
                <div className={`text-xs ${muted}`}>Live data processing</div>
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
            <div className={row}>
              <div className={rowLabel}>
                <div className={`text-sm font-medium ${labelStrong}`}>Partner Referrals</div>
                <div className={`text-xs ${muted}`}>Referral program features</div>
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
      <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
        <div className="mb-4 flex items-center gap-2">
          <Database className="shrink-0 text-amber-400" size={20} />
          <h3 className={`text-lg font-semibold ${heading}`}>Database Configuration</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={row}>
            <div className={rowLabel}>
              <div className={`text-sm font-medium ${labelStrong}`}>Connection Pool Size</div>
              <div className={`text-xs ${muted}`}>Database connections</div>
            </div>
            <input
              type="number"
              value={get('database', 'connection_pool_size', defaultDatabase.connection_pool_size)}
              onChange={(e) => updateSetting('database', 'connection_pool_size', parseInt(e.target.value) || 0)}
              className={`w-full max-w-[6.5rem] rounded-lg border px-3 py-2 sm:w-20 ${
                isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
              }`}
            />
          </div>
          <div className={row}>
            <div className={rowLabel}>
              <div className={`text-sm font-medium ${labelStrong}`}>Query Timeout (s)</div>
              <div className={`text-xs ${muted}`}>Query time limit</div>
            </div>
            <input
              type="number"
              value={get('database', 'query_timeout_seconds', defaultDatabase.query_timeout_seconds)}
              onChange={(e) => updateSetting('database', 'query_timeout_seconds', parseInt(e.target.value) || 0)}
              className={`w-full max-w-[6.5rem] rounded-lg border px-3 py-2 sm:w-20 ${
                isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
              }`}
            />
          </div>
          <div className={`${row} sm:col-span-2 lg:col-span-1`}>
            <div className={rowLabel}>
              <div className={`text-sm font-medium ${labelStrong}`}>Backup Frequency (h)</div>
              <div className={`text-xs ${muted}`}>Backup interval</div>
            </div>
            <input
              type="number"
              value={get('database', 'backup_frequency_hours', defaultDatabase.backup_frequency_hours)}
              onChange={(e) => updateSetting('database', 'backup_frequency_hours', parseInt(e.target.value) || 0)}
              className={`w-full max-w-[6.5rem] rounded-lg border px-3 py-2 sm:w-20 ${
                isDark ? 'border-white/10 bg-slate-700/50 text-white' : 'border-[#E6ECF5] bg-white text-[#0B1220]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Supabase Status & Migration */}
      <div className={`rounded-xl border p-4 sm:p-5 ${card}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Cloud className="shrink-0 text-emerald-400" size={20} />
            <h3 className={`text-lg font-semibold ${heading}`}>Supabase</h3>
          </div>
          <button
            type="button"
            onClick={checkSupabaseStatus}
            disabled={sbLoading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw size={14} className={sbLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        {sbLoading && !supabaseStatus ? (
          <div className={`flex items-center gap-2 text-sm ${muted}`}>
            <Loader2 size={16} className="animate-spin" /> Checking status...
          </div>
        ) : supabaseStatus ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {supabaseStatus.connected ? (
                <CheckCircle size={16} className="shrink-0 text-emerald-400" />
              ) : (
                <XCircle size={16} className="shrink-0 text-red-400" />
              )}
              <span className={`text-sm ${labelStrong}`}>
                {supabaseStatus.connected ? 'Connected' : 'Not connected'}
              </span>
              {supabaseStatus.tables && (
                <span className={`text-xs ${muted}`}>
                  {supabaseStatus.tables} tables
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={runMigration}
              disabled={migrating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 sm:w-auto"
            >
              {migrating ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              {migrating ? 'Running Migration...' : 'Run Migration'}
            </button>
          </div>
        ) : (
          <p className={`text-sm ${muted}`}>Unable to fetch Supabase status</p>
        )}
      </div>
    </div>
  )
}
