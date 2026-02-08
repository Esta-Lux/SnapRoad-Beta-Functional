import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCcw, Check, Lock, Sparkles, Volume2, VolumeX } from 'lucide-react'
import Car3D, { CAR_CATEGORIES, CAR_COLORS, ProfileCar } from './Car3D'

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

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(currentCar.category)
      setSelectedVariant(currentCar.variant)
      setSelectedColor(currentCar.color)
      setRotation(0)
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

  // Check if color is owned or standard
  const isColorAvailable = (colorKey: string) => {
    const color = CAR_COLORS[colorKey as keyof typeof CAR_COLORS]
    return !color.premium || ownedColors.includes(colorKey)
  }

  // Handle drag rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const diff = e.clientX - startX
      setRotation(prev => prev + diff * 0.5)
      setStartX(e.clientX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const diff = e.touches[0].clientX - startX
      setRotation(prev => prev + diff * 0.5)
      setStartX(e.touches[0].clientX)
    }
  }

  const rotateLeft = () => setRotation(r => r - 45)
  const rotateRight = () => setRotation(r => r + 45)
  const resetRotation = () => setRotation(0)

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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-black to-slate-900" />
      
      {/* Ambient lighting effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
          <X size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-400" size={18} />
          <span className="text-white font-bold text-lg">CAR STUDIO</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="bg-slate-800 rounded-full px-3 py-1 flex items-center gap-1">
            <span className="text-amber-400">💎</span>
            <span className="text-white font-bold">{gems.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex gap-1 px-4 mb-4">
        {[
          { id: 'garage', label: 'Garage', icon: '🚗' },
          { id: 'paint', label: 'Paint Shop', icon: '🎨' },
          { id: 'upgrades', label: 'Upgrades', icon: '⚡' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Car Display Area */}
      <div 
        className="relative z-10 flex-shrink-0 mx-4 rounded-3xl overflow-hidden"
        style={{ height: '280px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Showroom floor */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-800/30 to-slate-900/80" />
        
        {/* Spotlight from above */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-radial from-white/10 via-white/5 to-transparent rounded-full" />
        
        {/* Rotating platform */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-4">
          <div className="w-full h-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
        </div>

        {/* Car */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Car3D 
            category={selectedCategory as keyof typeof CAR_CATEGORIES}
            color={selectedColor as keyof typeof CAR_COLORS}
            size="xl"
            rotation={rotation}
            showShadow={true}
            showReflection={true}
            perspective="angled"
          />
        </div>

        {/* Drag hint */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-slate-500 text-xs flex items-center gap-2">
          <span>← Drag to rotate →</span>
        </div>

        {/* Rotation controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button 
            onClick={rotateLeft}
            className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center text-white hover:bg-slate-700"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={resetRotation}
            className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center text-white hover:bg-slate-700"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={rotateRight}
            className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur flex items-center justify-center text-white hover:bg-slate-700"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 overflow-auto px-4 py-4">
        {/* Garage Tab - Car Selection */}
        {activeTab === 'garage' && (
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>🚗</span> My Cars
            </h3>
            
            {/* Car Category Grid */}
            <div className="grid grid-cols-3 gap-2">
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
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedCategory === key
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500'
                      : 'bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <p className="text-white text-xs font-medium">{cat.name}</p>
                </button>
              ))}
            </div>

            {/* Variant Selection */}
            {currentCategoryData && (
              <div>
                <h4 className="text-slate-400 text-xs font-medium mb-2">STYLE</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentCategoryData.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all ${
                        selectedVariant === variant.id
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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

        {/* Paint Shop Tab - Color Selection */}
        {activeTab === 'paint' && (
          <div className="space-y-4">
            {/* Current Color */}
            <div className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">CURRENT COLOR</p>
                <p className="text-white font-medium">
                  {CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]?.name || 'Unknown'}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl border-2 border-slate-600"
                style={{ background: CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]?.gradient }}
              />
            </div>

            {/* Standard Colors */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">STANDARD</p>
              <div className="grid grid-cols-8 gap-2">
                {colorsByType.standard.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.gradient }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Metallic Colors */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1">
                METALLIC <span className="text-amber-300">✨</span>
              </p>
              <div className="grid grid-cols-8 gap-2">
                {colorsByType.metallic.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.gradient }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Matte Colors */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">MATTE</p>
              <div className="grid grid-cols-8 gap-2">
                {colorsByType.matte.map(([key, color]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedColor(key)}
                    className={`aspect-square rounded-xl transition-all ${
                      selectedColor === key 
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.gradient }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Premium Colors */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1">
                PREMIUM <span className="text-amber-400">💎</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
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
                      className={`relative aspect-square rounded-xl transition-all ${
                        selectedColor === key 
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-105' 
                          : isOwned ? 'hover:scale-105' : 'opacity-80'
                      }`}
                      style={{ 
                        background: color.gradient,
                        boxShadow: color.glow ? `0 0 20px ${color.hex}50` : undefined
                      }}
                    >
                      {!isOwned && (
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center">
                          <Lock size={16} className="text-white mb-1" />
                          <span className="text-[10px] text-amber-400 font-bold">
                            {color.price?.toLocaleString()} 💎
                          </span>
                        </div>
                      )}
                      {isOwned && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
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
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-sm">Coming Soon!</p>
              <p className="text-white font-medium mt-2">Rims, Spoilers & Decals</p>
              <p className="text-slate-500 text-xs mt-2">
                Unlock unique customizations by completing challenges
              </p>
            </div>
            
            {/* Preview of upcoming features */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '🛞', label: 'Rims', status: 'Coming Soon' },
                { icon: '🏁', label: 'Spoilers', status: 'Coming Soon' },
                { icon: '🎨', label: 'Decals', status: 'Coming Soon' },
              ].map(item => (
                <div 
                  key={item.label}
                  className="bg-slate-800/30 rounded-xl p-4 text-center opacity-50"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-white text-sm">{item.label}</p>
                  <p className="text-slate-500 text-[10px]">{item.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply Button */}
      {hasChanges && (
        <div className="relative z-10 p-4 border-t border-slate-800">
          <button
            onClick={handleApplyChanges}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Check size={20} />
            Apply Changes
          </button>
        </div>
      )}

      {/* Confirmation Toast */}
      {showConfirm && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 animate-bounce">
          <Check size={20} />
          <span className="font-medium">Changes Applied!</span>
        </div>
      )}
    </div>
  )
}
