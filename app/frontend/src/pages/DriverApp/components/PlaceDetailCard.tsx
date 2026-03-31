import { useState } from 'react'

interface PlaceDetails {
  name: string
  address?: string
  lat: number
  lng: number
  rating?: number
  totalRatings?: number
  isOpen?: boolean
  phone?: string
  website?: string
  hours?: string[]
  photos?: string[]
  types?: string[]
  priceLevel?: number
}

interface Props {
  place: PlaceDetails
  onClose: () => void
  onNavigate: (place: PlaceDetails) => void
  snaproadOffer?: unknown
  onRedeemOffer?: (offer: unknown) => void
}

const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$']

const TYPE_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  food: '🍽️',
  cafe: '☕',
  bar: '🍺',
  gas_station: '⛽',
  grocery_or_supermarket: '🛒',
  shopping_mall: '🛍️',
  gym: '💪',
  hospital: '🏥',
  pharmacy: '💊',
  school: '🏫',
  park: '🌳',
  bank: '🏦',
  hotel: '🏨',
  default: '📍',
}

function getTypeIcon(types: string[] = []) {
  for (const type of types) {
    if (TYPE_ICONS[type]) return TYPE_ICONS[type]
  }
  return TYPE_ICONS.default
}

export default function PlaceDetailCard({
  place,
  onClose,
  onNavigate,
  snaproadOffer,
  onRedeemOffer,
}: Props) {
  const [showHours, setShowHours] = useState(false)
  const [imgError, setImgError] = useState(false)

  const icon = getTypeIcon(place.types)
  const offer = snaproadOffer as { title?: string; discount_text?: string; gems_reward?: number } | undefined

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 1400,
          backdropFilter: 'blur(2px)',
        }}
      />

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1401,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>

        <div style={{
          width: 36, height: 4,
          background: '#E0E0E0',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {place.photos?.[0] && !imgError ? (
          <div style={{
            margin: '12px 16px 0',
            borderRadius: 16,
            overflow: 'hidden',
            height: 160,
          }}>
            <img
              src={place.photos[0]}
              alt={place.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div style={{
            margin: '12px 16px 0',
            borderRadius: 16,
            height: 80,
            background: 'linear-gradient(135deg, #f5f5f7, #e8e8ea)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
          }}>
            {icon}
          </div>
        )}

        <div style={{ padding: '14px 16px 0' }}>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#1a1a1a',
                lineHeight: 1.2,
              }}>
                {place.name}
              </div>
              <div style={{
                fontSize: 13,
                color: '#666',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>
                  {place.types?.[0]?.replace(/_/g, ' ') ?? 'Place'}
                </span>
                {place.priceLevel != null && place.priceLevel > 0 && (
                  <>
                    <span style={{ color: '#ddd' }}>•</span>
                    <span style={{ color: '#34C759' }}>
                      {PRICE_LABELS[place.priceLevel]}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 16,
                background: '#f5f5f7',
                border: 'none',
                fontSize: 14,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
          }}>
            {place.rating != null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#FFF9E6',
                borderRadius: 8,
                padding: '4px 8px',
              }}>
                <span style={{ color: '#FF9500', fontSize: 13 }}>★</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1a1a1a',
                }}>
                  {place.rating.toFixed(1)}
                </span>
                {place.totalRatings != null && (
                  <span style={{ fontSize: 11, color: '#999' }}>
                    ({place.totalRatings.toLocaleString()})
                  </span>
                )}
              </div>
            )}

            {place.isOpen !== undefined && (
              <div style={{
                background: place.isOpen ? '#34C75915' : '#FF3B3015',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 700,
                color: place.isOpen ? '#34C759' : '#FF3B30',
              }}>
                {place.isOpen ? '● Open now' : '● Closed'}
              </div>
            )}
          </div>

          {place.address && (
            <div style={{
              marginTop: 10,
              fontSize: 13,
              color: '#666',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>📍</span>
              <span>{place.address}</span>
            </div>
          )}

          {place.hours && place.hours.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowHours((v) => !v)}
                style={{
                  fontSize: 13,
                  color: '#007AFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                🕐 Hours
                <span style={{
                  transform: showHours ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                  fontSize: 10,
                }}>
                  ▼
                </span>
              </button>
              {showHours && (
                <div style={{
                  marginTop: 6,
                  background: '#f5f5f7',
                  borderRadius: 10,
                  padding: '8px 12px',
                }}>
                  {place.hours.map((h, i) => (
                    <div key={i} style={{
                      fontSize: 12,
                      color: '#444',
                      lineHeight: 1.8,
                    }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
          }}>
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                style={{
                  flex: 1,
                  height: 40,
                  background: '#f5f5f7',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#007AFF',
                  textDecoration: 'none',
                }}
              >
                📞 Call
              </a>
            )}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  height: 40,
                  background: '#f5f5f7',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#007AFF',
                  textDecoration: 'none',
                }}
              >
                🌐 Website
              </a>
            )}
          </div>

          {offer && (
            <div style={{
              marginTop: 12,
              background: 'linear-gradient(135deg, #34C759, #2DA84A)',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>🎁</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'white',
                }}>
                  SnapRoad Offer Available!
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: 2,
                }}>
                  {offer.title ?? offer.discount_text}
                  {' • '}+{offer.gems_reward ?? 25} gems
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRedeemOffer?.(snaproadOffer)}
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Redeem
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate(place)}
            style={{
              width: '100%',
              height: 52,
              background: 'linear-gradient(135deg, #007AFF, #0055CC)',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 14,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
            }}
          >
            ➤ Navigate Here
          </button>
        </div>
      </div>
    </>
  )
}
