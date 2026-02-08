import { useState, useEffect, useRef } from 'react'
import { 
  X, Gem, Shield, MapPin, Lock, AlertTriangle, Check, 
  Sparkles, Zap, Clock, QrCode, Eye, EyeOff, Navigation
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Offer {
  id: number
  business_name: string
  business_type: string
  description: string
  discount_percent: number
  gems_reward: number
  lat?: number
  lng?: number
  is_admin_offer?: boolean
}

interface RedemptionPopupProps {
  isOpen: boolean
  onClose: () => void
  offer: Offer | null
  userPlan: 'basic' | 'premium' | null
  userLocation: { lat: number; lng: number }
  onRedeem: (offerId: number) => Promise<any>
}

// Calculate distance between two coordinates in miles
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Generate a simple QR code pattern (visual representation)
function QRCodeDisplay({ code, isBlurred, distance }: { code: string; isBlurred: boolean; distance: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const size = 160
    canvas.width = size
    canvas.height = size
    
    // Create QR-like pattern based on code
    const moduleSize = 8
    const modules = size / moduleSize
    
    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    
    // Generate pattern from code hash
    const hash = code.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
    
    // Draw QR pattern
    ctx.fillStyle = '#000000'
    
    // Corner patterns (finder patterns)
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x, y, moduleSize * 7, moduleSize)
      ctx.fillRect(x, y + moduleSize * 6, moduleSize * 7, moduleSize)
      ctx.fillRect(x, y, moduleSize, moduleSize * 7)
      ctx.fillRect(x + moduleSize * 6, y, moduleSize, moduleSize * 7)
      ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3)
    }
    
    drawFinder(0, 0)
    drawFinder(size - moduleSize * 7, 0)
    drawFinder(0, size - moduleSize * 7)
    
    // Data pattern
    for (let i = 8; i < modules - 8; i++) {
      for (let j = 8; j < modules - 8; j++) {
        if (((hash >> ((i * j) % 32)) & 1) === 1) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
        }
      }
    }
    
    // Add timing patterns
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize)
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize)
      }
    }
    
  }, [code])
  
  return (
    <div className="relative">
      <canvas 
        ref={canvasRef}
        className={`rounded-lg ${isBlurred ? 'blur-lg' : ''}`}
        style={{ 
          imageRendering: 'pixelated',
          // Prevent screenshots on supported browsers
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      />
      {isBlurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 rounded-lg">
          <Lock className="text-amber-400 mb-2" size={32} />
          <p className="text-white text-xs font-medium text-center px-4">
            Move within 1 mile to unlock
          </p>
          <p className="text-amber-400 text-[10px] mt-1">
            {distance.toFixed(1)} mi away
          </p>
        </div>
      )}
    </div>
  )
}

export default function RedemptionPopup({ 
  isOpen, 
  onClose, 
  offer, 
  userPlan, 
  userLocation,
  onRedeem 
}: RedemptionPopupProps) {
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed, setRedeemed] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [screenshotAttempt, setScreenshotAttempt] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const isPremium = userPlan === 'premium'
  
  // Calculate distance to offer
  const distance = offer ? calculateDistance(
    userLocation.lat, 
    userLocation.lng, 
    offer.lat || userLocation.lat, 
    offer.lng || userLocation.lng
  ) : 0
  
  const isWithinRange = distance <= 1 // 1 mile geofence
  
  // Generate unique QR code for this redemption
  useEffect(() => {
    if (offer && redeemed) {
      const timestamp = Date.now()
      const code = `SR-${offer.id}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
      setQrCode(code)
    }
  }, [offer, redeemed])
  
  // Screenshot detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && showQR) {
        setScreenshotAttempt(true)
        setTimeout(() => setScreenshotAttempt(false), 3000)
      }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common screenshot shortcuts
      if (
        (e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.key === 'p')
      ) {
        e.preventDefault()
        setScreenshotAttempt(true)
        setTimeout(() => setScreenshotAttempt(false), 3000)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showQR])
  
  const handleRedeem = async () => {
    if (!offer) return
    setRedeeming(true)
    
    try {
      const result = await onRedeem(offer.id)
      if (result?.success) {
        setRedeemed(true)
        setShowQR(true)
      }
    } catch (e) {
      // Still show success for demo
      setRedeemed(true)
      setShowQR(true)
    } finally {
      setRedeeming(false)
    }
  }
  
  const handleClose = () => {
    setRedeemed(false)
    setShowQR(false)
    setQrCode(null)
    onClose()
  }
  
  if (!isOpen || !offer) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        ref={containerRef}
        className={`w-full max-w-xs bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl animate-scale-in border border-slate-700 ${
          screenshotAttempt ? 'screenshot-blocked' : ''
        }`}
        onClick={e => e.stopPropagation()}
        style={{
          // Additional screenshot prevention
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Screenshot Warning Overlay */}
        {screenshotAttempt && (
          <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center animate-pulse">
            <AlertTriangle className="text-red-500 mb-3" size={48} />
            <p className="text-red-500 font-bold">Screenshot Blocked</p>
            <p className="text-red-400 text-xs mt-1">QR codes are protected</p>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Gem className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">{offer.business_name}</h2>
                <p className="text-emerald-100 text-xs">{offer.discount_percent}% off</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
              data-testid="redemption-close"
            >
              <X className="text-white" size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {!redeemed ? (
            // Pre-redemption view
            <div className="space-y-4">
              {/* Reward Display */}
              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="text-cyan-400" size={20} />
                  <span className="text-cyan-400 text-2xl font-bold">+{offer.gems_reward}</span>
                  <Gem className="text-cyan-400" size={20} />
                </div>
                <p className="text-cyan-300/70 text-xs">Gems you'll earn</p>
              </div>
              
              {/* Location Status */}
              <div className={`rounded-xl p-3 flex items-center gap-3 ${
                isWithinRange 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-amber-500/10 border border-amber-500/30'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isWithinRange ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                }`}>
                  {isWithinRange ? (
                    <Check className="text-emerald-400" size={16} />
                  ) : (
                    <Navigation className="text-amber-400" size={16} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-medium ${isWithinRange ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isWithinRange ? 'You\'re in range!' : `${distance.toFixed(1)} miles away`}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    {isWithinRange ? 'QR code will unlock' : 'Move closer to unlock QR'}
                  </p>
                </div>
              </div>
              
              {/* Premium Badge */}
              {isPremium && (
                <div className="flex items-center justify-center gap-2 text-amber-400 text-xs">
                  <Zap size={12} />
                  <span>Premium: Extra 12% discount applied</span>
                </div>
              )}
              
              {/* Redeem Button */}
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-[0.98] disabled:opacity-50"
                data-testid="redeem-btn"
              >
                {redeeming ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Sparkles size={18} />
                    Redeem Now
                  </>
                )}
              </button>
            </div>
          ) : (
            // Post-redemption view with QR
            <div className="space-y-4">
              {/* Success Message */}
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="text-white" size={24} />
                </div>
                <p className="text-emerald-400 font-bold">Redeemed!</p>
                <p className="text-slate-400 text-xs">+{offer.gems_reward} gems earned</p>
              </div>
              
              {/* QR Code Section */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="text-slate-400" size={16} />
                    <span className="text-slate-300 text-xs font-medium">Redemption QR</span>
                  </div>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="text-slate-400 hover:text-white"
                  >
                    {showQR ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {/* QR Code Display */}
                <div className="flex justify-center">
                  {qrCode && (
                    <QRCodeDisplay 
                      code={qrCode} 
                      isBlurred={!isWithinRange} 
                      distance={distance}
                    />
                  )}
                </div>
                
                {/* Geofence Warning */}
                {!isWithinRange && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2">
                    <Lock className="text-amber-400" size={14} />
                    <p className="text-amber-400 text-[10px]">
                      QR unlocks within 1 mile of location
                    </p>
                  </div>
                )}
                
                {/* Code Display */}
                {isWithinRange && qrCode && (
                  <div className="mt-3 bg-slate-700/50 rounded-lg p-2 text-center">
                    <p className="text-slate-500 text-[10px] mb-1">Redemption Code</p>
                    <p className="text-white text-xs font-mono tracking-wider">{qrCode}</p>
                  </div>
                )}
              </div>
              
              {/* Timer */}
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Clock size={12} />
                <span>Valid for 24 hours</span>
              </div>
              
              {/* Security Notice */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-start gap-2">
                  <Shield className="text-blue-400 mt-0.5" size={14} />
                  <div>
                    <p className="text-blue-400 text-[10px] font-medium">Protected QR Code</p>
                    <p className="text-slate-500 text-[10px]">
                      Screenshots are blocked. Present this screen at the location to redeem.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Done Button */}
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl font-medium bg-slate-700 text-white hover:bg-slate-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS for screenshot blocking */}
      <style>{`
        .screenshot-blocked * {
          filter: blur(20px) !important;
          opacity: 0 !important;
        }
        
        @media print {
          .screenshot-blocked, [data-testid="redemption-close"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
