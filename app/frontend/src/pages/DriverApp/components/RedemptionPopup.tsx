import { useState, useEffect } from 'react'
import { X, Gem, MapPin, Clock, Check, QrCode, AlertCircle, Navigation } from 'lucide-react'

interface Offer {
  id: number
  business_name: string
  business_type?: string
  description?: string
  discount_percent: number
  base_gems?: number
  gems_reward?: number
  lat?: number
  lng?: number
  distance?: number
  expires_at?: string
}

interface RedemptionPopupProps {
  offer: Offer | null
  userPlan: 'basic' | 'premium' | null
  userLocation: { lat: number; lng: number }
  onClose: () => void
  onRedeem: (offerId: number) => void
}

export default function RedemptionPopup({
  offer,
  userPlan,
  userLocation,
  onClose,
  onRedeem,
}: RedemptionPopupProps) {
  const [step, setStep] = useState<'details' | 'qr'>('details')
  const [isInRange, setIsInRange] = useState(true)
  const [countdown, setCountdown] = useState(120) // 2 min QR expiry
  const [isRedeeming, setIsRedeeming] = useState(false)
  const haversineMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  useEffect(() => {
    if (!offer) return

    const distance =
      typeof offer.distance === 'number'
        ? offer.distance
        : (typeof offer.lat === 'number' && typeof offer.lng === 'number'
          ? haversineMiles(userLocation.lat, userLocation.lng, offer.lat, offer.lng)
          : Number.POSITIVE_INFINITY)
    setIsInRange(distance < 1) // Within 1 mile

    // Generate QR code data
  }, [offer, userLocation])

  useEffect(() => {
    if (step !== 'qr') return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setStep('details')
          return 120
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step])

  if (!offer) return null

  // Calculate actual discount based on plan
  const actualDiscount = userPlan === 'premium' 
    ? Math.round(offer.discount_percent * 1.5) // Premium gets 1.5x
    : offer.discount_percent
  
  const gemsReward = offer.gems_reward || offer.base_gems || 50
  const isPremium = userPlan === 'premium'

  const handleGetQR = () => {
    if (!isInRange) return
    setStep('qr')
  }

  const handleRedeem = async () => {
    setIsRedeeming(true)
    await onRedeem(offer.id)
    setIsRedeeming(false)
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBusinessIcon = () => {
    switch (offer.business_type) {
      case 'gas': return '⛽'
      case 'cafe': return '☕'
      case 'restaurant': return '🍔'
      case 'carwash': return '🚗'
      default: return '🎁'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 animate-slide-up">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          
          {/* Header */}
          <div className="relative p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
            >
              <X className="text-white/80" size={16} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center text-3xl">
                {getBusinessIcon()}
              </div>
              <div className="flex-1">
                <h2 className="text-white font-bold text-lg leading-tight">{offer.business_name}</h2>
                <p className="text-slate-400 text-sm">{offer.description || 'Special offer'}</p>
              </div>
            </div>
          </div>

          {/* Details Step */}
          {step === 'details' && (
            <div className="p-4">
              {/* Discount & Gems Row */}
              <div className="flex gap-3 mb-4">
                {/* Discount Card */}
                <div className="flex-1 bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 text-center">
                  <p className="text-emerald-400 text-3xl font-bold">{actualDiscount}%</p>
                  <p className="text-emerald-300 text-xs font-medium mt-1">OFF</p>
                  {isPremium && (
                    <span className="inline-block mt-2 bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">
                      PREMIUM RATE
                    </span>
                  )}
                </div>
                
                {/* Gems Card */}
                <div className="flex-1 bg-cyan-500/10 rounded-2xl p-4 border border-cyan-500/20 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Gem className="text-cyan-400" size={20} />
                    <p className="text-cyan-400 text-3xl font-bold">+{gemsReward}</p>
                  </div>
                  <p className="text-cyan-300 text-xs font-medium mt-1">GEMS</p>
                </div>
              </div>

              {/* Location Info */}
              <div className="bg-slate-700/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className={`${isInRange ? 'text-emerald-400' : 'text-amber-400'}`} size={16} />
                  <span className="text-slate-300 text-sm">
                    {offer.distance != null ? `${Number(offer.distance).toFixed(1)} miles away` : '0.3 miles away'}
                  </span>
                  {isInRange && (
                    <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                      In Range
                    </span>
                  )}
                </div>
              </div>

              {/* Not in range warning */}
              {!isInRange && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-amber-400 text-sm font-medium">Too far away</p>
                    <p className="text-slate-400 text-xs">Drive closer to this location to unlock the QR code</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-700/50 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleGetQR}
                  disabled={!isInRange}
                  className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    isInRange
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400'
                      : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <QrCode size={18} />
                  Get QR Code
                </button>
              </div>

              {/* Navigate Button */}
              <button className="w-full mt-3 bg-blue-500/10 text-blue-400 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors">
                <Navigation size={16} />
                Navigate Here
              </button>
            </div>
          )}

          {/* QR Code Step */}
          {step === 'qr' && (
            <div className="p-4">
              {/* Timer Warning */}
              <div className="flex items-center justify-center gap-2 mb-4 text-amber-400">
                <Clock size={16} />
                <span className="font-mono font-bold text-lg">{formatTime(countdown)}</span>
                <span className="text-sm text-slate-400">remaining</span>
              </div>

              {/* QR Code Display */}
              <div className="bg-white rounded-2xl p-4 mb-4 relative overflow-hidden">
                {/* QR Code Pattern (simplified visual) */}
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center relative">
                  <div className="absolute inset-4 border-2 border-slate-800 rounded-lg" />
                  <div className="grid grid-cols-7 gap-1 p-6">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-4 h-4 rounded-sm ${
                          Math.random() > 0.4 ? 'bg-slate-800' : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  {/* Corner markers */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-4 border-slate-800 rounded-sm" />
                  <div className="absolute top-3 right-3 w-8 h-8 border-4 border-slate-800 rounded-sm" />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-4 border-slate-800 rounded-sm" />
                </div>
                
                {/* Secure overlay (screenshot protection visual) */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />
              </div>

              {/* Instructions */}
              <div className="text-center mb-4">
                <p className="text-white font-medium">Show this to the cashier</p>
                <p className="text-slate-400 text-sm">QR code expires in {formatTime(countdown)}</p>
              </div>

              {/* Redeem Button */}
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
              >
                {isRedeeming ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    Mark as Redeemed
                  </>
                )}
              </button>

              {/* Back Button */}
              <button
                onClick={() => setStep('details')}
                className="w-full mt-2 text-slate-400 text-sm py-2 hover:text-white"
              >
                ← Back to details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
