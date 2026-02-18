import { useState } from 'react';
import { SnaproadThemeProvider } from '@/contexts/SnaproadThemeContext';

// Mobile Components - Auth
import { Welcome } from './mobile/auth/Welcome';
import { Login } from './mobile/auth/Login';
import { SignUp } from './mobile/auth/SignUp';
import { MapScreen } from './mobile/MapScreen';
import { Profile } from './mobile/Profile';
import { Gems } from './mobile/Gems';
import { Family } from './mobile/Family';
import { FuelDashboard } from './mobile/FuelDashboard';
import { TripLogs } from './mobile/TripLogs';
import { Leaderboard } from './mobile/Leaderboard';
import { Settings } from './mobile/Settings';
import { LiveLocations } from './mobile/LiveLocations';
import { AccountInfo } from './mobile/AccountInfo';
import { PrivacyCenter } from './mobile/PrivacyCenter';
import { NotificationSettings } from './mobile/NotificationSettings';
import { Onboarding } from './mobile/Onboarding';

// Admin Components
import { AdminLayout } from './admin/AdminLayout';
import { AdminLogin } from './admin/AdminLogin';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminUsers } from './admin/AdminUsers';
import { AdminOfferManagement } from './admin/AdminOfferManagement';

// Partner Components
import { PartnerLayout } from './partner/PartnerLayout';
import { PartnerDashboard } from './partner/PartnerDashboard';
import { PartnerOffers } from './partner/PartnerOffers';
import { PartnerReferrals } from './partner/PartnerReferrals';
import { PartnerTeam } from './partner/PartnerTeam';
import { QRScanner } from './partner/QRScanner';
import { PartnerAnalyticsDetailed } from './partner/PartnerAnalyticsDetailed';

// New Enhanced Components
import { OrionCoach } from './mobile/OrionCoach';
import { PhotoCapture } from './mobile/PhotoCapture';
import { DriverAnalytics } from './mobile/DriverAnalytics';

type AppMode = 'mobile' | 'admin' | 'partner';
type MobileScreen = 
  | 'welcome' 
  | 'signup' 
  | 'login' 
  | 'forgot-password'
  | 'map' 
  | 'gems'
  | 'gem-marketplace'
  | 'family' 
  | 'live-locations'
  | 'profile'
  | 'favorite-routes'
  | 'pricing'
  | 'fuel-dashboard'
  | 'engagement'
  | 'car-skin-showcase'
  | 'leaderboard'
  | 'trip-logs'
  | 'settings'
  | 'account-info'
  | 'privacy-center'
  | 'notifications-settings'
  | 'support'
  | 'terms'
  | 'privacy'
  | 'onboarding'
  | 'analytics'
  | 'report-incident';

type AdminPage = 
  | 'dashboard' 
  | 'users' 
  | 'incidents' 
  | 'ai-moderation'
  | 'partner-analytics'
  | 'rewards' 
  | 'partners' 
  | 'notifications' 
  | 'analytics' 
  | 'finance' 
  | 'legal' 
  | 'settings' 
  | 'audit'
  | 'offers';

type PartnerPage =
  | 'dashboard'
  | 'scan'
  | 'offers'
  | 'analytics'
  | 'team'
  | 'referrals'
  | 'profile'
  | 'support'
  | 'settings';

export function SnapRoadApp() {
  const [mode, setMode] = useState<AppMode>('mobile');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isPartnerAuthenticated, setIsPartnerAuthenticated] = useState(false);
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('welcome');
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [partnerPage, setPartnerPage] = useState<PartnerPage>('dashboard');
  
  // New state for Orion Coach and Photo Capture
  const [showOrionCoach, setShowOrionCoach] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const handleMobileNavigate = (screen: string) => {
    setMobileScreen(screen as MobileScreen);
  };

  const handleAdminNavigate = (page: string) => {
    setAdminPage(page as AdminPage);
  };

  const handlePartnerNavigate = (page: string) => {
    setPartnerPage(page as PartnerPage);
  };

  const handleLogout = () => {
    setMode('mobile');
    setMobileScreen('welcome');
    setIsAdminAuthenticated(false);
    setIsPartnerAuthenticated(false);
  };

  const handleSetMode = (newMode: 'mobile' | 'admin' | 'partner') => {
    setMode(newMode);
    if (newMode === 'mobile') {
      setMobileScreen('map');
    }
  };

  // Render Admin Content
  const renderAdminContent = () => {
    switch (adminPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <AdminUsers />;
      case 'offers':
        return <AdminOfferManagement onNavigate={handleAdminNavigate} />;
      default:
        return <AdminDashboard />;
    }
  };

  // Render Partner Content
  const renderPartnerContent = () => {
    switch (partnerPage) {
      case 'dashboard':
        return <PartnerDashboard />;
      case 'scan':
        return <QRScanner onNavigate={handlePartnerNavigate} />;
      case 'offers':
        return <PartnerOffers onNavigate={handlePartnerNavigate} />;
      case 'analytics':
        return <PartnerAnalyticsDetailed onNavigate={handlePartnerNavigate} />;
      case 'team':
        return <PartnerTeam onNavigate={handlePartnerNavigate} />;
      case 'referrals':
        return <PartnerReferrals onNavigate={handlePartnerNavigate} />;
      default:
        return <PartnerDashboard />;
    }
  };

  // Render Mobile Content
  const renderMobileContent = () => {
    switch (mobileScreen) {
      case 'welcome':
        return <Welcome onNavigate={handleMobileNavigate} onSetMode={handleSetMode} />;
      case 'login':
        return <Login onNavigate={handleMobileNavigate} onSetMode={handleSetMode} />;
      case 'signup':
        return <SignUp onNavigate={handleMobileNavigate} />;
      case 'map':
        return <MapScreen onNavigate={handleMobileNavigate} />;
      case 'profile':
        return <Profile onNavigate={handleMobileNavigate} />;
      case 'gems':
        return <Gems onNavigate={handleMobileNavigate} />;
      case 'family':
        return <Family onNavigate={handleMobileNavigate} />;
      case 'fuel-dashboard':
        return <FuelDashboard onNavigate={handleMobileNavigate} />;
      case 'trip-logs':
        return <TripLogs onNavigate={handleMobileNavigate} />;
      case 'leaderboard':
        return <Leaderboard onNavigate={handleMobileNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleMobileNavigate} />;
      case 'live-locations':
        return <LiveLocations onNavigate={handleMobileNavigate} />;
      case 'analytics':
        return <DriverAnalytics onNavigate={handleMobileNavigate} />;
      default:
        return <Welcome onNavigate={handleMobileNavigate} onSetMode={handleSetMode} />;
    }
  };

  return (
    <SnaproadThemeProvider>
      {/* Mobile App */}
      {mode === 'mobile' && (
        <div className="relative" data-testid="snaproad-mobile-app">
          {renderMobileContent()}
          
          {/* Orion Coach Overlay */}
          <OrionCoach 
            isOpen={showOrionCoach} 
            onClose={() => setShowOrionCoach(false)}
            currentRoute={{ distance: 12.4, duration: 28, destination: 'Downtown Office' }}
          />
          
          {/* Photo Capture Overlay */}
          <PhotoCapture
            isOpen={showPhotoCapture}
            onClose={() => setShowPhotoCapture(false)}
            onSubmit={(data) => {
              console.log('Incident reported:', data);
              setShowPhotoCapture(false);
            }}
          />
        </div>
      )}

      {/* Admin Panel */}
      {mode === 'admin' && (
        <div className="relative" data-testid="snaproad-admin-app">
          {isAdminAuthenticated ? (
            <>
              {/* Mode Switcher */}
              <button
                onClick={() => handleSetMode('mobile')}
                className="fixed bottom-4 right-4 z-[100] px-4 py-2 bg-white border border-[#E6ECF5] rounded-lg text-[#0B1220] text-[13px] hover:bg-[#F5F8FA] transition-colors shadow-lg"
                data-testid="switch-to-mobile-btn"
              >
                Switch to Mobile App
              </button>
              <AdminLayout
                currentPage={adminPage}
                onNavigate={handleAdminNavigate}
                onLogout={handleLogout}
              >
                {renderAdminContent()}
              </AdminLayout>
            </>
          ) : (
            <AdminLogin 
              onLoginSuccess={() => setIsAdminAuthenticated(true)} 
              onBack={() => handleSetMode('mobile')} 
            />
          )}
        </div>
      )}

      {/* Partner Panel - Placeholder */}
      {mode === 'partner' && (
        <div className="min-h-screen bg-[#0A0E16] flex items-center justify-center" data-testid="snaproad-partner-app">
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold mb-4">Partner Portal</h1>
            <p className="text-white/60 mb-6">Coming soon...</p>
            <button
              onClick={() => handleSetMode('mobile')}
              className="px-6 py-3 bg-[#0084FF] text-white rounded-xl"
            >
              Back to App
            </button>
          </div>
        </div>
      )}
    </SnaproadThemeProvider>
  );
}

export default SnapRoadApp;
