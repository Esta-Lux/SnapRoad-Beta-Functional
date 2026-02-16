import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Auth/Login'
import AuthFlow from './pages/Auth/AuthFlow'
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
        
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Driver App - Web Preview (Full Flutter-style UI) */}
        <Route path="/driver" element={<DriverApp />} />
        <Route path="/driver/auth" element={<AuthFlow />} />
        
        {/* Partner Portal - Separate URL for custom domain */}
        <Route path="/portal/partner" element={<PartnerDashboard />} />
        
        {/* Admin Console - Secret path (only accessible via direct link) */}
        <Route path="/portal/admin-sr2025secure" element={<AdminDashboard />} />
        
        {/* Legacy routes - redirect to new portal paths */}
        <Route path="/partner" element={<Navigate to="/portal/partner" replace />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        
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
