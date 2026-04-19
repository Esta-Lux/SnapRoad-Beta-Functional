import { useState } from 'react'
import { Check, Sparkles, ChevronRight, X } from 'lucide-react'
import Car3D, { CAR_COLORS } from './Car3D'

interface CarOnboardingProps {
  onComplete: (selection: { category: string; variant: string; color: string }) => void
  onSkip?: () => void
}

// Car types available
const CAR_TYPES = [
  { id: 'sedan', name: 'Sedan', description: 'Compact & efficient' },
  { id: 'suv', name: 'SUV', description: 'Spacious & versatile' },
  { id: 'truck', name: 'Truck', description: 'Powerful & rugged' },
]

// Available colors (only blue is free at start)
const AVAILABLE_COLORS = [
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#3b82f6', free: true },
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1e293b', free: false },
  { id: 'pearl-white', name: 'Pearl White', hex: '#f8fafc', free: false },
  { id: 'racing-red', name: 'Racing Red', hex: '#ef4444', free: false },
  { id: 'forest-green', name: 'Forest Green', hex: '#22c55e', free: false },
  { id: 'sunset-gold', name: 'Sunset Gold', hex: '#fbbf24', free: false },
]

export default function CarOnboarding({ onComplete, onSkip }: CarOnboardingProps) {
  const [step, setStep] = useState<'type' | 'color'>('type')
  const [selectedType, setSelectedType] = useState<string>('sedan')
  const [selectedColor, setSelectedColor] = useState<string>('ocean-blue')

  const handleComplete = () => {
    onComplete({
      category: selectedType,
      variant: `${selectedType}-classic`,
      color: selectedColor,
    })
  }

  const handleNextStep = () => {
    if (step === 'type') {
      setStep('color')
    } else {
      handleComplete()
    }
  }

  const colorData = AVAILABLE_COLORS.find(c => c.id === selectedColor)

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={18} />
            <span className="text-amber-400 text-sm font-medium">
              {step === 'type' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
            </span>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="text-slate-400 text-sm hover:text-white flex items-center gap-1">
              <X size={16} />
              Skip
            </button>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-white mt-3">
          {step === 'type' ? 'Choose your ride' : 'Pick your color'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {step === 'type' 
            ? 'Select the type of vehicle you drive' 
            : 'Blue is free! Earn gems to unlock more'}
        </p>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          <div className={`flex-1 h-1.5 rounded-full ${step === 'type' || step === 'color' ? 'bg-amber-400' : 'bg-slate-700'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step === 'color' ? 'bg-amber-400' : 'bg-slate-700'}`} />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {step === 'type' ? (
          /* Car Type Selection */
          <div className="space-y-4">
            {CAR_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  selectedType === type.id
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* 3D Car Preview */}
                  <div className={`w-20 h-16 rounded-xl flex items-center justify-center overflow-hidden ${
                    selectedType === type.id ? 'bg-blue-500/30' : 'bg-slate-700/50'
                  }`}>
                    <Car3D 
                      category={type.id as any}
                      color="ocean-blue"
                      size="md"
                      rotation={0}
                      perspective="side"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-white font-bold text-lg">{type.name}</h3>
                    <p className="text-slate-400 text-sm">{type.description}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedType === type.id ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                  }`}>
                    {selectedType === type.id && <Check size={14} className="text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Color Selection */
          <div className="space-y-6">
            {/* 3D Car Preview */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-800/50 to-slate-900/80 p-6">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
              
              <div className="relative flex items-center justify-center" style={{ height: '160px' }}>
                <Car3D 
                  category={selectedType as any}
                  color={selectedColor as keyof typeof CAR_COLORS}
                  size="xl"
                  rotation={0}
                  showShadow={true}
                  showReflection={true}
                  perspective="side"
                />
              </div>
              
              <div className="text-center mt-2">
                <p className="text-white font-semibold text-lg">{colorData?.name || 'Custom'}</p>
                <p className="text-slate-400 text-sm">{selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</p>
              </div>
            </div>

            {/* Color Grid */}
            <div>
              <p className="text-slate-400 text-sm mb-3">Select a color</p>
              <div className="grid grid-cols-3 gap-3">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => color.free && setSelectedColor(color.id)}
                    disabled={!color.free}
                    className={`relative aspect-square rounded-2xl transition-all ${
                      selectedColor === color.id
                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105'
                        : color.free ? 'hover:scale-105' : 'opacity-40'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${color.hex}, ${color.hex}dd)` }}
                  >
                    {!color.free && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                        <span className="text-lg">🔒</span>
                      </div>
                    )}
                    {selectedColor === color.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <Check size={18} className="text-slate-900" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <p className="text-center text-slate-500 text-xs mt-4">
                💎 Drive safely to earn gems and unlock more colors!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Fixed */}
      <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        <button
          onClick={handleNextStep}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
        >
          {step === 'type' ? (
            <>
              Continue
              <ChevronRight size={20} />
            </>
          ) : (
            <>
              <Check size={20} />
              Let's Go!
            </>
          )}
        </button>
        
        {step === 'color' && (
          <button
            onClick={() => setStep('type')}
            className="w-full text-slate-400 text-sm mt-3 py-2 hover:text-white transition-colors"
          >
            ← Back to vehicle selection
          </button>
        )}
      </div>
    </div>
  )
}
