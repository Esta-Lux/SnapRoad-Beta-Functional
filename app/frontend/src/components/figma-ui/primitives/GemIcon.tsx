import { Diamond } from 'lucide-react';
import { cn } from '@/lib/snaproad-utils';

interface GemIconProps {
  size?: number;
  className?: string;
}

export function GemIcon({ size = 16, className }: GemIconProps) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <Diamond 
        size={size} 
        className="text-[#00FFD7] fill-[#00FFD7]/30" 
        strokeWidth={2.5}
      />
      <div 
        className="absolute inset-0 bg-[#00FFD7]/20 blur-sm rounded-full"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
