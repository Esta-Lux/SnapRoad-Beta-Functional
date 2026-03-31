// Admin Onboarding Walkthrough Component
// =============================================

import { useState } from 'react'
import { Shield, Users, Gift, FileText, ChevronLeft, ArrowRight, Sparkles } from 'lucide-react'
import { OnboardingWalkthroughProps } from '@/types/admin'

export default function OnboardingWalkthrough({ onComplete, onSkip }: OnboardingWalkthroughProps) {
  const [step, setStep] = useState(0)
  
  const steps = [
    { title: 'Welcome, Administrator', description: 'You have full control over the SnapRoad platform. Manage users, partners, events, and monitor platform health.', icon: Shield, color: 'from-purple-500 to-pink-500' },
    { title: 'User & Partner Management', description: 'View all drivers, their safety scores, and manage business partners. Approve or suspend accounts as needed.', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { title: 'Create Offers for Businesses', description: 'Help your partners succeed by creating offers on their behalf with AI-generated promotional images.', icon: Gift, color: 'from-emerald-500 to-teal-500' },
    { title: 'Export & Import Data', description: 'Easily export user and offer data to CSV/JSON, or import bulk data to quickly set up new partners.', icon: FileText, color: 'from-amber-500 to-orange-500' },
  ]

  const currentStep = steps[step]

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
              {steps.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-purple-400' : 'w-2 bg-slate-600'}`} />))}
            </div>
            <div className="flex items-center gap-3">
              {step > 0 && (<button onClick={() => setStep(step - 1)} className="px-5 py-3 rounded-xl bg-slate-700/50 text-white font-medium hover:bg-slate-700 flex items-center gap-2"><ChevronLeft size={18} />Back</button>)}
              <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete()} className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r ${currentStep.color} text-white hover:opacity-90`}>
                {step < steps.length - 1 ? (<>Next<ArrowRight size={18} /></>) : (<>Start Managing<Sparkles size={18} /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
