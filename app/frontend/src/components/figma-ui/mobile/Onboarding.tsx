import { useState } from 'react';
import { ChevronRight, Shield, Trophy, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GradientButton } from '../primitives/GradientButton';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Advanced AI monitoring keeps you safe on every journey. Real-time alerts and intelligent routing.',
    color: '#0084FF'
  },
  {
    icon: Trophy,
    title: 'Earn Rewards',
    description: 'Safe driving earns gems. Unlock premium badges and exclusive offers from partner brands.',
    color: '#00FFD7'
  },
  {
    icon: MapPin,
    title: 'Smart Navigation',
    description: 'AI-powered route optimization avoids hazards and saves time. Your safest route, every time.',
    color: '#0084FF'
  },
  {
    icon: Sparkles,
    title: 'Premium Experience',
    description: 'Where luxury meets safety. Join a community where safety is the ultimate status symbol.',
    color: '#00FFD7'
  }
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0E16]">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E16]/60 via-[#0A0E16]/80 to-[#0A0E16]" />
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0084FF]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFD7]/10 rounded-full blur-[120px]" />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-white font-bold">SnapRoad</span>
          </div>
          <button 
            onClick={handleSkip}
            className="text-white/60 text-sm font-bold hover:text-white/80 transition-colors"
            data-testid="onboarding-skip-btn"
          >
            Skip
          </button>
        </div>

        {/* Slides */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-3xl p-8 sm:p-10 overflow-hidden"
            >
              {/* Glassmorphic shine effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Icon */}
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 sm:mb-8"
                style={{ 
                  background: `${slides[currentSlide].color}15`,
                  border: `1px solid ${slides[currentSlide].color}30`
                }}
              >
                {(() => {
                  const Icon = slides[currentSlide].icon;
                  return <Icon size={36} style={{ color: slides[currentSlide].color }} />;
                })()}
              </div>

              {/* Content */}
              <h2 className="text-white text-2xl sm:text-3xl font-black mb-4">
                {slides[currentSlide].title}
              </h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                {slides[currentSlide].description}
              </p>

              {/* Ambient glow */}
              <div 
                className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-20"
                style={{ background: slides[currentSlide].color }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 mt-10 sm:mt-12 mb-6 sm:mb-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-8 bg-gradient-to-r from-[#0084FF] to-[#00FFD7]' 
                    : 'w-2 bg-white/20 hover:bg-white/30'
                }`}
                data-testid={`onboarding-dot-${index}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <GradientButton 
            onClick={handleNext}
            className="w-full h-14 rounded-2xl font-bold shadow-[0_8px_32px_rgba(0,132,255,0.3)]"
            data-testid="onboarding-next-btn"
          >
            {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
            <ChevronRight size={20} className="ml-2" />
          </GradientButton>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            SnapRoad © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
