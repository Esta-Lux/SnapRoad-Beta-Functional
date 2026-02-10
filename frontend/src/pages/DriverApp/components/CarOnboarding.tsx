import { useState } from 'react'
import { Check, Sparkles, Car, Truck } from 'lucide-react'
import Car3D, { CAR_COLORS } from './Car3D'

interface CarOnboardingProps {
  onComplete: (selection: { category: string; variant: string; color: string }) => void
  onSkip?: () => void
}

// Car types available
const CAR_TYPES = [
  { id: 'sedan', name: 'Sedan', icon: Car, description: 'Compact & efficient' },
  { id: 'suv', name: 'SUV', icon: Car, description: 'Spacious & versatile' },
  { id: 'truck', name: 'Truck', icon: Truck, description: 'Powerful & rugged' },
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
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            <span className="text-amber-400 text-sm font-medium">
              {step === 'type' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
            </span>
          </div>
          {onSkip && (
            <button onClick={onSkip} className="text-slate-400 text-sm hover:text-white">
              Skip
            </button>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-white mt-4">
          {step === 'type' ? 'Choose your vehicle' : 'Pick your color'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {step === 'type' 
            ? 'Select the type of car you drive' 
            : 'Blue is free! Earn gems to unlock more colors'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-4">
        <div className="flex gap-2">
          <div className={`flex-1 h-1 rounded-full ${step === 'type' || step === 'color' ? 'bg-amber-400' : 'bg-slate-700'}`} />
          <div className={`flex-1 h-1 rounded-full ${step === 'color' ? 'bg-amber-400' : 'bg-slate-700'}`} />
        </div>
      </div>

      {step === 'type' ? (
        /* Car Type Selection */
        <div className="flex-1 px-6 py-4">
          <div className="space-y-3">
            {CAR_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  selectedType === type.id
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  selectedType === type.id ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  <type.icon className="text-white" size={32} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-bold text-lg">{type.name}</h3>
                  <p className="text-slate-400 text-sm">{type.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedType === type.id ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                }`}>
                  {selectedType === type.id && <Check size={14} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Color Selection */
        <>
          {/* Car Preview */}
          <div className="relative mx-4 rounded-3xl overflow-hidden" style={{ height: '180px' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-900/80" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-40 h-3 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
            
            <div className="absolute inset-0 flex items-center justify-center pb-4">
              <Car3D 
                category={selectedType as any}
                color={selectedColor as keyof typeof CAR_COLORS}
                size="lg"
                rotation={0}
                showShadow={true}
                showReflection={true}
                perspective="side"
              />
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <p className="text-white font-medium text-sm">{colorData?.name || 'Custom'}</p>
            </div>
          </div>

          {/* Color Grid */}
          <div className="flex-1 overflow-auto px-6 py-6">
            <div className="grid grid-cols-3 gap-3">
              {AVAILABLE_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => color.free && setSelectedColor(color.id)}
                  disabled={!color.free}
                  className={`relative aspect-square rounded-2xl transition-all ${
                    selectedColor === color.id
                      ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105'
                      : color.free ? 'hover:scale-105' : 'opacity-40'
                  }`}
                  style={{ background: color.hex }}
                >
                  {!color.free && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                      <span className="text-white text-xs font-bold">🔒</span>
                    </div>
                  )}
                  {selectedColor === color.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                        <Check size={18} className="text-slate-900" />
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
            
            <p className="text-center text-slate-500 text-xs mt-4">
              💎 Earn gems by driving safely to unlock more colors!
            </p>
          </div>
        </>
      )}

      {/* Confirm Button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleNextStep}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:from-amber-400 hover:to-orange-400 transition-all"
        >
          <Check size={20} />
          {step === 'type' ? 'Continue' : "Let's Go!"}
        </button>
        
        {step === 'color' && (
          <button
            onClick={() => setStep('type')}
            className="w-full text-slate-400 text-sm mt-3 hover:text-white"
          >
            ← Back to vehicle selection
          </button>
        )}
      </div>
    </div>
  )
}
