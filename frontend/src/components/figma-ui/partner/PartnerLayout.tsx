import { ReactNode, useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Gift, 
  Users, 
  DollarSign, 
  Settings, 
  HelpCircle, 
  Bell,
  ChevronLeft,
  Menu,
  LogOut,
  Sun,
  Moon,
  QrCode,
  Store
} from 'lucide-react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface PartnerLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'offers', icon: Gift, label: 'Offers & Campaigns' },
  { id: 'referrals', icon: Users, label: 'Referrals' },
  { id: 'payouts', icon: DollarSign, label: 'Payouts' },
  { id: 'qr-codes', icon: QrCode, label: 'QR Codes' },
  { id: 'profile', icon: Store, label: 'Business Profile' },
  { id: 'support', icon: HelpCircle, label: 'Support' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function PartnerLayout({ children, currentPage, onNavigate, onLogout }: PartnerLayoutProps) {
  const { theme, toggleTheme } = useSnaproadTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#0A0E16]' : 'bg-[#F9FBFF]'}`}>
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 border-r ${
        theme === 'dark' ? 'bg-[#121822] border-white/10' : 'bg-white border-[#E6ECF5]'
      } flex flex-col`}>
        {/* Logo */}
        <div className={`h-16 flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-6'} border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-[#E6ECF5]'
        }`}>
          {sidebarCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00DFA2] to-[#00BF8F] flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00DFA2] to-[#00BF8F] flex items-center justify-center">
                <Store size={20} className="text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-[#00DFA2] to-[#0084FF] bg-clip-text text-transparent">
                  Partner
                </span>
                <p className={`text-[10px] ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Business Portal</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 h-11 rounded-lg transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    isActive 
                      ? 'bg-[#00DFA2] text-white' 
                      : theme === 'dark'
                        ? 'text-white/60 hover:bg-white/5 hover:text-white'
                        : 'text-[#4B5C74] hover:bg-[#F5F8FA] hover:text-[#0B1220]'
                  }`}
                  data-testid={`partner-nav-${item.id}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-white/10' : 'border-[#E6ECF5]'}`}>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 h-11 rounded-lg transition-colors ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3'
            } ${
              theme === 'dark'
                ? 'text-white/60 hover:bg-white/5 hover:text-white'
                : 'text-[#4B5C74] hover:bg-[#F5F8FA] hover:text-[#0B1220]'
            }`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {!sidebarCollapsed && <span className="text-sm">Toggle Theme</span>}
          </button>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 h-11 rounded-lg transition-colors mt-1 ${
              sidebarCollapsed ? 'justify-center px-0' : 'px-3'
            } text-red-400 hover:bg-red-500/10`}
            data-testid="partner-logout-btn"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${
          theme === 'dark' ? 'bg-[#121822] border-white/10' : 'bg-white border-[#E6ECF5]'
        }`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              theme === 'dark' ? 'hover:bg-white/5 text-white/60' : 'hover:bg-[#F5F8FA] text-[#4B5C74]'
            }`}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
          
          <div className="flex items-center gap-4">
            <button className={`w-10 h-10 rounded-lg flex items-center justify-center relative ${
              theme === 'dark' ? 'hover:bg-white/5 text-white/60' : 'hover:bg-[#F5F8FA] text-[#4B5C74]'
            }`}>
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#00DFA2] rounded-full" />
            </button>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-[#00DFA2] to-[#00BF8F] flex items-center justify-center text-white font-bold text-sm`}>
              B
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
