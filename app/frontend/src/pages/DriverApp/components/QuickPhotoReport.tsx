import { useState, useRef, useEffect } from 'react'
import { Camera, X, Image, AlertTriangle, Shield, Check, MapPin, User, Loader2, Car, CloudRain, Construction } from 'lucide-react'

interface QuickPhotoReportProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (report: { type: string; photo_url: string; lat: number; lng: number }) => Promise<any>
  currentLocation: { lat: number; lng: number }
  isMoving: boolean
  currentSpeed: number
  /** When true, show only a compact bottom sheet (icons + submit) for quick report during nav. */
  compact?: boolean
  /** When true in compact mode, user will tap the map to place the incident instead of using currentLocation directly. */
  useMapPlacement?: boolean
  /** Optional callback fired from compact mode when the user confirms they want to place an incident on the map. */
  onRequestPlacement?: (type: string) => void
}

const REPORT_ICONS: { type: string; label: string; icon: typeof AlertTriangle }[] = [
  { type: 'hazard', label: 'Hazard', icon: AlertTriangle },
  { type: 'police', label: 'Police', icon: Shield },
  { type: 'accident', label: 'Accident', icon: Car },
  { type: 'construction', label: 'Construction', icon: Construction },
  { type: 'weather', label: 'Weather', icon: CloudRain },
]

export default function QuickPhotoReport({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentLocation,
  isMoving,
  currentSpeed,
  compact = false,
  useMapPlacement = false,
  onRequestPlacement,
}: QuickPhotoReportProps) {
  const [isPassengerMode, setIsPassengerMode] = useState(false)
  const [showSafetyWarning, setShowSafetyWarning] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportType, setReportType] = useState<string>('hazard')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Determine if photo taking is allowed
  const canTakePhoto = !isMoving || isPassengerMode || currentSpeed < 10

  useEffect(() => {
    // Show safety warning when trying to use camera while driving
    if (isOpen && isMoving && !isPassengerMode && currentSpeed >= 10) {
      setShowSafetyWarning(true)
    }
  }, [isOpen, isMoving, isPassengerMode, currentSpeed])

  const handleCameraClick = () => {
    if (!canTakePhoto) {
      setShowSafetyWarning(true)
      // In real app, Orion would say this
      console.log("Orion: Using your phone while driving isn't safe.")
      return
    }
    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => {
    // Gallery/camera roll is always allowed
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (photoUrl: string = '') => {
    const url = photoUrl || selectedImage || ''
    if (!url && !reportType) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        type: reportType,
        photo_url: url,
        lat: currentLocation.lat,
        lng: currentLocation.lng
      })
      setSelectedImage(null)
      onClose()
    } catch (e) {
      console.log('Error submitting report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIconOnlyReport = async () => {
    if (compact && useMapPlacement && onRequestPlacement) {
      onRequestPlacement(reportType)
      onClose()
      return
    }
    await handleSubmit('')
  }

  const enablePassengerMode = () => {
    setIsPassengerMode(true)
    setShowSafetyWarning(false)
  }

  if (!isOpen) return null

  if (compact) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-[1001]" onClick={onClose} aria-hidden />
        <div
          className="fixed left-4 right-4 bottom-[calc(80px+env(safe-area-inset-bottom,18px))] z-[1002] rounded-2xl border border-slate-600/50 bg-slate-800/95 backdrop-blur-xl shadow-xl overflow-hidden"
          style={{ maxHeight: '40vh' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-600/50">
            <span className="text-white font-semibold text-sm">Report incident</span>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="p-3">
            <p className="text-slate-400 text-xs mb-2">Tap type, then submit</p>
            <div className="flex gap-2 flex-wrap">
              {REPORT_ICONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`flex-1 min-w-[72px] flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2 transition-colors ${
                    reportType === type ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-700/80 border-slate-600 text-slate-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[11px] font-medium capitalize">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleIconOnlyReport}
              disabled={isSubmitting}
              className="w-full mt-3 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-medium text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Report {reportType}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={onClose} aria-hidden />
      <div
        className="fixed left-4 right-4 bottom-[calc(80px+env(safe-area-inset-bottom,18px))] z-[1001] rounded-2xl border border-slate-600/50 bg-slate-800/95 backdrop-blur-xl shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: '55vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-600/50 flex-shrink-0">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-300 hover:text-white p-2 -ml-2 rounded-lg" data-testid="photo-report-close" aria-label="Close">
            <X size={22} />
            <span className="text-sm font-medium">Close</span>
          </button>
          <h2 className="text-white font-bold text-sm">Report incident</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-300 hover:text-white" aria-label="Cancel">
            <X size={20} />
          </button>
        </div>

        {/* Safety Warning Modal */}
      {showSafetyWarning && (
        <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center p-6">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="text-amber-400" size={32} />
              </div>
            </div>
            
            <h3 className="text-white font-bold text-lg text-center mb-2">
              Keep Your Eyes on the Road
            </h3>
            
            <p className="text-slate-400 text-sm text-center mb-6">
              Using your phone while driving isn't safe. Ask a passenger to take the photo, or pull over safely.
            </p>

            {/* Orion speaking indicator */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-blue-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Orion: "Phone use while driving isn't safe."
              </p>
            </div>

            <div className="space-y-2">
              {/* Passenger Mode */}
              <button
                onClick={enablePassengerMode}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                data-testid="enable-passenger-mode"
              >
                <User size={18} />
                I'm a Passenger
              </button>

              {/* Use Gallery */}
              <button
                onClick={() => { setShowSafetyWarning(false); handleGalleryClick() }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Image size={18} />
                Choose from Gallery
              </button>

              {/* Cancel */}
              <button
                onClick={() => { setShowSafetyWarning(false); onClose() }}
                className="w-full text-slate-400 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Main Content - photo-only flow (no top incident buttons) */}
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className="relative bg-slate-900/80 flex items-center justify-center rounded-lg mx-3 mt-3"
            style={{ minHeight: 160, maxHeight: 220 }}
          >
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Report preview"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="text-center py-2">
                <Camera className="text-slate-600 mx-auto mb-1" size={36} />
                <p className="text-slate-500 text-xs">Take or select a photo</p>
              </div>
            )}
            {isPassengerMode && (
              <div className="absolute top-1 left-1 bg-emerald-500/20 border border-emerald-500/50 rounded-full px-2 py-0.5 flex items-center gap-1">
                <User size={12} className="text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-medium">Passenger</span>
              </div>
            )}
            <div className="absolute bottom-1 left-1 bg-slate-800/90 rounded-full px-2 py-1 flex items-center gap-1">
              <MapPin size={10} className="text-blue-400" />
              <span className="text-white text-[10px]">{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Report Type Selector (only when image selected) */}
        {selectedImage && (
          <div className="bg-slate-800 px-4 py-3">
            <p className="text-slate-400 text-xs mb-2">Report Type</p>
            <div className="flex gap-2 overflow-x-auto">
              {['hazard', 'accident', 'construction', 'police', 'weather'].map(type => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm capitalize transition-colors ${
                    reportType === type 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-slate-900 p-4 border-t border-slate-800 flex-shrink-0">
          {selectedImage ? (
            <button
              onClick={() => handleSubmit(selectedImage)}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              data-testid="submit-photo-report"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Post Report (+500 XP)
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCameraClick}
                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${
                  canTakePhoto 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-700 text-slate-400'
                }`}
                data-testid="take-photo-btn"
              >
                <Camera size={20} />
                Take Photo
              </button>
              
              <button
                onClick={handleGalleryClick}
                className="flex-1 bg-slate-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                data-testid="gallery-btn"
              >
                <Image size={20} />
                Gallery
              </button>
            </div>
          )}

          {isMoving && (
            <p className="text-center text-slate-500 text-xs mt-2">
              {currentSpeed < 10 ? 'Low speed - Camera enabled' : isPassengerMode ? 'Passenger mode active' : 'Vehicle in motion - Use gallery or passenger mode'}
            </p>
          )}
          <button onClick={onClose} className="w-full mt-3 py-2.5 text-slate-400 hover:text-white text-sm font-medium" data-testid="quick-report-cancel">
            Cancel
          </button>
        </div>
      </div>

      {/* 
        iOS IMPLEMENTATION NOTES:
        --------------------------
        1. Use CMMotionActivityManager to detect driving
        2. Use CLLocationManager for speed
        3. For Orion voice warning use AVSpeechUtterance
        4. Camera roll access with PHPhotoLibrary
        5. Get photo location from EXIF (asset?.location)
      */}
    </>
  )
}
