import { MapPin, Gift, Users, User } from 'lucide-react';
import { cn } from '@/lib/snaproad-utils';

interface BottomNavProps {
  activeTab: 'map' | 'gems' | 'family' | 'profile';
  onTabChange: (tab: 'map' | 'gems' | 'family' | 'profile') => void;
}

const TABS = [
  { id: 'map', icon: MapPin, label: 'Map' },
  { id: 'gems', icon: Gift, label: 'Gems' },
  { id: 'family', icon: Users, label: 'Family' },
  { id: 'profile', icon: User, label: 'Profile' },
] as const;

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#121822] border-t border-white/[0.08] pb-safe z-50">
      <div className="flex items-center justify-around h-full max-w-md mx-auto">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id as typeof activeTab)}
              className="flex flex-col items-center gap-1 py-2 px-4 transition-all"
              data-testid={`bottom-nav-${id}`}
            >
              <div className={cn(
                'w-12 h-8 flex items-center justify-center rounded-full transition-colors',
                isActive && 'bg-[#0084FF]/10'
              )}>
                <Icon 
                  size={24} 
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-[#0084FF]' : 'text-white/40'
                  )} 
                />
              </div>
              <span className={cn(
                'text-[12px] font-medium transition-colors',
                isActive ? 'text-[#0084FF]' : 'text-white/40'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
