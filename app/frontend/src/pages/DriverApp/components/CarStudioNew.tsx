import { useState, useEffect } from 'react'
import { X, Check, Lock, Sparkles, Zap } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'garage' | 'paint' | 'upgrades'>('paint')
  const [selectedColor, setSelectedColor] = useState(currentCar.color)
  const [showConfirm, setShowConfirm] = useState(false)

  // Reset when opening - default to Paint tab
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentCar.color)
      setActiveTab('paint')
    }
  }, [isOpen, currentCar])

  if (!isOpen) return null
  
  // Color organization
  const colorsByType = {
    standard: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'standard'),
    metallic: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'metallic'),
    matte: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'matte'),
    premium: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'premium'),
  }

  const handleApplyChanges = () => {
    onChangeCar({
      category: currentCar.category,
      variant: currentCar.variant,
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

  const hasChanges = selectedColor !== currentCar.color

  const colorData = CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]
  const categoryData = CAR_CATEGORIES[currentCar.category as keyof typeof CAR_CATEGORIES]

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      {/* Coming Soon banner - dark theme */}
      <div className="relative z-20 flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/15 border-b border-amber-500/30">
        <Sparkles className="text-amber-400" size={16} />
        <span className="text-amber-300 font-semibold text-sm tracking-wide">Car Studio — Coming Soon</span>
        <span className="text-amber-500/70 text-xs">Full customization in a future update</span>
      </div>
      
      {/* Ambient Lighting Effects */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

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
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 border border-amber-500/30">
          <Zap size={14} className="text-amber-400" />
          <span className="text-white font-bold">{gems.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex gap-2 px-4 py-3">
        {[
          { id: 'garage', label: 'GARAGE', icon: '🏠', disabled: true },
          { id: 'paint', label: 'PAINT SHOP', icon: '🎨', disabled: false },
          { id: 'upgrades', label: 'UPGRADES', icon: '⚡', disabled: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
              tab.disabled 
                ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                : activeTab === tab.id 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 border border-white/10'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
            {tab.disabled && <Lock size={10} className="ml-1 opacity-50" />}
          </button>
        ))}
      </div>

      {/* Car Display Area - Fixed Side View (No Rotation) */}
      <div 
        className="relative z-10 mx-4 rounded-3xl overflow-hidden"
        style={{ height: '280px' }}
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
        
        {/* Color Glow Effect */}
        {colorData?.glow && (
          <div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 h-16 rounded-full blur-2xl opacity-50"
            style={{ backgroundColor: colorData.hex }}
          />
        )}

        {/* Platform */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56 h-6">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
        </div>

        {/* Car Display - Fixed Side View */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '20px' }}>
          <Car3D 
            category={currentCar.category as keyof typeof CAR_CATEGORIES}
            color={selectedColor as keyof typeof CAR_COLORS}
            size="xl"
            rotation={0}
            showShadow={true}
            showReflection={true}
            perspective="side"
          />
        </div>

        {/* Car Info Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <p className="text-white font-medium text-sm">
            {colorData?.name || 'Custom'} <span className="text-white/50">•</span> <span className="capitalize">{categoryData?.name || currentCar.category}</span>
          </p>
        </div>

        {/* BETA Badge */}
        <div className="absolute top-4 right-4 bg-amber-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-500/30">
          <p className="text-amber-400 text-xs font-bold">BETA</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 overflow-auto px-4 py-4">
        {/* Garage Tab - Coming Soon */}
        {activeTab === 'garage' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mb-4 border border-white/10">
              <span className="text-4xl">🚗</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Coming Soon</h3>
            <p className="text-white/40 text-sm max-w-xs">
              Choose your vehicle type in a future update. For now, customize your color!
            </p>
            <button 
              onClick={() => setActiveTab('paint')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm"
            >
              Go to Paint Shop →
            </button>
          </div>
        )}

        {/* Paint Shop Tab - ACTIVE */}
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

        {/* Upgrades Tab - Coming Soon */}
        {activeTab === 'upgrades' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center mb-4 border border-white/10">
              <span className="text-4xl">⚡</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Coming Soon</h3>
            <p className="text-white/40 text-sm max-w-xs">
              Rims, spoilers, and decals will be available in a future update.
            </p>
            <button 
              onClick={() => setActiveTab('paint')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm"
            >
              Go to Paint Shop →
            </button>
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
            Apply Color
          </button>
        </div>
      )}

      {/* Success Toast */}
      {showConfirm && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 animate-bounce">
          <Check size={20} />
          <span className="font-semibold">Color Applied!</span>
        </div>
      )}
    </div>
  )
}
