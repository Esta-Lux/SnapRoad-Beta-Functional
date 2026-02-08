import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCcw, Check, Lock, Sparkles, Volume2, VolumeX, Zap } from 'lucide-react'
import Car3D, { CAR_CATEGORIES, CAR_COLORS } from './Car3D'

interface CarStudioProps {
  isOpen: boolean
  onClose: () => void
  currentCar: { category: string; variant: string; color: string }
  gems: number
  ownedColors: string[]
  onPurchaseColor: (colorKey: string, price: number) => void
  onChangeCar: (car: { category: string; variant: string; color: string }) => void
}

export default function CarStudio({ 
  isOpen, 
  onClose, 
  currentCar, 
  gems,
  ownedColors,
  onPurchaseColor,
  onChangeCar
}: CarStudioProps) {
  const [activeTab, setActiveTab] = useState<'garage' | 'paint' | 'upgrades'>('garage')
  const [selectedCategory, setSelectedCategory] = useState(currentCar.category)
  const [selectedVariant, setSelectedVariant] = useState(currentCar.variant)
  const [selectedColor, setSelectedColor] = useState(currentCar.color)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const rotationRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-rotate effect
  useEffect(() => {
    if (autoRotate && !isDragging) {
      rotationRef.current = setInterval(() => {
        setRotation(prev => (prev + 0.5) % 360)
      }, 50)
    }
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current)
    }
  }, [autoRotate, isDragging])

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(currentCar.category)
      setSelectedVariant(currentCar.variant)
      setSelectedColor(currentCar.color)
      setRotation(0)
      setAutoRotate(true)
    }
  }, [isOpen, currentCar])

  if (!isOpen) return null

  const categories = Object.entries(CAR_CATEGORIES)
  const currentCategoryData = CAR_CATEGORIES[selectedCategory as keyof typeof CAR_CATEGORIES]
  
  // Color organization
  const colorsByType = {
    standard: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'standard'),
    metallic: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'metallic'),
    matte: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'matte'),
    premium: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'premium'),
  }

  // Handle drag rotation (horizontal - side to side)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setAutoRotate(false)
    setStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const diff = e.clientX - startX
      setRotation(prev => prev + diff * 0.8)
      setStartX(e.clientX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setAutoRotate(false)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const diff = e.touches[0].clientX - startX
      setRotation(prev => prev + diff * 0.8)
      setStartX(e.touches[0].clientX)
    }
  }

  const rotateLeft = () => {
    setAutoRotate(false)
    setRotation(r => r - 45)
  }
  const rotateRight = () => {
    setAutoRotate(false)
    setRotation(r => r + 45)
  }
  const resetRotation = () => {
    setRotation(0)
    setAutoRotate(true)
  }

  const handleApplyChanges = () => {
    onChangeCar({
      category: selectedCategory,
      variant: selectedVariant,
      color: selectedColor,
    })
    setShowConfirm(true)
    setTimeout(() => setShowConfirm(false), 2000)
  }

  const handleColorPurchase = (colorKey: string) => {
    const color = CAR_COLORS[colorKey as keyof typeof CAR_COLORS]
    if (color.premium && color.price && gems >= color.price) {
      onPurchaseColor(colorKey, color.price)
      setSelectedColor(colorKey)
    }
  }

  const hasChanges = selectedCategory !== currentCar.category || 
                     selectedVariant !== currentCar.variant || 
                     selectedColor !== currentCar.color

  const colorData = CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Premium Dark Background with Gradient */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[80px]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-2">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-wide">CAR STUDIO</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-white/10 transition-all"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 border border-amber-500/30">
            <Zap size={14} className="text-amber-400" />
            <span className="text-white font-bold">{gems.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Premium Tabs */}
      <div className="relative z-10 flex gap-2 px-4 py-3">
        {[
          { id: 'garage', label: 'GARAGE', icon: '🏠' },
          { id: 'paint', label: 'PAINT SHOP', icon: '🎨' },
          { id: 'upgrades', label: 'UPGRADES', icon: '⚡' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Showroom Area - Premium Design */}
      <div 
        className="relative z-10 mx-4 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ height: '300px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Showroom Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.01]" />
        
        {/* Grid Floor Effect */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.03) 0%, transparent 100%)',
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(to top, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'bottom',
          }}
        />
        
        {/* Main Spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80">
          <div className="w-full h-full bg-gradient-radial from-white/20 via-white/5 to-transparent rounded-full blur-xl" />
        </div>
        
        {/* Side Accent Lights */}
        <div className="absolute top-1/3 left-4 w-1 h-24 bg-gradient-to-b from-amber-400/50 via-amber-400/20 to-transparent rounded-full" />
        <div className="absolute top-1/3 right-4 w-1 h-24 bg-gradient-to-b from-amber-400/50 via-amber-400/20 to-transparent rounded-full" />
        
        {/* Color Glow Effect (based on selected color) */}
        {colorData?.glow && (
          <div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full blur-2xl opacity-50"
            style={{ backgroundColor: colorData.hex }}
          />
        )}

        {/* Rotating Platform */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-56 h-6">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
          <div className="absolute inset-x-4 inset-y-1 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full" />
        </div>

        {/* Car Display */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '20px' }}>
          <Car3D 
            category={selectedCategory as keyof typeof CAR_CATEGORIES}
            color={selectedColor as keyof typeof CAR_COLORS}
            size="xl"
            rotation={rotation}
            showShadow={true}
            showReflection={true}
            perspective="side"
          />
        </div>

        {/* Car Name Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <p className="text-white font-medium text-sm">
            {colorData?.name || 'Custom'} <span className="text-white/50">|</span> <span className="capitalize">{selectedCategory}</span>
          </p>
        </div>

        {/* Rotation Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button 
            onClick={rotateLeft}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:bg-black/60 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronLeft size={22} />
          </button>
          <button 
            onClick={resetRotation}
            className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
              autoRotate 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white'
            }`}
          >
            <RotateCcw size={18} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
          </button>
          <button 
            onClick={rotateRight}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:bg-black/60 hover:text-white hover:border-white/20 transition-all"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 overflow-auto px-4 py-4">
        {/* Garage Tab */}
        {activeTab === 'garage' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3">SELECT YOUR RIDE</h3>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key)
                      const category = CAR_CATEGORIES[key as keyof typeof CAR_CATEGORIES]
                      if (category.variants.length > 0) {
                        setSelectedVariant(category.variants[0].id)
                      }
                    }}
                    className={`relative p-3 rounded-2xl text-center transition-all duration-300 ${
                      selectedCategory === key
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {selectedCategory === key && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <p className="text-white text-[10px] font-semibold">{cat.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Variants */}
            {currentCategoryData && (
              <div>
                <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3">STYLE</h3>
                <div className="flex gap-2">
                  {currentCategoryData.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold transition-all ${
                        selectedVariant === variant.id
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paint Shop Tab */}
        {activeTab === 'paint' && (
          <div className="space-y-5">
            {/* Current Color Display */}
            <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-white/40 text-xs font-bold tracking-widest">CURRENT FINISH</p>
                <p className="text-white font-semibold text-lg mt-1">
                  {colorData?.name || 'Unknown'}
                </p>
                <p className="text-white/40 text-xs capitalize">{colorData?.type} finish</p>
              </div>
              <div 
                className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-lg"
                style={{ 
                  background: colorData?.body,
                  boxShadow: colorData?.glow ? `0 0 20px ${colorData.hex}50` : undefined
                }}
              />
            </div>

            {/* Standard Colors */}
            <div>
              <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3">STANDARD</h3>
              <div className="grid grid-cols-8 gap-2">
                {colorsByType.standard.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all duration-200 ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0f] scale-110 z-10' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.body }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Metallic Colors */}
            <div>
              <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3 flex items-center gap-2">
                METALLIC <span className="text-amber-400">✦</span>
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {colorsByType.metallic.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all duration-200 relative overflow-hidden ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0f] scale-110 z-10' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.body }}
                    title={color.name}
                  >
                    {/* Metallic shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                  </button>
                ))}
              </div>
            </div>

            {/* Matte Colors */}
            <div>
              <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3">MATTE</h3>
              <div className="grid grid-cols-4 gap-2">
                {colorsByType.matte.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all duration-200 ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0f] scale-110 z-10' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.body }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Premium Colors */}
            <div>
              <h3 className="text-white/40 text-xs font-bold tracking-widest mb-3 flex items-center gap-2">
                PREMIUM <Zap size={12} className="text-amber-400" />
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {colorsByType.premium.map(([key, color]) => {
                  const isOwned = ownedColors.includes(key)
                  const canAfford = gems >= (color.price || 0)
                  
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isOwned) {
                          setSelectedColor(key)
                        } else if (canAfford) {
                          handleColorPurchase(key)
                        }
                      }}
                      className={`relative aspect-[3/2] rounded-xl transition-all duration-200 overflow-hidden ${
                        selectedColor === key 
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0a0a0f] scale-105' 
                          : isOwned ? 'hover:scale-105' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ 
                        background: color.body,
                        boxShadow: color.glow ? `0 0 30px ${color.hex}40` : undefined
                      }}
                    >
                      {!isOwned && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                          <Lock size={16} className="text-white/80 mb-1" />
                          <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            <Zap size={10} /> {color.price?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {isOwned && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      {/* Color name label */}
                      <div className="absolute bottom-1 left-1 right-1">
                        <p className="text-white text-[9px] font-semibold text-center truncate bg-black/30 rounded-md px-1 py-0.5">
                          {color.name}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Upgrades Tab */}
        {activeTab === 'upgrades' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-6 text-center border border-white/10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Zap size={28} className="text-amber-400" />
              </div>
              <p className="text-white font-bold text-lg">Coming Soon</p>
              <p className="text-white/40 text-sm mt-2">Rims, Spoilers & Decals</p>
              <p className="text-white/30 text-xs mt-3 max-w-xs mx-auto">
                Unlock unique customizations by completing challenges and earning gems
              </p>
            </div>
            
            {/* Preview Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🛞', label: 'Rims', desc: '12 styles' },
                { icon: '🏁', label: 'Spoilers', desc: '8 styles' },
                { icon: '✨', label: 'Decals', desc: '20+ designs' },
              ].map(item => (
                <div 
                  key={item.label}
                  className="bg-white/5 rounded-xl p-4 text-center border border-white/5 opacity-50"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-white/30 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply Button */}
      {hasChanges && (
        <div className="relative z-10 p-4">
          <button
            onClick={handleApplyChanges}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all"
          >
            <Check size={22} />
            Apply Changes
          </button>
        </div>
      )}

      {/* Success Toast */}
      {showConfirm && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 animate-bounce">
          <Check size={20} />
          <span className="font-semibold">Changes Applied!</span>
        </div>
      )}
    </div>
  )
}
