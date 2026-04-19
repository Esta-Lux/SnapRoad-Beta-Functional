import { useEffect, useRef, useState } from 'react'
import { QrCode, Check, AlertCircle, Camera, Gem, Gift, CheckCircle2 } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { partnerApi } from '@/services/partnerApi'

interface ScanResult {
  offer: {
    id: string
    title: string
    business_name: string
    discount_percent: number
    base_gems: number
  }
  customer_id?: string
  user_display_name?: string
}

interface Props {
  partnerId: string
  token: string
  title?: string
  subtitle?: string
}

export default function ScannerWorkspace({
  partnerId,
  token,
  title = 'SnapRoad Scanner',
  subtitle = 'Scan customer QR codes to apply discounts',
}: Props) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [validatedQrData, setValidatedQrData] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        void Promise.resolve(scannerRef.current.stop()).catch(() => {})
        void Promise.resolve(scannerRef.current.clear()).catch(() => {})
      }
    }
  }, [])

  const startCamera = async () => {
    setStatus('scanning')
    setErrorMsg('')
    setRedeemMsg('')
    try {
      const scanner = new Html5Qrcode(`team-qr-reader-${partnerId}`)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await scanner.stop().catch(() => {})
          setManualCode(decodedText)
          validateQr(decodedText)
        },
        () => {},
      )
    } catch {
      setErrorMsg('Camera access denied or unavailable. Use manual code entry instead.')
      setStatus('idle')
    }
  }

  const stopCamera = () => {
    if (scannerRef.current) {
      void Promise.resolve(scannerRef.current.stop()).catch(() => {})
      void Promise.resolve(scannerRef.current.clear()).catch(() => {})
      scannerRef.current = null
    }
  }

  const validateQr = async (qrData: string) => {
    stopCamera()
    try {
      const res = await partnerApi.validateScan(token, qrData)
      if (res.success) {
        setScanResult(res.data)
        setValidatedQrData(qrData)
        setRedeemMsg('')
        setStatus('success')
      } else {
        setErrorMsg(res.message || 'Invalid QR code')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    }
  }

  const applyDiscount = async () => {
    if (!validatedQrData) return
    setRedeeming(true)
    try {
      const res = await partnerApi.redeemScan(token, validatedQrData)
      if (res.success) {
        setRedeemMsg('Discount applied and redemption recorded successfully.')
      } else {
        setErrorMsg(res.message || 'Could not complete redemption')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    } finally {
      setRedeeming(false)
    }
  }

  const handleManualSubmit = () => {
    if (manualCode.trim()) validateQr(manualCode.trim())
  }

  const reset = () => {
    setStatus('idle')
    setScanResult(null)
    setErrorMsg('')
    setManualCode('')
    setValidatedQrData('')
    setRedeemMsg('')
  }

  if (!partnerId || !token) {
    return (
      <div className="min-h-[50vh] bg-slate-900 flex items-center justify-center p-4 rounded-3xl">
        <div className="text-center">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h1 className="text-white text-xl font-bold mb-2">Scanner Unavailable</h1>
          <p className="text-slate-400">Choose or create an active team scan link first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 text-white rounded-3xl overflow-hidden border border-white/5">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center gap-3">
        <QrCode size={24} className="text-white" />
        <div>
          <h1 className="text-white font-bold text-lg">{title}</h1>
          <p className="text-emerald-100 text-xs">{subtitle}</p>
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
              <div id={`team-qr-reader-${partnerId}`} className="w-full h-full" />
              <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-2xl pointer-events-none" />
              <div className="absolute inset-[20%] border-2 border-emerald-400 rounded-lg animate-pulse pointer-events-none" />
            </div>
            <p className="text-center text-slate-400 text-sm">Point camera at customer QR code</p>
            <button onClick={() => { stopCamera(); setStatus('idle') }} className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl">
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
              <p className="text-slate-400 text-sm">Customer QR code is valid</p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-semibold">{scanResult.offer.title}</h3>
              <p className="text-slate-400 text-sm">{scanResult.offer.business_name}</p>
              {(scanResult.user_display_name || scanResult.customer_id) && (
                <p className="text-emerald-300 text-sm">Customer: {scanResult.user_display_name || scanResult.customer_id}</p>
              )}
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

            {redeemMsg ? (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0" size={20} />
                <p className="text-cyan-200 text-sm">{redeemMsg}</p>
              </div>
            ) : (
              <button
                onClick={applyDiscount}
                disabled={redeeming}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-2xl font-semibold text-lg disabled:opacity-60"
              >
                {redeeming ? 'Applying...' : 'Apply Discount'}
              </button>
            )}

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
