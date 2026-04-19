import { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import ScannerWorkspace from '@/components/partner/ScannerWorkspace'

export default function TeamScanPage() {
  const pathParts = window.location.pathname.split('/')
  const partnerId = pathParts[2] || ''
  const tokenRef = useRef(pathParts[3] || sessionStorage.getItem('snaproad_team_token') || '')
  const token = tokenRef.current

  useEffect(() => {
    // Remove token from the visible URL after first render.
    if (partnerId && token) {
      sessionStorage.setItem('snaproad_team_token', token)
      window.history.replaceState({}, '', `/scan/${partnerId}`)
    }
    return () => {
      sessionStorage.removeItem('snaproad_team_token')
    }
  }, [])

  if (!partnerId || !token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h1 className="text-white text-xl font-bold mb-2">Invalid Link</h1>
          <p className="text-slate-400">This team scan link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <ScannerWorkspace partnerId={partnerId} token={token} />
      </div>
    </div>
  )
}
