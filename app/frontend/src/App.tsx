import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import DocumentTitleTracker from '@/components/DocumentTitleTracker'
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
import DriverWebRetiredPage from './pages/DriverWebRetiredPage'
import PublicLegalPage from './pages/PublicLegalPage'
import ReferralInviteLandingPage from './pages/ReferralInviteLandingPage'
import { NavigationCoreProvider } from './contexts/NavigationCoreContext'
import { MapboxProvider } from './contexts/MapboxContext'
import { ThemeProvider } from './contexts/ThemeContext'
import TeamScanPage from './pages/TeamScanPage'
import RealtimeDashboard from './pages/Admin/RealtimeDashboard'
import OffersUploadPage from './pages/Admin/OffersUploadPage'
import OffersManagePage from './pages/Admin/OffersManagePage'
import BillingPage from './pages/PartnerPortal/BillingPage'
import ScannerPage from './pages/PartnerPortal/ScannerPage'
import PartnerOffersPage from './pages/PartnerOffersPage'
import PartnerRedemptionsPage from './pages/PartnerRedemptionsPage'
import { isPartnerPortalPrimarySite } from '@/lib/siteProfile'

function App() {
  const partnerPrimary = isPartnerPortalPrimarySite()
  // Mock-only demo route. Production builds drop it so it can't render with prod data.
  const showBusinessMock = import.meta.env.MODE !== 'production'

  const driverAppTree = (
    <DriverGuard>
      <ThemeProvider>
        <MapboxProvider>
          <NavigationCoreProvider fallbackCenter={{ lat: 39.9612, lng: -82.9988 }} enableGps={true}>
            <DriverApp />
          </NavigationCoreProvider>
        </MapboxProvider>
      </ThemeProvider>
    </DriverGuard>
  )

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DocumentTitleTracker />
        <Routes>
          <Route
            path="/"
            element={<Navigate to={partnerPrimary ? '/portal/partner' : '/driver/auth'} replace />}
          />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/auth/partner-signup" element={<PartnerSignup />} />
          <Route path="/join" element={<Navigate to="/auth/partner-signup" replace />} />
          <Route
            path="/welcome"
            element={
              partnerPrimary ? (
                <Navigate to="/portal/partner/welcome" replace />
              ) : (
                <WelcomePage />
              )
            }
          />
          <Route path="/privacy" element={<PublicLegalPage docKey="privacy" />} />
          <Route path="/terms" element={<PublicLegalPage docKey="terms" />} />
          <Route path="/community-guidelines" element={<PublicLegalPage docKey="community" />} />
          <Route
            path="/referral/:code"
            element={<ReferralInviteLandingPage pathPrefix="referral" />}
          />
          <Route
            path="/invite/:code"
            element={<ReferralInviteLandingPage pathPrefix="invite" />}
          />

          {partnerPrimary ? (
            <>
              <Route path="/driver" element={<DriverWebRetiredPage />} />
              <Route path="/driver/*" element={<DriverWebRetiredPage />} />
            </>
          ) : (
            <>
              <Route path="/driver" element={driverAppTree} />
              <Route path="/driver/auth" element={<WelcomePage />} />
            </>
          )}

          <Route path="/scan/:partnerId/:token" element={<TeamScanPage />} />
          <Route path="/scan/:partnerId" element={<TeamScanPage />} />
          <Route path="/portal/partner/welcome" element={<PartnerWelcomePage />} />
          <Route path="/portal/partner/sign-in" element={<PartnerSignInPage />} />
          <Route path="/portal/partner" element={<PartnerGuard><PartnerDashboard /></PartnerGuard>} />
          <Route path="/portal/partner/billing" element={<PartnerGuard><BillingPage /></PartnerGuard>} />
          <Route path="/portal/partner/scanner" element={<PartnerGuard><ScannerPage /></PartnerGuard>} />
          <Route path="/portal/partner/offers" element={<PartnerGuard><PartnerOffersPage /></PartnerGuard>} />
          <Route path="/portal/partner/redemptions" element={<PartnerGuard><PartnerRedemptionsPage /></PartnerGuard>} />
          <Route path="/portal/admin-sr2025secure/sign-in" element={<AdminSignInPage />} />
          <Route path="/portal/admin-sr2025secure" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/portal/admin-sr2025secure/realtime" element={<AdminGuard><RealtimeDashboard /></AdminGuard>} />
          <Route path="/portal/admin-sr2025secure/offers/upload" element={<AdminGuard><OffersUploadPage /></AdminGuard>} />
          <Route path="/portal/admin-sr2025secure/offers/manage" element={<AdminGuard><OffersManagePage /></AdminGuard>} />
          <Route path="/partner" element={<Navigate to="/portal/partner" replace />} />
          <Route path="/admin" element={<Navigate to="/portal/admin-sr2025secure" replace />} />
          <Route
            path="/login"
            element={
              <Navigate to={partnerPrimary ? '/portal/partner/sign-in' : '/driver/auth'} replace />
            }
          />
          {showBusinessMock && (
            <Route path="/business" element={<BusinessDashboard />} />
          )}
          <Route
            path="*"
            element={<Navigate to={partnerPrimary ? '/portal/partner' : '/'} replace />}
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
