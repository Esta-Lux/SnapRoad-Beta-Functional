interface MapLayerPickerProps {
  isOpen: boolean
  onClose: () => void
  activeMapLayer: string
  onMapLayerChange: (layer: string) => void
  showTraffic: boolean
  onToggleTraffic: () => void
  showCameras: boolean
  onToggleCameras: () => void
  showIncidents: boolean
  onToggleIncidents: () => void
  showConstruction: boolean
  onToggleConstruction: () => void
  showFuelPrices: boolean
  onToggleFuelPrices: () => void
}

export default function MapLayerPicker({
  isOpen,
  onClose,
  activeMapLayer,
  onMapLayerChange,
  showTraffic,
  onToggleTraffic,
  showCameras,
  onToggleCameras,
  showIncidents,
  onToggleIncidents,
  showConstruction,
  onToggleConstruction,
  showFuelPrices,
  onToggleFuelPrices,
}: MapLayerPickerProps) {
  if (!isOpen) return null

  const mapTypes = [
    {
      id: 'standard',
      label: 'Default',
      preview: (
        <svg width="52" height="40" viewBox="0 0 52 40">
          <rect width="52" height="40" fill="#E8F0E8" rx="8" />
          <rect x="0" y="16" width="52" height="8" fill="#C8D8C8" />
          <rect x="20" y="0" width="8" height="40" fill="#C8D8C8" />
          <rect x="8" y="4" width="10" height="8" fill="#fff" rx="2" />
          <rect x="32" y="24" width="12" height="8" fill="#fff" rx="2" />
        </svg>
      ),
    },
    {
      id: 'satellite',
      label: 'Satellite',
      preview: (
        <svg width="52" height="40" viewBox="0 0 52 40">
          <rect width="52" height="40" fill="#2D4A2D" rx="8" />
          <rect x="0" y="16" width="52" height="6" fill="#1A2E1A" opacity="0.8" />
          <rect x="20" y="0" width="6" height="40" fill="#1A2E1A" opacity="0.8" />
          <circle cx="10" cy="10" r="6" fill="#3D6B3D" />
          <circle cx="40" cy="28" r="8" fill="#4A7A4A" />
          <rect x="8" y="20" width="8" height="6" fill="#5A5A3A" rx="1" />
        </svg>
      ),
    },
    {
      id: 'hybrid',
      label: 'Hybrid',
      preview: (
        <svg width="52" height="40" viewBox="0 0 52 40">
          <rect width="52" height="40" fill="#2D4A2D" rx="8" />
          <rect x="0" y="16" width="52" height="6" fill="#FFD700" opacity="0.7" />
          <rect x="20" y="0" width="6" height="40" fill="#FFD700" opacity="0.7" />
          <circle cx="10" cy="10" r="6" fill="#3D6B3D" />
          <text x="26" y="12" fill="white" fontSize="6" fontWeight="bold">Kroger</text>
          <text x="6" y="30" fill="white" fontSize="5">Main St</text>
        </svg>
      ),
    },
    {
      id: 'dark',
      label: 'Dark',
      preview: (
        <svg width="52" height="40" viewBox="0 0 52 40">
          <rect width="52" height="40" fill="#1C1C1E" rx="8" />
          <rect x="0" y="16" width="52" height="6" fill="#3A3A3C" />
          <rect x="20" y="0" width="6" height="40" fill="#3A3A3C" />
          <rect x="8" y="4" width="10" height="8" fill="#2C2C2E" rx="2" />
          <rect x="32" y="24" width="12" height="8" fill="#2C2C2E" rx="2" />
          <text x="9" y="11" fill="#666" fontSize="5">bldg</text>
        </svg>
      ),
    },
  ]

  const overlays = [
    {
      id: 'traffic',
      label: 'Traffic',
      icon: '🚦',
      description: 'Live traffic conditions',
      active: showTraffic,
      onToggle: onToggleTraffic,
      color: '#FF3B30',
    },
    {
      id: 'cameras',
      label: 'Cameras',
      icon: '📷',
      description: 'ODOT traffic cameras',
      active: showCameras,
      onToggle: onToggleCameras,
      color: '#1C1C1E',
    },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: '⚠️',
      description: 'Crashes & road hazards',
      active: showIncidents,
      onToggle: onToggleIncidents,
      color: '#FF9500',
    },
    {
      id: 'construction',
      label: 'Construction',
      icon: '🚧',
      description: 'Road work zones',
      active: showConstruction,
      onToggle: onToggleConstruction,
      color: '#FF9500',
    },
    {
      id: 'fuel-prices',
      label: 'Fuel prices',
      icon: '⛽',
      description: 'Cheapest gas nearby',
      active: showFuelPrices,
      onToggle: onToggleFuelPrices,
      color: '#30D158',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1500,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1501,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        maxHeight: '75vh',
        overflowY: 'auto',
      }}>
        {/* Handle bar */}
        <div style={{
          width: 36,
          height: 4,
          background: '#E0E0E0',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 8px',
        }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#1a1a1a',
          }}>
            Map Type
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: '#f5f5f7',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Map type selector */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '8px 20px 20px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {mapTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onMapLayerChange(type.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: activeMapLayer === type.id
                  ? '3px solid #007AFF'
                  : '3px solid transparent',
                boxShadow: activeMapLayer === type.id
                  ? '0 0 0 1px #007AFF'
                  : '0 2px 8px rgba(0,0,0,0.12)',
              }}>
                {type.preview}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: activeMapLayer === type.id
                  ? 700
                  : 400,
                color: activeMapLayer === type.id
                  ? '#007AFF'
                  : '#333',
              }}>
                {type.label}
              </div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: '#f0f0f0',
          marginLeft: 20,
          marginRight: 20,
        }} />

        {/* Overlays section */}
        <div style={{
          padding: '16px 20px 0',
        }}>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: 12,
          }}>
            Map Details
          </div>

          {overlays.map((overlay) => (
            <button
              key={overlay.id}
              onClick={overlay.onToggle}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid #f5f5f7',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: overlay.active
                  ? `${overlay.color}15`
                  : '#f5f5f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}>
                {overlay.icon}
              </div>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1a1a1a',
                }}>
                  {overlay.label}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#999',
                  marginTop: 1,
                }}>
                  {overlay.description}
                </div>
              </div>

              {/* Toggle */}
              <div style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: overlay.active ? '#007AFF' : '#E0E0E0',
                position: 'relative' as const,
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}>
                <div style={{
                  position: 'absolute' as const,
                  top: 3,
                  left: overlay.active ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: 'white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s ease',
                }} />
              </div>
            </button>
          ))}
        </div>

        {/* Bottom padding */}
        <div style={{ height: 20 }} />
      </div>
    </>
  )
}
