import { useState, useEffect, useRef } from 'react'

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
  redeemed?: boolean
}

interface OrionOfferAlertsProps {
  isNavigating: boolean
  userLocation: { lat: number; lng: number }
  offers: Offer[]
  onOfferSelect: (offer: Offer) => void
  isPremium: boolean
  isMuted?: boolean
  onMuteToggle?: () => void
}

export default function OrionOfferAlerts({ 
  isNavigating, 
  offers, 
  onOfferSelect,
  isMuted: isMutedProp,
  onMuteToggle: onMuteToggleProp,
}: OrionOfferAlertsProps) {
  const [currentAlert, setCurrentAlert] = useState<Offer | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [muted, setMuted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [shownOffers, setShownOffers] = useState<Set<number>>(new Set())
  const [lastAlertTime, setLastAlertTime] = useState(0)
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMuted = isMutedProp ?? muted
  const onMuteToggle = onMuteToggleProp ?? (() => setMuted((m) => !m))

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
        
        setCurrentAlert(offerWithDistance as unknown as Offer)
        setShowAlert(true)
        setLastAlertTime(now)
        setShownOffers(prev => new Set([...prev, selectedOffer.id]))
        
        // Speak the alert
        if (!muted) {
          speakAlert(offerWithDistance as unknown as Offer)
        }
        
        // Auto-dismiss after 8 seconds
        alertTimeoutRef.current = setTimeout(() => {
          setShowAlert(false)
        }, 8000)
      }
    }, 30000) // Check every 30 seconds

    // Initial check after 5 seconds of navigation
    const initialTimeout = setTimeout(() => {
      if (offers.length > 0 && !shownOffers.has(offers[0].id)) {
        const firstOffer = {
          ...offers[0],
          distance: (Math.random() * 0.5 + 0.3).toFixed(1)
        }
        setCurrentAlert(firstOffer as unknown as Offer)
        setShowAlert(true)
        setLastAlertTime(Date.now())
        setShownOffers(prev => new Set([...prev, offers[0].id]))
        
        if (!muted) {
          speakAlert(firstOffer as unknown as Offer)
        }
        
        alertTimeoutRef.current = setTimeout(() => {
          setShowAlert(false)
        }, 8000)
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

  useEffect(() => {
    setDismissed(false)
  }, [currentAlert?.id])

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

  const currentOffer = currentAlert
  if (!showAlert || !currentOffer || dismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(90px + env(safe-area-inset-bottom, 20px))',
        left: 16,
        right: 16,
        zIndex: 997,
        background: '#1C2A1C',
        borderRadius: 16,
        padding: '12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'slideUpOffer 0.3s ease',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#34C759',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        🎁
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#34C759', fontWeight: 600, marginBottom: 2 }}>
          Orion found a deal nearby!
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {(currentOffer as { title?: string; discount_text?: string }).title ??
            (currentOffer as { discount_text?: string }).discount_text ??
            currentOffer.business_name ??
            'Special offer'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
          +{(currentOffer as { gems_reward?: number }).gems_reward ?? 25} gems
          {currentOffer.distance != null ? ` • ${currentOffer.distance}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onOfferSelect(currentOffer)}
          style={{
            background: '#34C759',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          View →
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            padding: '5px 10px',
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>

      <button
        type="button"
        onClick={onMuteToggle}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 14,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
