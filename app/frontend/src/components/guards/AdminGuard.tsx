import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  if (!isAuthenticated || !user || !isAdmin) {
    return <Navigate to="/auth?tab=admin" replace />
  }

  return <>{children}</>
}
