import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, X, Volume2, AlertTriangle, Shield, Car, Construction, Cloud, MapPin, Check, Gift, Navigation, Gem, Star, SkipForward } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

interface PersonalizedOffer {
  id: number
  business_name: string
  business_type: string
  description: string
  discount_percent: number
  gems_reward: number
  lat: number
  lng: number
  distance_km: number
  personalization_reason: string
}

interface OrionVoiceProps {
  isOpen: boolean
  onClose: () => void
  onReportCreated: (report: { type: string; direction: string; lat: number; lng: number }) => void
  isNavigating: boolean
  currentLocation: { lat: number; lng: number }
  onNavigateToOffer?: (offer: PersonalizedOffer) => void
}

// Voice commands mapping
const VOICE_COMMANDS = [
  { phrases: ['cop', 'police', 'officer', 'speed trap'], type: 'police', icon: Shield },
  { phrases: ['hazard', 'debris', 'object', 'pothole'], type: 'hazard', icon: AlertTriangle },
  { phrases: ['accident', 'crash', 'collision', 'fender bender'], type: 'accident', icon: Car },
  { phrases: ['construction', 'road work', 'work zone'], type: 'construction', icon: Construction },
  { phrases: ['weather', 'rain', 'fog', 'ice', 'snow'], type: 'weather', icon: Cloud },
]

const DIRECTIONS = ['left', 'right', 'ahead', 'behind']

// Check if Web Speech API is available
const SpeechRecognition = typeof window !== 'undefined' 
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
  : null

export default function OrionVoice({ isOpen, onClose, onReportCreated, isNavigating, currentLocation }: OrionVoiceProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [detectedCommand, setDetectedCommand] = useState<{ type: string; direction: string } | null>(null)
  const [orionMessage, setOrionMessage] = useState("Hi! I'm Orion. Say something like 'cop on my left' or 'hazard ahead'")
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check speech support
    setSpeechSupported(!!SpeechRecognition)
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex
        const text = event.results[current][0].transcript.toLowerCase()
        setTranscript(text)
        
        // Try to detect command
        if (event.results[current].isFinal) {
          processCommand(text)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setOrionMessage("Microphone access denied. Use quick actions below instead.")
          setShowQuickActions(true)
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const processCommand = useCallback((text: string) => {
    // Find matching command type
    let foundType: string | null = null
    for (const cmd of VOICE_COMMANDS) {
      if (cmd.phrases.some(phrase => text.includes(phrase))) {
        foundType = cmd.type
        break
      }
    }

    // Find direction
    let foundDirection = 'ahead' // default
    for (const dir of DIRECTIONS) {
      if (text.includes(dir)) {
        foundDirection = dir
        break
      }
    }

    if (foundType) {
      setDetectedCommand({ type: foundType, direction: foundDirection })
      setOrionMessage(`Got it! ${foundType.charAt(0).toUpperCase() + foundType.slice(1)} ${foundDirection}. Posting report...`)
      
      // Auto-submit after brief delay
      setTimeout(() => {
        submitReport(foundType, foundDirection)
      }, 1500)
    } else {
      setOrionMessage("I didn't catch that. Try saying 'cop on my left' or 'hazard ahead'")
      setShowQuickActions(true)
    }
  }, [currentLocation])

  const submitReport = (type: string, direction: string) => {
    // Calculate offset based on direction (mock - in real app would use GPS heading)
    const offset = 0.001 // ~100 meters
    let lat = currentLocation.lat
    let lng = currentLocation.lng

    switch (direction) {
      case 'ahead': lat += offset; break
      case 'behind': lat -= offset; break
      case 'left': lng -= offset; break
      case 'right': lng += offset; break
    }

    onReportCreated({ type, direction, lat, lng })
    setOrionMessage(`Report posted! Other drivers will be alerted.`)
    
    // Reset after delay
    setTimeout(() => {
      setDetectedCommand(null)
      setTranscript('')
      setOrionMessage("Report sent! Say another command or close.")
    }, 2000)
  }

  const startListening = () => {
    if (!speechSupported) {
      setShowQuickActions(true)
      setOrionMessage("Voice not available. Use quick actions below.")
      return
    }

    setTranscript('')
    setDetectedCommand(null)
    setOrionMessage("Listening... Say something like 'cop on my left'")
    setIsListening(true)
    
    try {
      recognitionRef.current?.start()
    } catch (e) {
      console.log('Speech already started')
    }
  }

  const stopListening = () => {
    setIsListening(false)
    recognitionRef.current?.stop()
  }

  const handleQuickAction = (type: string, direction: string) => {
    setDetectedCommand({ type, direction })
    setOrionMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} ${direction}. Posting...`)
    setTimeout(() => submitReport(type, direction), 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Volume2 className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-white font-bold">Orion</h2>
            <p className="text-blue-300 text-xs">Voice Assistant</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white" data-testid="orion-close">
          <X size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Orion Message */}
        <div className="bg-slate-800/80 rounded-2xl px-6 py-4 mb-8 max-w-sm">
          <p className="text-white text-center">{orionMessage}</p>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 mb-4">
            <p className="text-blue-300 text-sm">"{transcript}"</p>
          </div>
        )}

        {/* Detected Command */}
        {detectedCommand && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <Check className="text-emerald-400" size={20} />
            <span className="text-emerald-300">
              {detectedCommand.type.charAt(0).toUpperCase() + detectedCommand.type.slice(1)} {detectedCommand.direction}
            </span>
          </div>
        )}

        {/* Mic Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-red-500 animate-pulse scale-110' 
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-105'
          }`}
          data-testid="orion-mic-btn"
        >
          {isListening ? (
            <MicOff className="text-white" size={36} />
          ) : (
            <Mic className="text-white" size={36} />
          )}
        </button>

        <p className="text-slate-400 text-sm mt-4">
          {isListening ? 'Tap to stop' : speechSupported ? 'Tap to speak' : 'Voice not available'}
        </p>

        {/* Speech Not Supported Notice */}
        {!speechSupported && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 mt-4">
            <p className="text-amber-300 text-xs text-center">
              Voice recognition requires Chrome/Safari. Use quick actions below.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {(showQuickActions || !speechSupported) && (
        <div className="bg-slate-900 border-t border-slate-800 p-4">
          <p className="text-slate-400 text-xs text-center mb-3">Quick Report</p>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            {VOICE_COMMANDS.slice(0, 4).map(cmd => (
              <button
                key={cmd.type}
                onClick={() => handleQuickAction(cmd.type, 'ahead')}
                className="bg-slate-800 hover:bg-slate-700 rounded-xl p-3 flex items-center gap-2"
                data-testid={`quick-${cmd.type}`}
              >
                <cmd.icon size={18} className="text-slate-400" />
                <span className="text-white text-sm capitalize">{cmd.type}</span>
              </button>
            ))}
          </div>

          {/* Direction Selector */}
          <div className="flex gap-2 justify-center">
            {DIRECTIONS.map(dir => (
              <button
                key={dir}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg capitalize"
                onClick={() => detectedCommand && handleQuickAction(detectedCommand.type, dir)}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions for iOS Implementation */}
      {/* 
        iOS IMPLEMENTATION NOTES:
        --------------------------
        1. Replace Web Speech API with Apple's Speech framework:
           import Speech
           let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        
        2. For Orion TTS, use AVSpeechSynthesizer:
           let utterance = AVSpeechUtterance(string: "Cop reported on your left")
           synthesizer.speak(utterance)
        
        3. For "Is it still there?" prompts to other drivers:
           - Store reports with expiry (12 hours)
           - When driver approaches report location:
             synthesizer.speak("Police was reported ahead. Is it still there?")
           - Listen for "yes/no" response
           - Update report verification status
        
        4. Hotword detection ("Hey Orion"):
           - Use Vosk or custom Core ML model for offline wake word
           - Or use Apple's built-in Siri shortcuts
      */}
    </div>
  )
}
