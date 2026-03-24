import { useState } from 'react';
import type { FriendLocation } from '../types';

export function useFriends() {
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  return {
    friendLocations,
    setFriendLocations,
    isSharingLocation,
    setIsSharingLocation,
  };
}
