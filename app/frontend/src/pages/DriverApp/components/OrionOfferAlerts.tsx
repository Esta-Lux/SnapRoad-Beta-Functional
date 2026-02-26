import { useState, useEffect, useRef } from 'react'
import { Gift, X, MapPin, Gem, ChevronRight, Volume2, VolumeX, Navigation } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''

interface Offer {
  id: number
  business_name: string
  business_type: string
  description: string
  discount_percent: number
  gems_reward: number
  distance?: number
  lat?: number
  lng?: number
}

interface OrionOfferAlertsProps {
  isNavigating: boolean
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  onOfferSelect: (offer: Offer) => void
  isPremium: boolean
}

export default function OrionOfferAlerts({ 
  isNavigating, 
  userLocation, 
  offers, 
  onOfferSelect,
  isPremium 
}: OrionOfferAlertsProps) {
  const [currentAlert, setCurrentAlert] = useState<Offer | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [muted, setMuted] = useState(false)
  const [shownOffers, setShownOffers] = useState<Set<number>>(new Set())
  const [lastAlertTime, setLastAlertTime] = useState(0)
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for nearby offers periodically during navigation
  useEffect(() => {
    if (!isNavigating) {
      setCurrentAlert(null)
      setShowAlert(false)
      return
    }

    // Check every 30 seconds for nearby offers (simulate driving)
    const checkInterval = setInterval(() => {
      const now = Date.now()
      
      // Don't show alerts more than once every 2 minutes
      if (now - lastAlertTime < 120000) return
      
      // Find an offer that hasn't been shown and is "nearby"
      const availableOffers = offers.filter(o => 
        !shownOffers.has(o.id) && 
        !o.redeemed
      )
      
      if (availableOffers.length > 0) {
        // Randomly select one of the first 2 offers
        const randomIndex = Math.floor(Math.random() * Math.min(2, availableOffers.length))
        const selectedOffer = availableOffers[randomIndex]
        
        // Add some mock distance
        const offerWithDistance = {
          ...selectedOffer,
          distance: (Math.random() * 0.8 + 0.2).toFixed(1) // 0.2 - 1.0 miles
        }
        
        setCurrentAlert(offerWithDistance as Offer)
        setShowAlert(true)
        setLastAlertTime(now)
        setShownOffers(prev => new Set([...prev, selectedOffer.id]))
        
        // Speak the alert
        if (!muted) {
          speakAlert(offerWithDistance as Offer)
        }
        
        // Auto-dismiss after 15 seconds
        alertTimeoutRef.current = setTimeout(() => {
          setShowAlert(false)
        }, 15000)
      }
    }, 30000) // Check every 30 seconds

    // Initial check after 5 seconds of navigation
    const initialTimeout = setTimeout(() => {
      if (offers.length > 0 && !shownOffers.has(offers[0].id)) {
        const firstOffer = {
          ...offers[0],
          distance: (Math.random() * 0.5 + 0.3).toFixed(1)
        }
        setCurrentAlert(firstOffer as Offer)
        setShowAlert(true)
        setLastAlertTime(Date.now())
        setShownOffers(prev => new Set([...prev, offers[0].id]))
        
        if (!muted) {
          speakAlert(firstOffer as Offer)
        }
        
        alertTimeoutRef.current = setTimeout(() => {
          setShowAlert(false)
        }, 15000)
      }
    }, 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(initialTimeout)
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current)
      }
    }
  }, [isNavigating, offers, muted, lastAlertTime, shownOffers])

  const speakAlert = (offer: Offer) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const message = `Hey! There's a ${offer.business_name} nearby with ${offer.discount_percent} percent off. You'll earn ${offer.gems_reward} gems if you stop by!`
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 0.95
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleDismiss = () => {
    setShowAlert(false)
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
    }
  }

  const handleSelect = () => {
    if (currentAlert) {
      onOfferSelect(currentAlert)
      setShowAlert(false)
    }
  }

  if (!showAlert || !currentAlert) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 animate-slide-up">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 animate-pulse pointer-events-none" />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 px-4 py-2 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <Navigation className="text-white" size={12} />
            </div>
            <span className="text-emerald-400 text-xs font-medium">Orion found a deal nearby!</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMuted(!muted)}
              className="text-slate-400 hover:text-white p-1"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="text-white" size={24} />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base truncate">{currentAlert.business_name}</h3>
              <p className="text-slate-400 text-sm truncate">{currentAlert.description}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-emerald-400 text-sm font-medium">{currentAlert.discount_percent}% off</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-400 text-sm flex items-center gap-1">
                  <Gem size={12} /> +{currentAlert.gems_reward}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <MapPin size={12} /> {currentAlert.distance} mi
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <button
            onClick={handleSelect}
            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            View Offer
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
