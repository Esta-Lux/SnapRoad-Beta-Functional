/**
 * Dedicated partner surface: My Offers (CRUD). Reuses PartnerDashboard with offers tab.
 */
import PartnerDashboard from '@/pages/PartnerDashboard'

export default function PartnerOffersPage() {
  return <PartnerDashboard initialTab="offers" />
}
