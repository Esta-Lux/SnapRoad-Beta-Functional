import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GradientButton } from '../primitives/GradientButton';
import { motion } from 'motion/react';

import logoImage from '@/assets/images/eafa66e5310c9d83d31a61740098111eaa2e86f7.png';

interface LoginProps {
  onNavigate: (screen: string) => void;
  onSetMode?: (mode: 'mobile' | 'admin' | 'partner') => void;
}

export function Login({ onNavigate, onSetMode }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAs, setLoginAs] = useState<'user' | 'partner' | 'admin'>('user');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (loginAs === 'admin') {
      if (onSetMode) onSetMode('admin');
    } else if (loginAs === 'partner') {
      if (onSetMode) onSetMode('partner');
    } else {
      onNavigate('map');
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
          data-testid="login-back-btn"
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
        <h1 className="text-white text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-white/60 mb-8">Sign in to continue your journey</p>

        {/* Login Type Selector */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
          {(['user', 'partner', 'admin'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setLoginAs(type)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                loginAs === type 
                  ? 'bg-[#0084FF] text-white' 
                  : 'text-white/50 hover:text-white/70'
              }`}
              data-testid={`login-as-${type}`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
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
                data-testid="login-email-input"
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
                placeholder="Enter your password"
                className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#0084FF]"
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={() => onNavigate('forgot-password')}
              className="text-[#0084FF] text-sm hover:underline"
              data-testid="forgot-password-link"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Login Button */}
        <GradientButton
          className="w-full h-14 mt-8 rounded-2xl text-lg"
          onClick={handleLogin}
          disabled={isLoading}
          data-testid="login-submit-btn"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </GradientButton>

        {/* Sign Up Link */}
        <p className="text-center text-white/50 mt-6">
          Don't have an account?{' '}
          <button 
            onClick={() => onNavigate('signup')}
            className="text-[#0084FF] font-medium hover:underline"
            data-testid="signup-link"
          >
            Sign up
          </button>
        </p>
      </motion.div>
    </div>
  );
}
