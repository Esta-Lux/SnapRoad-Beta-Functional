import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react'
import Car3D, { CAR_CATEGORIES, CAR_COLORS } from './Car3D'

interface CarOnboardingProps {
  onComplete: (selection: { category: string; variant: string; color: string }) => void
  onSkip?: () => void
}

export default function CarOnboarding({ onComplete, onSkip }: CarOnboardingProps) {
  const [step, setStep] = useState<'category' | 'variant' | 'color'>('category')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('midnight-black')
  const [rotation, setRotation] = useState(0)

  const categories = Object.entries(CAR_CATEGORIES)
  const currentCategory = selectedCategory ? CAR_CATEGORIES[selectedCategory as keyof typeof CAR_CATEGORIES] : null
  
  // Filter colors by type for organized display
  const colorsByType = {
    standard: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'standard'),
    metallic: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'metallic'),
    matte: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'matte'),
    premium: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'premium'),
  }

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat)
    // Auto-select first variant
    const category = CAR_CATEGORIES[cat as keyof typeof CAR_CATEGORIES]
    if (category.variants.length > 0) {
      setSelectedVariant(category.variants[0].id)
    }
    setStep('variant')
  }

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariant(variantId)
    setStep('color')
  }

  const handleColorSelect = (colorKey: string) => {
    const colorData = CAR_COLORS[colorKey as keyof typeof CAR_COLORS]
    if (colorData.premium) {
      // Premium colors would require unlock - for now just select
      setSelectedColor(colorKey)
    } else {
      setSelectedColor(colorKey)
    }
  }

  const handleComplete = () => {
    onComplete({
      category: selectedCategory,
      variant: selectedVariant,
      color: selectedColor,
    })
  }

  const handleBack = () => {
    if (step === 'color') setStep('variant')
    else if (step === 'variant') setStep('category')
  }

  const rotateLeft = () => setRotation(r => r - 45)
  const rotateRight = () => setRotation(r => r + 45)

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            <span className="text-amber-400 text-sm font-medium">CHOOSE YOUR RIDE</span>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="text-slate-400 text-sm hover:text-white">
              Skip for now
            </button>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4">
          {['Category', 'Style', 'Color'].map((label, i) => {
            const stepIndex = ['category', 'variant', 'color'].indexOf(step)
            const isActive = i === stepIndex
            const isComplete = i < stepIndex
            return (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${isActive ? 'bg-amber-400' : isComplete ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                <p className={`text-xs mt-1 ${isActive ? 'text-amber-400' : isComplete ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              What do you drive?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => handleCategorySelect(key)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectedCategory === key 
                      ? 'border-amber-400 bg-amber-400/10' 
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-4xl mb-2">{cat.icon}</div>
                  <p className="text-white font-semibold">{cat.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Variant Selection */}
        {step === 'variant' && currentCategory && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button onClick={handleBack} className="p-2 text-slate-400 hover:text-white">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-white">
                Choose your {currentCategory.name} style
              </h2>
            </div>

            {/* Car Preview */}
            <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 mb-6">
              {/* Spotlight effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
              
              {/* Car Display */}
              <div className="flex justify-center items-center py-8">
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
              
              {/* Rotation Controls */}
              <div className="flex justify-center gap-4">
                <button 
                  onClick={rotateLeft}
                  className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={rotateRight}
                  className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            {/* Variant Options */}
            <div className="space-y-2">
              {currentCategory.variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant.id)}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                    selectedVariant === variant.id
                      ? 'bg-amber-400/20 border-2 border-amber-400'
                      : 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-white font-medium">{variant.name}</span>
                  {selectedVariant === variant.id && (
                    <Check className="text-amber-400" size={20} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Color Selection */}
        {step === 'color' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button onClick={handleBack} className="p-2 text-slate-400 hover:text-white">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-white">
                Pick your color
              </h2>
            </div>

            {/* Car Preview with selected color */}
            <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 mb-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
              
              <div className="flex justify-center items-center py-8">
                <Car3D 
                  category={selectedCategory as keyof typeof CAR_CATEGORIES}
                  color={selectedColor as keyof typeof CAR_COLORS}
                  size="xl"
                  rotation={rotation}
                  showShadow={true}
                  showReflection={true}
                  perspective="angled"
                  animated={true}
                />
              </div>
              
              {/* Color Name */}
              <p className="text-center text-white font-medium">
                {CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]?.name || 'Midnight Black'}
              </p>
            </div>

            {/* Color Palettes */}
            <div className="space-y-4">
              {/* Standard Colors */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-2">STANDARD</p>
                <div className="flex flex-wrap gap-2">
                  {colorsByType.standard.map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => handleColorSelect(key)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        selectedColor === key ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' : ''
                      }`}
                      style={{ background: color.gradient }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Metallic Colors */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-2">METALLIC ✨</p>
                <div className="flex flex-wrap gap-2">
                  {colorsByType.metallic.map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => handleColorSelect(key)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        selectedColor === key ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' : ''
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
                <div className="flex flex-wrap gap-2">
                  {colorsByType.matte.map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => handleColorSelect(key)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        selectedColor === key ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' : ''
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
                <div className="flex flex-wrap gap-2">
                  {colorsByType.premium.map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => handleColorSelect(key)}
                      className={`w-10 h-10 rounded-full transition-all relative ${
                        selectedColor === key ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' : ''
                      }`}
                      style={{ 
                        background: color.gradient,
                        boxShadow: color.glow ? `0 0 12px ${color.hex}` : undefined
                      }}
                      title={`${color.name} (${color.price} gems)`}
                    >
                      {/* Lock icon for unpurchased premium */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px]">
                        💎
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Premium colors can be unlocked with gems
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        {step === 'color' && (
          <button
            onClick={handleComplete}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Sparkles size={20} />
            Confirm My Ride
          </button>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
