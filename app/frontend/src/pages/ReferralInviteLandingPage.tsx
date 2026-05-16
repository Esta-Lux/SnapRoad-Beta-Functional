import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import snaproadLogo from '../assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png'
import {
  detectMobilePlatform,
  SNAPROAD_ANDROID_PLAY_STORE_URL,
  SNAPROAD_IOS_APP_STORE_URL,
  storeUrlForPlatform,
  type MobilePlatform,
} from '@/lib/storeLinks'

const PENDING_REFERRAL_KEY = 'snaproad_pending_referral_code'

type RouteParams = {
  code?: string
}

function normalizeCode(raw: string | undefined): string {
  const trimmed = (raw || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!trimmed) return ''
  return trimmed.startsWith('SNAP-') ? trimmed.slice(5) : trimmed
}

function buildDeepLink(pathPrefix: 'referral' | 'invite', code: string): string {
  return `snaproad://${pathPrefix}/${encodeURIComponent(code)}`
}

function persistReferralCode(code: string) {
  try {
    localStorage.setItem(PENDING_REFERRAL_KEY, code)
  } catch {
    // Private mode / blocked storage — deep link still works when app is installed.
  }
}

function tryOpenApp(pathPrefix: 'referral' | 'invite', code: string) {
  persistReferralCode(code)
  window.location.href = buildDeepLink(pathPrefix, code)
}

type ReferralInviteLandingPageProps = Readonly<{
  pathPrefix: 'referral' | 'invite'
}>

export default function ReferralInviteLandingPage({ pathPrefix }: ReferralInviteLandingPageProps) {
  const { code: rawCode } = useParams<RouteParams>()
  const code = useMemo(() => normalizeCode(rawCode), [rawCode])
  const [platform] = useState<MobilePlatform>(() => detectMobilePlatform())
  const [phase, setPhase] = useState<'opening' | 'store' | 'invalid'>(
    () => (code ? 'opening' : 'invalid'),
  )

  useEffect(() => {
    if (!code) {
      setPhase('invalid')
      return
    }
    tryOpenApp(pathPrefix, code)
    const timer = window.setTimeout(() => {
      setPhase('store')
      window.location.replace(storeUrlForPlatform(platform))
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [code, pathPrefix, platform])

  if (phase === 'invalid' || !code) {
    return (
      <LandingShell>
        <img src={snaproadLogo} alt="SnapRoad" className="h-12 w-12 rounded-2xl mx-auto" />
        <h1 className="text-xl font-bold text-slate-100 mt-6">Invalid invite link</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          This referral link is missing a code. Ask your friend to send a new invite from SnapRoad.
        </p>
        <StoreButtons className="mt-8" />
      </LandingShell>
    )
  }

  const codeLabel = `SNAP-${code}`

  return (
    <LandingShell>
      <img src={snaproadLogo} alt="SnapRoad" className="h-12 w-12 rounded-2xl mx-auto" />
      <h1 className="text-xl font-bold text-slate-100 mt-6">You&apos;re invited to SnapRoad</h1>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
        {phase === 'opening'
          ? 'Opening the SnapRoad app…'
          : 'Redirecting to the App Store or Google Play…'}
      </p>
      <p className="text-slate-300 text-sm font-semibold mt-4 tracking-wide">{codeLabel}</p>
      <p className="text-slate-500 text-xs mt-3 leading-relaxed max-w-sm mx-auto">
        Don&apos;t have the app yet? Download SnapRoad, create your account, and your friend earns gems
        when you join.
      </p>
      <StoreButtons className="mt-8" />
      <button
        type="button"
        className="mt-6 text-sm font-semibold text-blue-400 hover:text-blue-300"
        onClick={() => tryOpenApp(pathPrefix, code)}
      >
        Open in SnapRoad app
      </button>
    </LandingShell>
  )
}

function LandingShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-md w-full text-center">{children}</div>
    </div>
  )
}

function StoreButtons({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 justify-center ${className}`}>
      <a
        href={SNAPROAD_IOS_APP_STORE_URL}
        className="inline-flex justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
      >
        Download on App Store
      </a>
      <a
        href={SNAPROAD_ANDROID_PLAY_STORE_URL}
        className="inline-flex justify-center rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
      >
        Get it on Google Play
      </a>
    </div>
  )
}
