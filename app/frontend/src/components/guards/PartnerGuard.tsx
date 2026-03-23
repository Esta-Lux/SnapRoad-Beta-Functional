import { Navigate } from 'react-router-dom'
import { partnerApi } from '../../services/partnerApi'

export default function PartnerGuard({ children }: { children: React.ReactNode }) {
  const hasSession = partnerApi.restoreSession()

  if (!hasSession) {
    return <Navigate to="/auth?tab=partner" replace />
  }

  return <>{children}</>
}
