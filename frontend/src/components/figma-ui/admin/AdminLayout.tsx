import { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Shield, 
  BarChart3,
  Gift,
  Building2,
  Bell,
  LineChart,
  DollarSign,
  FileText,
  Settings,
  ClipboardList,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
  Tag
} from 'lucide-react';
import { useState } from 'react';
import { useSnaproadTheme } from '@/contexts/SnaproadThemeContext';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'users', icon: Users, label: 'Users & Families' },
  { id: 'offers', icon: Tag, label: 'Offer Management' },
  { id: 'incidents', icon: AlertTriangle, label: 'Incidents' },
  { id: 'ai-moderation', icon: Shield, label: 'AI Moderation' },
  { id: 'partner-analytics', icon: BarChart3, label: 'Partner Analytics' },
  { id: 'rewards', icon: Gift, label: 'Rewards' },
  { id: 'partners', icon: Building2, label: 'Partners' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'analytics', icon: LineChart, label: 'Analytics' },
  { id: 'finance', icon: DollarSign, label: 'Finance' },
  { id: 'legal', icon: FileText, label: 'Legal' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'audit', icon: ClipboardList, label: 'Audit Log' },
];

export function AdminLayout({ children, currentPage, onNavigate, onLogout }: AdminLayoutProps) {
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
            <span className="text-2xl font-bold bg-gradient-to-r from-[#0084FF] to-[#00FFD7] bg-clip-text text-transparent">S</span>
          ) : (
            <span className="text-xl font-bold bg-gradient-to-r from-[#0084FF] to-[#00FFD7] bg-clip-text text-transparent">SnapRoad Admin</span>
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
                      ? 'bg-[#0084FF] text-white' 
                      : theme === 'dark'
                        ? 'text-white/60 hover:bg-white/5 hover:text-white'
                        : 'text-[#4B5C74] hover:bg-[#F5F8FA] hover:text-[#0B1220]'
                  }`}
                  data-testid={`admin-nav-${item.id}`}
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
            data-testid="admin-logout-btn"
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
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-[#0084FF] to-[#00FFD7] flex items-center justify-center text-white font-bold text-sm`}>
              A
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
