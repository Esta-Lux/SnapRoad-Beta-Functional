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
import DriverApp from './pages/DriverApp'
import BusinessDashboard from './pages/BusinessDashboard'

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
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Driver App - Full mobile experience */}
        <Route path="/driver" element={<DriverApp />} />
        <Route path="/driver/auth" element={<AuthFlow />} />
        
        {/* Business Partner Dashboard - Public for demo */}
        <Route path="/business" element={<BusinessDashboard />} />
        
        {/* Protected Admin routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
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
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
