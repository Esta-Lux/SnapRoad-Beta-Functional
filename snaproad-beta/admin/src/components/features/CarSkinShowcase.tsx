import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Sparkles, Lock, Check, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { GradientButton } from '../ui/GradientButton'
import { Badge } from '../ui/Badge'

interface SkinVariant {
  id: string
  name: string
  description: string
  owned: boolean
  equipped: boolean
  premium: boolean
  cost?: number
  wrapGradient: string
  wrapPattern?: 'stripes' | 'carbon' | 'geometric' | 'pinstripes' | 'graffiti'
  accentColor: string
  glowColor: string
  bodyFinish: 'matte' | 'glossy' | 'chrome' | 'satin'
  highlightIntensity: number
  underglowColor: string
  underglowIntensity: number
  reflectionLevel: number
}

const SKIN_VARIANTS: SkinVariant[] = [
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'Emerald to electric blue gradient with reflective streaks',
    owned: true,
    equipped: true,
    premium: false,
    wrapGradient: 'linear-gradient(135deg, #00DFA2 0%, #0084FF 100%)',
    accentColor: '#00DFA2',
    glowColor: '#00DFA2',
    bodyFinish: 'glossy',
    highlightIntensity: 0.7,
    underglowColor: '#00DFA2',
    underglowIntensity: 0.6,
    reflectionLevel: 0.7,
  },
  {
    id: 'midnight-blackout',
    name: 'Midnight Blackout',
    description: 'Stealth matte black with cyan electric accents',
    owned: true,
    equipped: false,
    premium: false,
    wrapGradient: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
    wrapPattern: 'geometric',
    accentColor: '#00FFFF',
    glowColor: '#00FFFF',
    bodyFinish: 'matte',
    highlightIntensity: 0.3,
    underglowColor: '#00FFFF',
    underglowIntensity: 0.5,
    reflectionLevel: 0.3,
  },
  {
    id: 'chrome-mirage',
    name: 'Chrome Mirage',
    description: 'Mirror chrome with purple-blue gradient tint',
    owned: false,
    equipped: false,
    premium: true,
    cost: 1500,
    wrapGradient: 'linear-gradient(135deg, #E8E8E8 0%, #FFFFFF 50%, #E8E8E8 100%)',
    accentColor: '#9D4EDD',
    glowColor: '#FFFFFF',
    bodyFinish: 'chrome',
    highlightIntensity: 0.95,
    underglowColor: '#9D4EDD',
    underglowIntensity: 0.7,
    reflectionLevel: 0.9,
  },
  {
    id: 'street-graffiti',
    name: 'Street Graffiti',
    description: 'Urban artist wrap with neon spray paint graphics',
    owned: false,
    equipped: false,
    premium: false,
    cost: 800,
    wrapGradient: 'linear-gradient(135deg, #FF006E 0%, #FFC24C 50%, #00DFA2 100%)',
    wrapPattern: 'graffiti',
    accentColor: '#FF006E',
    glowColor: '#FFC24C',
    bodyFinish: 'glossy',
    highlightIntensity: 0.6,
    underglowColor: '#FFC24C',
    underglowIntensity: 0.5,
    reflectionLevel: 0.6,
  },
  {
    id: 'carbon-stealth',
    name: 'Carbon Stealth',
    description: 'Carbon fiber texture with red racing stripes',
    owned: true,
    equipped: false,
    premium: false,
    wrapGradient: 'linear-gradient(135deg, #2C2C2C 0%, #1A1A1A 100%)',
    wrapPattern: 'carbon',
    accentColor: '#FF3366',
    glowColor: '#FF3366',
    bodyFinish: 'satin',
    highlightIntensity: 0.5,
    underglowColor: '#FF3366',
    underglowIntensity: 0.4,
    reflectionLevel: 0.6,
  },
]

interface CarSkinShowcaseProps {
  onBack: () => void
  onPreview?: () => void
}

export function CarSkinShowcase({ onBack, onPreview }: CarSkinShowcaseProps) {
  const [selectedSkin, setSelectedSkin] = useState<SkinVariant>(SKIN_VARIANTS[0])
  const [rotationAngle, setRotationAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const dragStartX = useRef(0)
  const dragCurrentAngle = useRef(0)

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = clientX
    dragCurrentAngle.current = rotationAngle
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    const diff = clientX - dragStartX.current
    const newAngle = Math.max(-30, Math.min(30, dragCurrentAngle.current + diff / 5))
    setRotationAngle(Math.round(newAngle))
  }

  const handleDragEnd = () => setIsDragging(false)

  useEffect(() => {
    if (!isDragging) return
    
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      handleDragMove(clientX)
    }
    const onEnd = () => handleDragEnd()

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove as EventListener)
    document.addEventListener('touchend', onEnd)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove as EventListener)
      document.removeEventListener('touchend', onEnd)
    }
  }, [isDragging])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Coming Soon Banner */}
      <div className="sticky top-0 z-50 px-4 py-2 flex justify-center pointer-events-none">
        <div className="bg-[#0084FF] text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse border-2 border-white/20">
          <Sparkles size={14} className="fill-white" />
          <span className="text-[12px] font-black uppercase tracking-widest">Coming Soon</span>
        </div>
      </div>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }} className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity active:scale-90"
              data-testid="car-studio-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 style={{ color: 'var(--text-primary)' }} className="font-semibold">Premium Car Studio</h2>
              <p style={{ color: 'var(--text-secondary)' }} className="text-[13px]">{selectedSkin.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLayers(!showLayers)}
            style={{ backgroundColor: 'var(--bg-primary)', color: showLayers ? '#00DFA2' : 'var(--text-primary)' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-80 transition-all active:scale-90"
            data-testid="toggle-layers-btn"
          >
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Car Render Area */}
        <div className="relative" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {/* Background Glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0" style={{
              background: `radial-gradient(ellipse at center bottom, ${selectedSkin.underglowColor}20 0%, transparent 70%)`
            }} />
          </div>

          {/* Rotation Controls */}
          <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setRotationAngle(Math.max(-30, rotationAngle - 10))}
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity backdrop-blur-md"
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }} className="px-4 py-2 rounded-full backdrop-blur-md">
              <span className="text-[13px]">Drag to rotate • {rotationAngle}°</span>
            </div>
            <button
              onClick={() => setRotationAngle(Math.min(30, rotationAngle + 10))}
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity backdrop-blur-md"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Car Visualization */}
          <div
            className="relative py-16 px-8 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <motion.div
              animate={{ rotateY: rotationAngle }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
              className="relative w-full max-w-md mx-auto aspect-[16/9]"
            >
              {/* Car Body Placeholder */}
              <div
                className="absolute inset-0 rounded-3xl flex items-center justify-center"
                style={{ background: selectedSkin.wrapGradient }}
              >
                <div className="text-center text-white/80">
                  <div className="w-32 h-20 mx-auto mb-4 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-4xl">🚗</span>
                  </div>
                  <p className="text-sm font-medium">3D Model Preview</p>
                </div>
              </div>

              {/* Highlight Overlay */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: selectedSkin.bodyFinish === 'chrome'
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 50%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  opacity: selectedSkin.highlightIntensity,
                }}
              />
            </motion.div>

            {/* Underglow */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full blur-2xl"
              style={{ backgroundColor: selectedSkin.underglowColor, opacity: selectedSkin.underglowIntensity }}
            />
          </div>

          {/* Angle Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[-30, -10, 0, 10, 30].map((angle) => (
              <div
                key={angle}
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: Math.abs(rotationAngle - angle) < 5 ? selectedSkin.accentColor : 'var(--bg-border)' }}
              />
            ))}
          </div>
        </div>

        {/* Layer Inspector */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <LayerInspector skin={selectedSkin} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skin Info Card */}
        <div className="px-4 mt-4">
          <div style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }} className="rounded-2xl p-4 border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold">{selectedSkin.name}</h3>
                  {selectedSkin.premium && <Badge variant="premium">Premium</Badge>}
                  {selectedSkin.equipped && <Badge variant="success"><Check size={12} /> Equipped</Badge>}
                </div>
                <p style={{ color: 'var(--text-secondary)' }} className="text-[13px]">{selectedSkin.description}</p>
              </div>
            </div>

            {/* Skin Properties */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Body Finish</p>
                <p style={{ color: 'var(--text-primary)' }} className="text-[13px] capitalize">{selectedSkin.bodyFinish}</p>
              </div>
              <div className="space-y-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Under-glow</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: selectedSkin.underglowColor }} />
                  <p style={{ color: 'var(--text-primary)' }} className="text-[13px]">{selectedSkin.underglowColor}</p>
                </div>
              </div>
              {selectedSkin.wrapPattern && (
                <div className="space-y-1">
                  <p style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Pattern Style</p>
                  <p style={{ color: 'var(--text-primary)' }} className="text-[13px] capitalize">{selectedSkin.wrapPattern}</p>
                </div>
              )}
              <div className="space-y-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-[11px]">Accent Color</p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: selectedSkin.accentColor }} />
                  <p style={{ color: 'var(--text-primary)' }} className="text-[13px]">{selectedSkin.accentColor}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {selectedSkin.owned ? (
                <>
                  {!selectedSkin.equipped && (
                    <GradientButton variant="primary" size="md" className="flex-1" data-testid="equip-skin-btn">
                      Equip Skin
                    </GradientButton>
                  )}
                  <GradientButton
                    variant="tertiary"
                    size="md"
                    className={selectedSkin.equipped ? 'flex-1' : ''}
                    onClick={onPreview}
                    data-testid="preview-map-btn"
                  >
                    Preview in Map
                  </GradientButton>
                </>
              ) : (
                <>
                  <GradientButton variant="primary" size="md" className="flex-1" data-testid="buy-skin-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 3h12l4 6-10 13L2 9Z" />
                      <path d="M11 3 8 9l4 13 4-13-3-6" />
                      <path d="M2 9h20" />
                    </svg>
                    {selectedSkin.cost} Gems
                  </GradientButton>
                  <button
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    className="px-4 h-10 rounded-xl hover:opacity-80 transition-opacity"
                  >
                    <Lock size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Skin Selector */}
        <div className="px-4 mt-4">
          <h4 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-3">Available Skins</h4>
          <div className="grid grid-cols-3 gap-2">
            {SKIN_VARIANTS.map((skin) => (
              <button
                key={skin.id}
                onClick={() => setSelectedSkin(skin)}
                className={`relative p-3 rounded-xl transition-all ${selectedSkin.id === skin.id ? 'ring-2 ring-[#00DFA2]' : ''}`}
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--bg-border)' }}
                data-testid={`skin-${skin.id}`}
              >
                <div className="w-full aspect-square rounded-lg mb-2" style={{ background: skin.wrapGradient }} />
                <p style={{ color: 'var(--text-primary)' }} className="text-[11px] font-medium truncate">{skin.name}</p>
                {!skin.owned && (
                  <div className="absolute top-2 right-2">
                    <Lock size={12} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}
                {skin.equipped && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-[#00DFA2] rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LayerInspector({ skin }: { skin: SkinVariant }) {
  const layers = [
    { name: 'Car_Body_Base', locked: true, opacity: 1 },
    { name: 'Skin_Texture_Layer', locked: false, opacity: 1, color: skin.wrapGradient },
    { name: 'Pattern_Overlay', locked: false, opacity: skin.wrapPattern ? 0.4 : 0 },
    { name: 'Highlight_Overlay', locked: true, opacity: skin.highlightIntensity, color: skin.accentColor },
    { name: 'Underglow_Layer', locked: false, opacity: skin.underglowIntensity, color: skin.underglowColor },
  ]

  return (
    <div className="px-4 py-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Layers size={16} className="text-[#00DFA2]" />
        <h4 style={{ color: 'var(--text-primary)' }} className="text-[13px] font-medium">Layer Structure</h4>
      </div>
      <div className="space-y-1">
        {layers.filter(l => l.opacity > 0).map((layer, index) => (
          <div
            key={index}
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--bg-border)' }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          >
            <div className="flex items-center gap-2 flex-1">
              {layer.locked ? (
                <Lock size={12} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <div className="w-3 h-3 rounded-full bg-[#00DFA2]" />
              )}
              <span style={{ color: 'var(--text-primary)' }} className="text-[12px]">{layer.name}</span>
            </div>
            {layer.color && (
              <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ background: layer.color }} />
            )}
            <span style={{ color: 'var(--text-secondary)' }} className="text-[11px]">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
