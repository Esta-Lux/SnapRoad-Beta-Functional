import { useState } from 'react';
import type { Offer, Challenge, Badge } from '../types';

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  return {
    offers,
    setOffers,
    challenges,
    setChallenges,
    badges,
    setBadges,
  };
}
