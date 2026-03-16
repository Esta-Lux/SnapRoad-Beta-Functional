import { useEffect, useRef } from 'react'
import type { FriendLocation } from '@/lib/friendLocation'

interface Props {
  friends: FriendLocation[]
  map: google.maps.Map | null
  onFriendClick: (friend: FriendLocation) => void
}

export default function FriendMarkers({
  friends,
  map,
  onFriendClick,
}: Props) {
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())

  useEffect(() => {
    if (!map) return

    friends.forEach((friend) => {
      if (!friend.isSharing) {
        const existing = markersRef.current.get(friend.id)
        if (existing) {
          existing.setMap(null)
          markersRef.current.delete(friend.id)
        }
        return
      }

      const existing = markersRef.current.get(friend.id)
      const initials = friend.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      const statusColor = friend.isNavigating ? '#007AFF' : '#34C759'

      const navBadge = friend.isNavigating
        ? `<circle cx="38" cy="10" r="7" fill="#FF9500" stroke="white" stroke-width="1.5"/>
            <text x="38" y="14" text-anchor="middle" fill="white" font-size="8">▶</text>`
        : ''
      const speedBadge =
        friend.speedMph > 5
          ? `<rect x="14" y="34" width="20" height="10" rx="5" fill="rgba(0,0,0,0.7)"/>
            <text x="24" y="42" text-anchor="middle" fill="white" font-size="7" font-weight="600">${Math.round(friend.speedMph)} mph</text>`
          : ''

      const svgIcon = `<svg width="48" height="56" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="54" rx="10" ry="3" fill="rgba(0,0,0,0.2)"/>
        <path d="M24 2 C13 2 4 11 4 22 C4 36 24 54 24 54 C24 54 44 36 44 22 C44 11 35 2 24 2Z" fill="${statusColor}" stroke="white" stroke-width="2"/>
        <circle cx="24" cy="22" r="14" fill="white"/>
        <text x="24" y="27" text-anchor="middle" fill="${statusColor}" font-size="11" font-weight="700" font-family="system-ui">${initials}</text>
        ${navBadge}
        ${speedBadge}
      </svg>`

      const icon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
        scaledSize: new google.maps.Size(48, 56),
        anchor: new google.maps.Point(24, 54),
      }

      if (existing) {
        animateMarker(existing, { lat: friend.lat, lng: friend.lng }, 1000)
        existing.setIcon(icon)
      } else {
        const marker = new google.maps.Marker({
          position: { lat: friend.lat, lng: friend.lng },
          map,
          icon,
          title: friend.name,
          zIndex: 200,
          optimized: false,
        })
        marker.addListener('click', () => onFriendClick(friend))
        markersRef.current.set(friend.id, marker)
      }
    })

    markersRef.current.forEach((marker, id) => {
      if (!friends.find((f) => f.id === id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
      }
    })
  }, [friends, map, onFriendClick])

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current.clear()
    }
  }, [])

  return null
}

function animateMarker(
  marker: google.maps.Marker,
  newPos: { lat: number; lng: number },
  duration = 1000
) {
  const start = marker.getPosition()
  if (!start) {
    marker.setPosition(newPos)
    return
  }
  const startLat = start.lat()
  const startLng = start.lng()
  const startTime = Date.now()
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    marker.setPosition({
      lat: startLat + (newPos.lat - startLat) * ease,
      lng: startLng + (newPos.lng - startLng) * ease,
    })
    if (progress < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}
