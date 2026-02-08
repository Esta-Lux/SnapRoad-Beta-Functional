import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import Car3D, { CAR_COLORS } from './Car3D'

interface CarOnboardingProps {
  onComplete: (selection: { category: string; variant: string; color: string }) => void
  onSkip?: () => void
}

export default function CarOnboarding({ onComplete, onSkip }: CarOnboardingProps) {
  const [selectedColor, setSelectedColor] = useState<string>('midnight-black')

  // Default car type for MVP
  const defaultCategory = 'sedan'
  const defaultVariant = 'sedan-classic'
  
  // Filter colors by type for organized display
  const colorsByType = {
    standard: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'standard'),
    metallic: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'metallic'),
    matte: Object.entries(CAR_COLORS).filter(([_, c]) => c.type === 'matte'),
  }

  const handleComplete = () => {
    onComplete({
      category: defaultCategory,
      variant: defaultVariant,
      color: selectedColor,
    })
  }

  const colorData = CAR_COLORS[selectedColor as keyof typeof CAR_COLORS]

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            <span className="text-amber-400 text-sm font-medium">WELCOME TO SNAPROAD</span>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="text-slate-400 text-sm hover:text-white">
              Skip
            </button>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-white mt-4">
          Pick your car color
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Personalize your navigation experience
        </p>
      </div>

      {/* Car Preview */}
      <div className="relative mx-4 rounded-3xl overflow-hidden" style={{ height: '220px' }}>
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-900/80" />
        
        {/* Spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
        
        {/* Platform */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-3 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
        
        {/* Car Display - Fixed Side View */}
        <div className="absolute inset-0 flex items-center justify-center pb-4">
          <Car3D 
            category={defaultCategory as any}
            color={selectedColor as keyof typeof CAR_COLORS}
            size="lg"
            rotation={0}
            showShadow={true}
            showReflection={true}
            perspective="side"
          />
        </div>
        
        {/* Color Name */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
          <p className="text-white font-medium text-sm">{colorData?.name || 'Custom'}</p>
        </div>
      </div>

      {/* Color Selection */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {/* Standard Colors */}
        <div className="mb-6">
          <p className="text-slate-400 text-xs font-medium mb-3">STANDARD COLORS</p>
          <div className="grid grid-cols-8 gap-2">
            {colorsByType.standard.map(([key, color]) => (
              <button
                key={key}
                onClick={() => setSelectedColor(key)}
                className={`aspect-square rounded-xl transition-all ${
                  selectedColor === key 
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' 
                    : 'hover:scale-105'
                }`}
                style={{ background: color.body }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Metallic Colors */}
        <div className="mb-6">
          <p className="text-slate-400 text-xs font-medium mb-3 flex items-center gap-1">
            METALLIC <span className="text-amber-300">✨</span>
          </p>
          <div className="grid grid-cols-6 gap-2">
            {colorsByType.metallic.map(([key, color]) => (
              <button
                key={key}
                onClick={() => setSelectedColor(key)}
                className={`aspect-square rounded-xl transition-all relative overflow-hidden ${
                  selectedColor === key 
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' 
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
          <p className="text-slate-400 text-xs font-medium mb-3">MATTE</p>
          <div className="grid grid-cols-4 gap-2">
            {colorsByType.matte.map(([key, color]) => (
              <button
                key={key}
                onClick={() => setSelectedColor(key)}
                className={`aspect-square rounded-xl transition-all ${
                  selectedColor === key 
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110' 
                    : 'hover:scale-105'
                }`}
                style={{ background: color.body }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleComplete}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all"
        >
          <Check size={20} />
          Let's Go!
        </button>
      </div>
    </div>
  )
}
