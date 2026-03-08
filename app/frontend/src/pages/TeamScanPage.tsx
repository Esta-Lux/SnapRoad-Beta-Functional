import { useState, useEffect, useRef } from 'react'
import { QrCode, Check, AlertCircle, Camera, Gem, Gift } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface ScanResult {
  offer: {
    id: string
    title: string
    business_name: string
    discount_percent: number
    base_gems: number
  }
  customer_id?: string
}

export default function TeamScanPage() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const pathParts = window.location.pathname.split('/')
  const partnerId = pathParts[2] || ''
  const token = pathParts[3] || ''

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    setStatus('scanning')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setErrorMsg('Camera access denied. Use manual code entry instead.')
      setStatus('idle')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const validateQr = async (qrData: string) => {
    stopCamera()
    try {
      const res = await fetch(`${API_URL}/api/partner/v2/scan/validate?token=${token}&qr_data=${encodeURIComponent(qrData)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setScanResult(data.data)
        setStatus('success')
      } else {
        setErrorMsg(data.message || 'Invalid QR code')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      validateQr(manualCode.trim())
    }
  }

  const reset = () => {
    setStatus('idle')
    setScanResult(null)
    setErrorMsg('')
    setManualCode('')
  }

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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center gap-3">
        <QrCode size={24} className="text-white" />
        <div>
          <h1 className="text-white font-bold text-lg">SnapRoad Scanner</h1>
          <p className="text-emerald-100 text-xs">Scan customer QR codes to apply discounts</p>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {status === 'idle' && (
          <>
            <button
              onClick={startCamera}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-lg"
            >
              <Camera size={24} />
              Open Camera Scanner
            </button>

            <div className="text-center text-slate-500 text-sm">or enter code manually</div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter QR code data..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="px-6 bg-emerald-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                Go
              </button>
            </div>
          </>
        )}

        {status === 'scanning' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-2xl" />
              <div className="absolute inset-[20%] border-2 border-emerald-400 rounded-lg animate-pulse" />
            </div>
            <p className="text-center text-slate-400 text-sm">Point camera at customer's QR code</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste code here..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="px-4 bg-emerald-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
              >
                Submit
              </button>
            </div>
            <button onClick={() => { stopCamera(); setStatus('idle'); }} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl">
              Cancel
            </button>
          </div>
        )}

        {status === 'success' && scanResult && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-white" />
              </div>
              <h2 className="text-emerald-400 font-bold text-xl mb-1">Verified!</h2>
              <p className="text-slate-400 text-sm">Customer's QR code is valid</p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-semibold">{scanResult.offer.title}</h3>
              <p className="text-slate-400 text-sm">{scanResult.offer.business_name}</p>
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-500/10 rounded-xl p-3 text-center">
                  <Gift size={18} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-emerald-400 font-bold text-lg">{scanResult.offer.discount_percent}% OFF</p>
                </div>
                <div className="flex-1 bg-cyan-500/10 rounded-xl p-3 text-center">
                  <Gem size={18} className="text-cyan-400 mx-auto mb-1" />
                  <p className="text-cyan-400 font-bold text-lg">+{scanResult.offer.base_gems}</p>
                  <p className="text-cyan-300/70 text-[10px]">gems</p>
                </div>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-semibold text-lg"
            >
              Scan Next Customer
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-red-400 font-bold text-xl mb-1">Scan Failed</h2>
              <p className="text-slate-400 text-sm">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
