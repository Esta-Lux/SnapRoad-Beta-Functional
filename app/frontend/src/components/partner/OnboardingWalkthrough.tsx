import { useState } from 'react'
import {
  Building2, Gift, Rocket, BarChart3, Sparkles,
  ArrowRight, ChevronLeft,
} from 'lucide-react'

interface Props {
  onComplete: () => void
  onSkip: () => void
}

const STEPS = [
  { title: 'Welcome to Partner Portal', description: 'Manage your offers, track performance, and grow your business with SnapRoad drivers.', icon: Building2, color: 'from-emerald-500 to-teal-500' },
  { title: 'Create Compelling Offers', description: 'Create discounts and promotions that attract SnapRoad drivers. Use AI to generate stunning promotional images.', icon: Gift, color: 'from-purple-500 to-pink-500' },
  { title: 'Boost Your Reach', description: 'Expand your offer visibility with our flexible boost system. Pay only for the reach you need.', icon: Rocket, color: 'from-orange-500 to-red-500' },
  { title: 'Track Performance', description: 'Monitor views, redemptions, and revenue in real-time with beautiful analytics dashboards.', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
]

export default function OnboardingWalkthrough({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0)
  const currentStep = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${currentStep.color} rounded-full blur-3xl opacity-30`} />
          <button onClick={onSkip} data-testid="skip-tour-btn" className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10">Skip Tour</button>
          <div className="relative p-8">
            <div className={`w-20 h-20 bg-gradient-to-br ${currentStep.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
              <currentStep.icon className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
            <p className="text-slate-300 text-base leading-relaxed mb-8">{currentStep.description}</p>
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-600'}`} />))}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && (<button onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl bg-slate-700/50 text-white font-medium hover:bg-slate-700 flex items-center gap-2"><ChevronLeft size={18} />Back</button>)}
              <button onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : onComplete()} className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90`}>
                {step < STEPS.length - 1 ? (<>Next<ArrowRight size={18} /></>) : (<>Get Started<Sparkles size={18} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
