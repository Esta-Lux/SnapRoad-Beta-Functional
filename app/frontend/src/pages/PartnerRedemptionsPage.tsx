/**
 * Dedicated partner surface: Redemptions + scan status. Reuses PartnerDashboard with redemptions tab.
 */
import PartnerDashboard from '@/pages/PartnerDashboard'

export default function PartnerRedemptionsPage() {
  return <PartnerDashboard initialTab="redemptions" />
}
