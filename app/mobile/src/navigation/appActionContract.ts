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
  | 'commute_alerts'
  | 'support'
  | 'share'
  | 'about'
  | 'family_soon';

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
    label: 'Friends',
    description: 'Preview trusted live sharing, meetups, and friend ETAs.',
    icon: 'people-outline',
    target: 'dashboards',
    availability: 'coming_soon',
    comingSoon: true,
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
    description: 'A-to-B route scans, traffic timing, and push notifications.',
    icon: 'navigate-outline',
    target: 'commute_alerts',
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
    id: 'family',
    label: 'Family Safety',
    description: 'Preview household safety, zones, teen insights, and SOS alerts.',
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
