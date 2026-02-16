import { useState, useRef, useEffect } from 'react'
import { Camera, X, Image, Upload, AlertTriangle, Shield, Check, MapPin, User, Loader2 } from 'lucide-react'

interface QuickPhotoReportProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (report: { type: string; photo_url: string; lat: number; lng: number }) => Promise<any>
  currentLocation: { lat: number; lng: number }
  isMoving: boolean  // Vehicle in motion
  currentSpeed: number  // mph
}

export default function QuickPhotoReport({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentLocation,
  isMoving,
  currentSpeed 
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

  const handleSubmit = async () => {
    if (!selectedImage) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        type: reportType,
        photo_url: selectedImage,
        lat: currentLocation.lat,
        lng: currentLocation.lng
      })
      
      // Reset and close
      setSelectedImage(null)
      onClose()
    } catch (e) {
      console.log('Error submitting report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const enablePassengerMode = () => {
    setIsPassengerMode(true)
    setShowSafetyWarning(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900">
        <button onClick={onClose} className="text-white" data-testid="photo-report-close">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold">Quick Report</h2>
        <div className="w-6" /> {/* Spacer */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Preview Area */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center">
          {selectedImage ? (
            <img 
              src={selectedImage} 
              alt="Report preview" 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center">
              <Camera className="text-slate-600 mx-auto mb-4" size={64} />
              <p className="text-slate-500">Take or select a photo</p>
            </div>
          )}

          {/* Passenger Mode Badge */}
          {isPassengerMode && (
            <div className="absolute top-4 left-4 bg-emerald-500/20 border border-emerald-500/50 rounded-full px-3 py-1 flex items-center gap-2">
              <User size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">Passenger Mode</span>
            </div>
          )}

          {/* Location Badge */}
          <div className="absolute bottom-4 left-4 bg-slate-800/80 rounded-full px-3 py-1.5 flex items-center gap-2">
            <MapPin size={14} className="text-blue-400" />
            <span className="text-white text-xs">
              {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </span>
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
        <div className="bg-slate-900 p-4 border-t border-slate-800">
          {selectedImage ? (
            /* Submit Button */
            <button
              onClick={handleSubmit}
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
            /* Camera/Gallery Buttons */
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

          {/* Speed indicator */}
          {isMoving && (
            <p className="text-center text-slate-500 text-xs mt-2">
              {currentSpeed < 10 
                ? "Low speed - Camera enabled" 
                : isPassengerMode 
                  ? "Passenger mode active"
                  : "Vehicle in motion - Use gallery or passenger mode"
              }
            </p>
          )}
        </div>
      </div>

      {/* 
        iOS IMPLEMENTATION NOTES:
        --------------------------
        1. Use CMMotionActivityManager to detect driving:
           let activityManager = CMMotionActivityManager()
           activityManager.startActivityUpdates(to: .main) { activity in
             if activity?.automotive == true { isMoving = true }
           }
        
        2. Use CLLocationManager for speed:
           locationManager.delegate = self
           func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
             let speed = locations.last?.speed ?? 0 // m/s
             currentSpeedMph = speed * 2.237
           }
        
        3. For Orion voice warning:
           let utterance = AVSpeechUtterance(string: "Using your phone while driving isn't safe")
           utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
           synthesizer.speak(utterance)
        
        4. Camera roll access with PHPhotoLibrary:
           PHPhotoLibrary.requestAuthorization { status in ... }
        
        5. Get photo location from EXIF:
           let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject
           let location = asset?.location // CLLocation with lat/lng
      */}
    </div>
  )
}
