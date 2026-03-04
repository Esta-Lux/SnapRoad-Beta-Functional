import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthFlow from './pages/Auth/AuthFlow'
import AuthPage from './pages/AuthPage'
import PartnerSignup from './pages/PartnerSignup'
import AdminGuard from './components/guards/AdminGuard'
import PartnerGuard from './components/guards/PartnerGuard'
import DriverGuard from './components/guards/DriverGuard'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import UserDetail from './pages/Users/UserDetail'
import Trips from './pages/Trips'
import TripDetail from './pages/Trips/TripDetail'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/Incidents/IncidentDetail'
import Rewards from './pages/Rewards'
import Partners from './pages/Partners'
import PartnerDetail from './pages/Partners/PartnerDetail'
import Settings from './pages/Settings'
import BusinessDashboard from './pages/BusinessDashboard'
import WelcomePage from './pages/WelcomePage'
import PartnerDashboard from './pages/PartnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import DriverApp from './pages/DriverApp'
import PhonePreview from './pages/PhonePreview'
import { NavigationCoreProvider } from './contexts/NavigationCoreContext'

// New Figma UI Components
import { SnapRoadApp } from './components/figma-ui'

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Welcome/Landing Page */}
        <Route path="/" element={<WelcomePage />} />
        
        {/* Unified auth */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/partner-signup" element={<PartnerSignup />} />
        <Route path="/join" element={<Navigate to="/auth/partner-signup" replace />} />

        {/* New SnapRoad UI - Figma Design System */}
        <Route path="/app/*" element={<SnapRoadApp />} />
        
        {/* Driver App - Web Preview (Phase 1: VehicleState + MapKit-ready map) */}
        <Route path="/driver" element={
          <DriverGuard>
            <NavigationCoreProvider fallbackCenter={{ lat: 39.9612, lng: -82.9988 }} enableGps={true}>
              <DriverApp />
            </NavigationCoreProvider>
          </DriverGuard>
        } />
        <Route path="/driver/auth" element={<AuthFlow />} />
        
        {/* Phone frame preview */}
        <Route path="/preview" element={<PhonePreview />} />
        
        {/* Partner Portal - protected by partner auth */}
        <Route path="/portal/partner" element={<PartnerGuard><PartnerDashboard /></PartnerGuard>} />
        
        {/* Admin Console - protected by admin auth */}
        <Route path="/portal/admin-sr2025secure" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        
        {/* Short URLs - redirect to portal (guards handle auth redirect) */}
        <Route path="/partner" element={<Navigate to="/portal/partner" replace />} />
        <Route path="/admin" element={<Navigate to="/portal/admin-sr2025secure" replace />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        
        {/* Business Partner Dashboard - Legacy */}
        <Route path="/business" element={<BusinessDashboard />} />
        
        {/* Protected Admin routes (old) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="trips" element={<Trips />} />
          <Route path="trips/:id" element={<TripDetail />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="partners" element={<Partners />} />
          <Route path="partners/:id" element={<PartnerDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Catch all - redirect to welcome */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
