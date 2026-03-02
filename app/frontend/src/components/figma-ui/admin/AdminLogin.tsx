import { useState } from 'react';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { GradientButton } from '../primitives/GradientButton';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    onLoginSuccess();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-[#4B5C74] hover:text-[#0B1220] transition-colors"
          data-testid="admin-login-back"
        >
          <ArrowLeft size={20} />
          Back to App
        </button>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-[#E6ECF5] p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-[#0B1220] text-2xl font-bold mb-2">Admin Portal</h1>
            <p className="text-[#4B5C74]">Sign in to access the admin dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[#4B5C74] text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5C74]" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@snaproad.com"
                  className="w-full h-12 pl-12 pr-4 bg-[#F5F8FA] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#4B5C74]/50 focus:outline-none focus:border-[#0084FF]"
                  data-testid="admin-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#4B5C74] text-sm mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5C74]" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-12 pr-4 bg-[#F5F8FA] border border-[#E6ECF5] rounded-xl text-[#0B1220] placeholder:text-[#4B5C74]/50 focus:outline-none focus:border-[#0084FF]"
                  data-testid="admin-password-input"
                />
              </div>
            </div>

            <GradientButton
              className="w-full h-12 rounded-xl mt-6"
              onClick={handleLogin}
              disabled={isLoading}
              data-testid="admin-login-submit"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}
