import { Link } from 'react-router-dom'

/**
 * Shown on the partner portal host when users hit legacy driver web paths (/driver).
 */
export default function DriverWebRetiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">SnapRoad for drivers</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          The map and navigation experience for drivers is available on{' '}
          <span className="text-slate-200 font-medium">iOS and Android</span>. This site is for business
          partners.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/portal/partner/sign-in"
            className="inline-flex justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Partner sign in
          </Link>
          <Link
            to="/portal/partner/welcome"
            className="inline-flex justify-center rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Partner overview
          </Link>
        </div>
        <p className="text-xs text-slate-500 pt-4">
          Consumer updates: <span className="text-slate-400">snaproad.app</span>
        </p>
      </div>
    </div>
  )
}
