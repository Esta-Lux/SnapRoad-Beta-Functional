import { ReactNode, ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function GradientButton({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: GradientButtonProps) {
  const baseStyles = 'font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2'
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#00DFA2] to-[#0084FF] text-white hover:opacity-90 active:scale-95',
    secondary: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--bg-border)] hover:bg-[var(--bg-elevated)]',
    tertiary: 'bg-transparent text-[#00DFA2] hover:bg-[#00DFA2]/10',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
