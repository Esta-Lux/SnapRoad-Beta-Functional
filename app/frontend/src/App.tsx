import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import AuthRedirect from './pages/AuthRedirect'
import PartnerSignup from './pages/PartnerSignup'
import PartnerWelcomePage from './pages/PartnerWelcomePage'
import PartnerSignInPage from './pages/PartnerSignInPage'
import AdminSignInPage from './pages/AdminSignInPage'
import AdminGuard from './components/guards/AdminGuard'
import PartnerGuard from './components/guards/PartnerGuard'
import DriverGuard from './components/guards/DriverGuard'
import BusinessDashboard from './pages/BusinessDashboard'
import WelcomePage from './pages/WelcomePage'
import PartnerDashboard from './pages/PartnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DriverApp from './pages/DriverApp'
import { NavigationCoreProvider } from './contexts/NavigationCoreContext'
import { MapboxProvider } from './contexts/MapboxContext'
import { ThemeProvider } from './contexts/ThemeContext'
import TeamScanPage from './pages/TeamScanPage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          {/* App entry: Driver auth (new login screen) */}
          <Route path="/" element={<Navigate to="/driver/auth" replace />} />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/auth/partner-signup" element={<PartnerSignup />} />
          <Route path="/join" element={<Navigate to="/auth/partner-signup" replace />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Driver App - Mapbox */}
          <Route path="/driver" element={
            <DriverGuard>
              <ThemeProvider>
                <MapboxProvider>
                  <NavigationCoreProvider fallbackCenter={{ lat: 39.9612, lng: -82.9988 }} enableGps={true}>
                    <DriverApp />
                  </NavigationCoreProvider>
                </MapboxProvider>
              </ThemeProvider>
            </DriverGuard>
          } />
          <Route path="/driver/auth" element={<WelcomePage />} />

          <Route path="/scan/:partnerId/:token" element={<TeamScanPage />} />
          <Route path="/scan/:partnerId" element={<TeamScanPage />} />
          <Route path="/portal/partner/welcome" element={<PartnerWelcomePage />} />
          <Route path="/portal/partner/sign-in" element={<PartnerSignInPage />} />
          <Route path="/portal/partner" element={<PartnerGuard><PartnerDashboard /></PartnerGuard>} />
          <Route path="/portal/admin-sr2025secure/sign-in" element={<AdminSignInPage />} />
          <Route path="/portal/admin-sr2025secure" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/partner" element={<Navigate to="/portal/partner" replace />} />
          <Route path="/admin" element={<Navigate to="/portal/admin-sr2025secure" replace />} />
          <Route path="/login" element={<Navigate to="/driver/auth" replace />} />
          <Route path="/business" element={<BusinessDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
