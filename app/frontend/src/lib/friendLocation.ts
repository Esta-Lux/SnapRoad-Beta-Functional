import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key) {
    supabase = createClient(url, key)
    return supabase
  }
  return null
}

export interface FriendLocation {
  id: string
  name: string
  avatar?: string
  lat: number
  lng: number
  heading: number
  speedMph: number
  isNavigating: boolean
  destinationName?: string
  lastUpdated: string
  isSharing: boolean
}

// Update current user's location in real time
export async function updateMyLocation(
  userId: string,
  lat: number,
  lng: number,
  heading: number,
  speedMph: number,
  isNavigating: boolean,
  destinationName?: string
) {
  const sb = getSupabase()
  if (!sb) return
  await sb
    .from('live_locations')
    .upsert({
      user_id: userId,
      lat,
      lng,
      heading,
      speed_mph: speedMph,
      is_navigating: isNavigating,
      destination_name: destinationName ?? null,
      last_updated: new Date().toISOString(),
      is_sharing: true,
    })
}

// Subscribe to all friends' locations in real time
export function subscribeFriendLocations(
  friendIds: string[],
  onUpdate: (friend: FriendLocation) => void
) {
  if (friendIds.length === 0) return () => {}
  const sb = getSupabase()
  if (!sb) return () => {}
  const channel = sb
    .channel('friend-locations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_locations',
        filter: `user_id=in.(${friendIds.join(',')})`,
      },
      async (payload) => {
        const data = payload.new as Record<string, unknown>
        if (!data) return

        // Get friend profile
        const { data: profile } = await sb
          .from('friend_locations')
          .select('name, avatar')
          .eq('id', data.user_id)
          .single()

        const row = data as {
          user_id: string
          lat: number
          lng: number
          heading?: number
          speed_mph?: number
          is_navigating?: boolean
          destination_name?: string
          last_updated: string
          is_sharing?: boolean
        }
        onUpdate({
          id: row.user_id,
          name: (profile as { name?: string } | null)?.name ?? 'Friend',
          avatar: (profile as { avatar?: string } | null)?.avatar,
          lat: row.lat,
          lng: row.lng,
          heading: row.heading ?? 0,
          speedMph: row.speed_mph ?? 0,
          isNavigating: row.is_navigating ?? false,
          destinationName: row.destination_name,
          lastUpdated: row.last_updated,
          isSharing: row.is_sharing ?? true,
        })
      }
    )
    .subscribe()

  return () => sb.removeChannel(channel)
}

// Get initial friend locations
export async function getFriendLocations(
  friendIds: string[]
): Promise<FriendLocation[]> {
  if (!friendIds.length) return []
  const sb = getSupabase()
  if (!sb) return []

  const { data } = await sb
    .from('friend_locations')
    .select('*')
    .in('id', friendIds)
    .eq('is_sharing', true)

  return (data ?? []).map((d: Record<string, unknown>) => {
    const row = d as {
      id: string
      name?: string
      avatar?: string
      lat: number
      lng: number
      heading?: number
      speed_mph?: number
      is_navigating?: boolean
      destination_name?: string
      last_updated: string
      is_sharing?: boolean
    }
    return {
      id: row.id,
      name: row.name ?? 'Friend',
      avatar: row.avatar,
      lat: row.lat,
      lng: row.lng,
      heading: row.heading ?? 0,
      speedMph: row.speed_mph ?? 0,
      isNavigating: row.is_navigating ?? false,
      destinationName: row.destination_name,
      lastUpdated: row.last_updated,
      isSharing: row.is_sharing ?? true,
    }
  })
}

// Send a location tag to a friend
export async function sendLocationTag(
  fromUserId: string,
  toUserId: string,
  lat: number,
  lng: number,
  message?: string
) {
  const sb = getSupabase()
  if (!sb) return
  await sb
    .from('location_tags')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      lat,
      lng,
      message: message ?? 'Check out where I am!',
      created_at: new Date().toISOString(),
    })
}

// Stop sharing location
export async function stopSharingLocation(userId: string) {
  const sb = getSupabase()
  if (!sb) return
  await sb
    .from('live_locations')
    .update({ is_sharing: false })
    .eq('user_id', userId)
}
