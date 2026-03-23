import { useRef, useState } from 'react'
import { api } from '@/services/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  userLocation: { lat: number; lng: number }
  onReportSubmitted: () => void
}

export default function PhotoReportCapture({ isOpen, onClose, userLocation, onReportSubmitted }: Props) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!photo) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', photo)
      form.append('lat', String(userLocation.lat))
      form.append('lng', String(userLocation.lng))
      form.append('description', description)
      await api.post('/api/photo-reports/upload', form)
      onReportSubmitted()
      onClose()
    } catch {
      alert('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2001,
          background: '#1C1C1E',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom,24px)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 2,
            margin: '12px auto 0',
          }}
        />
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 14 }}>Report a road issue</div>

          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                height: 200,
                border: '2px dashed rgba(255,255,255,0.2)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 40 }}>📷</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Tap to take photo</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhoto}
              />
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <img src={preview} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
              <button
                onClick={() => {
                  setPhoto(null)
                  setPreview(null)
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: 'rgba(0,0,0,0.7)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue (optional — AI will categorize)"
            style={{
              width: '100%',
              height: 72,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 12,
              padding: '10px 14px',
              color: 'white',
              fontSize: 14,
              resize: 'none',
              fontFamily: 'inherit',
              marginBottom: 14,
            }}
          />

          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 14,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
            }}
          >
            This report expires in 24 hours unless confirmed by other drivers.
          </div>

          <button
            onClick={handleSubmit}
            disabled={!photo || uploading}
            style={{
              width: '100%',
              height: 50,
              background: photo ? '#FF3B30' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 14,
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: photo ? 'pointer' : 'not-allowed',
            }}
          >
            {uploading ? 'Uploading...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </>
  )
}

