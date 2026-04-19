import type { FriendLocation } from '@/lib/friendLocation'

interface Props {
  friend: FriendLocation
  onClose: () => void
  onNavigateToFriend: (friend: FriendLocation) => void
  onTagFriend: (friend: FriendLocation) => void
  onFollow: (friend: FriendLocation) => void
  isFollowing: boolean
}

export default function FriendCard({
  friend,
  onClose,
  onNavigateToFriend,
  onTagFriend,
  onFollow,
  isFollowing,
}: Props) {
  const initials = friend.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const lastSeenText = () => {
    const diff = Date.now() - new Date(friend.lastUpdated).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1500,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Card */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1501,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4,
          background: '#E0E0E0',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {/* Friend info header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          gap: 14,
        }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56,
            borderRadius: 28,
            background: friend.isNavigating
              ? '#007AFF'
              : '#34C759',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: 'white',
            flexShrink: 0,
            border: '3px solid white',
            boxShadow: `0 0 0 2px ${friend.isNavigating ? '#007AFF' : '#34C759'}`,
          }}>
            {friend.avatar ? (
              <img
                src={friend.avatar}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : initials}
          </div>

          {/* Name and status */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1a1a1a',
            }}>
              {friend.name}
            </div>
            <div style={{
              fontSize: 13,
              color: '#666',
              marginTop: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {friend.isNavigating ? (
                <>
                  <span style={{
                    width: 8, height: 8,
                    borderRadius: 4,
                    background: '#007AFF',
                    display: 'inline-block',
                    animation: 'sr-pulse-blue 1.5s infinite',
                  }} />
                  <span style={{ color: '#007AFF', fontWeight: 600 }}>
                    Navigating
                  </span>
                  {friend.destinationName && (
                    <span>to {friend.destinationName}</span>
                  )}
                </>
              ) : friend.speedMph > 3 ? (
                <>
                  <span style={{
                    width: 8, height: 8,
                    borderRadius: 4,
                    background: '#34C759',
                    display: 'inline-block',
                  }} />
                  <span style={{ color: '#34C759', fontWeight: 600 }}>
                    Driving
                  </span>
                  <span>
                    {Math.round(friend.speedMph)} mph
                  </span>
                </>
              ) : (
                <>
                  <span style={{
                    width: 8, height: 8,
                    borderRadius: 4,
                    background: '#8E8E93',
                    display: 'inline-block',
                  }} />
                  <span>Stationary • {lastSeenText()}</span>
                </>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32,
              borderRadius: 16,
              background: '#f5f5f7',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          padding: '0 20px 12px',
        }}>
          {/* Navigate to friend */}
          <button
            type="button"
            onClick={() => onNavigateToFriend(friend)}
            style={{
              height: 52,
              background: 'linear-gradient(135deg, #007AFF, #0055CC)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
            }}
          >
            ➤ Navigate to {friend.name.split(' ')[0]}
          </button>

          {/* Follow / Unfollow */}
          <button
            type="button"
            onClick={() => onFollow(friend)}
            style={{
              height: 52,
              background: isFollowing ? '#f5f5f7' : '#34C75915',
              color: isFollowing ? '#666' : '#34C759',
              border: `1.5px solid ${isFollowing ? '#e0e0e0' : '#34C759'}`,
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isFollowing ? '👁 Following' : '👁 Follow'}
          </button>
        </div>

        {/* Tag location button */}
        <div style={{ padding: '0 20px 16px' }}>
          <button
            type="button"
            onClick={() => onTagFriend(friend)}
            style={{
              width: '100%',
              height: 46,
              background: '#FF950015',
              color: '#FF9500',
              border: '1.5px solid #FF9500',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            📍 Tag My Location to {friend.name.split(' ')[0]}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sr-pulse-blue {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </>
  )
}
