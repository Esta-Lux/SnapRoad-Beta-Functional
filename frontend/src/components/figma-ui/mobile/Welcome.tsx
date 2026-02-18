import { ArrowLeft, Mail, Lock, User, Store } from 'lucide-react';
import { GradientButton } from '../primitives/GradientButton';
import { motion } from 'motion/react';

// Import images from assets
import logoImage from '@/assets/images/f1ce41940925932061ca7e2e293db7cdf37e4b87.png';
import heroImage from '@/assets/images/5e07bb0e92d56c36b9430b3be90f12e5af141274.png';

interface WelcomeProps {
  onNavigate: (screen: string) => void;
  onSetMode?: (mode: 'mobile' | 'admin' | 'partner') => void;
}

export function Welcome({ onNavigate, onSetMode }: WelcomeProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0E16]">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="SnapRoad Hero" 
          className="w-full h-full object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E16]/20 via-[#0A0E16]/30 to-[#0A0E16]/60" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex flex-col px-6 py-12">
        {/* Logo Section */}
        <motion.div 
          className="flex flex-col items-center pt-8 pb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={logoImage} alt="SnapRoad" className="h-20 mb-6" />
          <div className="w-12 h-1 bg-gradient-to-r from-[#0084FF] to-[#00FFD7] rounded-full" />
        </motion.div>

        {/* Two Container Layout */}
        <div className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
          {/* Top Container - Welcome Text */}
          <motion.div 
            className="relative backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-3xl p-8 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glassmorphic shine effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <h1 className="text-white text-4xl font-black mb-4 leading-tight">
              Safe journeys,<br />
              <span className="bg-gradient-to-r from-[#0084FF] to-[#00FFD7] bg-clip-text text-transparent">
                smart rewards.
              </span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Drive safer. Earn gems. Unlock exclusive local offers from verified partner businesses.
            </p>
          </motion.div>

          {/* Bottom Container - CTA */}
          <motion.div 
            className="relative backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-3xl p-8 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="space-y-4">
              <GradientButton 
                className="w-full h-14 text-lg rounded-2xl"
                onClick={() => onNavigate('signup')}
                data-testid="welcome-get-started-btn"
              >
                Get Started
              </GradientButton>
              
              <button 
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl text-white/90 font-medium hover:bg-white/10 transition-colors"
                onClick={() => onNavigate('login')}
                data-testid="welcome-login-btn"
              >
                I already have an account
              </button>
            </div>

            {/* Portal Links */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/40 text-sm text-center mb-4">Business & Admin Access</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  onClick={() => onSetMode?.('partner')}
                  data-testid="welcome-partner-portal-btn"
                >
                  <Store size={16} />
                  Partner Portal
                </button>
                <button 
                  className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  onClick={() => onSetMode?.('admin')}
                  data-testid="welcome-admin-portal-btn"
                >
                  <User size={16} />
                  Admin Portal
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-white/30 text-sm">
            By continuing, you agree to our{' '}
            <button className="text-white/50 underline" onClick={() => onNavigate('terms')}>Terms</button>
            {' & '}
            <button className="text-white/50 underline" onClick={() => onNavigate('privacy')}>Privacy Policy</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
