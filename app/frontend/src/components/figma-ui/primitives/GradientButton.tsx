import { cn } from '@/lib/snaproad-utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-medium transition-all duration-200 flex items-center justify-center gap-2',
          variant === 'primary' && 
            'bg-gradient-to-r from-[#004A93] to-[#0084FF] text-white hover:opacity-90 active:scale-[0.98]',
          variant === 'secondary' && 
            'bg-white/10 text-white border border-white/20 hover:bg-white/15',
          variant === 'ghost' && 
            'bg-transparent text-[#0084FF] hover:bg-[#0084FF]/10',
          'h-12 px-6 rounded-xl',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';
