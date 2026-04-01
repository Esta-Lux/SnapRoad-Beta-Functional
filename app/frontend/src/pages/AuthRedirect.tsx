import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Legacy /auth URLs: send partner traffic to the partner welcome funnel,
 * admin tab to the obscured admin sign-in path.
 */
export default function AuthRedirect() {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab')
  if (tab === 'admin') {
    return <Navigate to="/portal/admin-sr2025secure/sign-in" replace />
  }
  return <Navigate to="/portal/partner/welcome" replace />
}
