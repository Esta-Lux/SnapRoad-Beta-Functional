import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'premium'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
    success: 'bg-[#00DFA2]/20 text-[#00DFA2]',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    premium: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-3 py-1 text-xs',
  }

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
