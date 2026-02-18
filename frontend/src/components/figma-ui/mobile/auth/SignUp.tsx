import { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { GradientButton } from '../primitives/GradientButton';
import { motion } from 'motion/react';

import logoImage from '@/assets/images/eafa66e5310c9d83d31a61740098111eaa2e86f7.png';

interface SignUpProps {
  onNavigate: (screen: string) => void;
  onSignUp?: () => void;
}

export function SignUp({ onNavigate, onSignUp }: SignUpProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (onSignUp) {
      onSignUp();
    } else {
      onNavigate('onboarding');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0E16] flex flex-col relative overflow-y-auto">
      {/* Clean Header with Gradient Background */}
      <div className="relative h-[140px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004A93] via-[#0084FF] to-[#00FFD7]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0E16]" />
        
        {/* Back button */}
        <button 
          onClick={() => onNavigate('welcome')}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
          data-testid="signup-back-btn"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        
        {/* Logo */}
        <motion.div 
          className="absolute bottom-4 left-0 right-0 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src={logoImage} alt="SnapRoad" className="h-12" />
        </motion.div>
      </div>

      {/* Form Content */}
      <motion.div 
        className="flex-1 px-6 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h1 className="text-white text-2xl font-bold mb-2">Create account</h1>
        <p className="text-white/60 mb-8">Start your safe driving journey today</p>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084FF]"
                data-testid="signup-name-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084FF]"
                data-testid="signup-email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084FF]"
                data-testid="signup-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-white/40 text-sm mt-2">Must be at least 8 characters</p>
          </div>
        </div>

        {/* Terms Agreement */}
        <p className="text-white/40 text-sm mt-6 text-center">
          By signing up, you agree to our{' '}
          <button className="text-[#0084FF] hover:underline" onClick={() => onNavigate('terms')}>
            Terms of Service
          </button>
          {' '}and{' '}
          <button className="text-[#0084FF] hover:underline" onClick={() => onNavigate('privacy')}>
            Privacy Policy
          </button>
        </p>

        {/* Sign Up Button */}
        <GradientButton
          className="w-full h-14 mt-6 rounded-2xl text-lg"
          onClick={handleSignUp}
          disabled={isLoading}
          data-testid="signup-submit-btn"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </GradientButton>

        {/* Login Link */}
        <p className="text-center text-white/50 mt-6">
          Already have an account?{' '}
          <button 
            onClick={() => onNavigate('login')}
            className="text-[#0084FF] font-medium hover:underline"
            data-testid="login-link"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
