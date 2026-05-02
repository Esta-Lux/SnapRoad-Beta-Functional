import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type AppActionAvailability = 'works' | 'gated' | 'coming_soon' | 'needs_fix';

export type AppActionTarget =
  | 'map'
  | 'dashboards'
  | 'wallet'
  | 'profile'
  | 'offers_hub'
  | 'profile_billing'
  | 'place_alerts'
  | 'commute_alerts'
  | 'support'
  | 'share'
  | 'about'
  | 'family_soon'
  | 'convoy_soon';

export type AppActionContract = {
  id: string;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  target: AppActionTarget;
  availability: AppActionAvailability;
  premiumRequired?: boolean;
  comingSoon?: boolean;
};

export const APP_ACTION_AUDIT: AppActionContract[] = [
  {
    id: 'drive_map',
    label: 'Drive',
    description: 'Open the live map and route planner.',
    icon: 'map-outline',
    target: 'map',
    availability: 'works',
  },
  {
    id: 'social_dashboard',
    label: 'Social Drive Hub',
    description: 'Friends, requests, live sharing, and challenges.',
    icon: 'people-outline',
    target: 'dashboards',
    availability: 'gated',
    premiumRequired: true,
  },
  {
    id: 'offers_hub',
    label: 'Offers hub',
    description: 'Local partner redemptions and online deals (browse in one place).',
    icon: 'pricetag-outline',
    target: 'offers_hub',
    availability: 'works',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    description: 'Gems ledger, activity, redemptions — browse deals on the Offers tab.',
    icon: 'wallet-outline',
    target: 'wallet',
    availability: 'works',
  },
  {
    id: 'commute_alerts',
    label: 'Commute Alerts',
    description: 'Recurring road scans and push notifications.',
    icon: 'navigate-outline',
    target: 'commute_alerts',
    availability: 'works',
  },
  {
    id: 'place_alerts',
    label: 'Place Alerts',
    description: 'Saved-place arrival and traffic timing alerts.',
    icon: 'notifications-outline',
    target: 'place_alerts',
    availability: 'works',
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Plans, billing, and upgrade path.',
    icon: 'diamond-outline',
    target: 'profile_billing',
    availability: 'works',
  },
  {
    id: 'convoy',
    label: 'Convoy',
    description: 'Premium meetup flow now; full family convoy is coming soon.',
    icon: 'car-sport-outline',
    target: 'convoy_soon',
    availability: 'coming_soon',
    premiumRequired: true,
    comingSoon: true,
  },
  {
    id: 'family',
    label: 'Family Safety',
    description: 'Polished preview while the backend remains intentionally stubbed.',
    icon: 'shield-checkmark-outline',
    target: 'family_soon',
    availability: 'coming_soon',
    comingSoon: true,
  },
  {
    id: 'support',
    label: 'Help & Support',
    description: 'Open support tools from Profile.',
    icon: 'help-circle-outline',
    target: 'support',
    availability: 'works',
  },
];

export function getActionById(id: string): AppActionContract | undefined {
  return APP_ACTION_AUDIT.find((action) => action.id === id);
}
