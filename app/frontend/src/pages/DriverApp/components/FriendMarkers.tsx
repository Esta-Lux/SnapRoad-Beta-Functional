import { useEffect, useRef } from 'react'
import type { FriendLocation } from '@/lib/friendLocation'

// DEPRECATED: Google Maps integration removed.
interface Props {
  friends: FriendLocation[]
  map: unknown
  onFriendClick: (friend: FriendLocation) => void
}

export default function FriendMarkers({
  friends: _friends,
  map: _map,
  onFriendClick: _onFriendClick,
}: Props) {
  const markersRef = useRef<Map<string, unknown>>(new Map())
  useEffect(() => {
    markersRef.current.clear()
  }, [])

  return null
}
