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

export interface Race {
  id: string
  creator_id: string
  challenger_id: string
  route_polyline: { lat: number; lng: number }[]
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  status: 'pending' | 'active' | 'finished'
  creator_score?: number
  challenger_score?: number
  creator_time_seconds?: number
  challenger_time_seconds?: number
  gems_wagered: number
  created_at: string
}

export async function createRace(
  creatorId: string,
  challengerId: string,
  routePolyline: { lat: number; lng: number }[],
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  gemsWagered: number
): Promise<Race> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const { data, error } = await sb
    .from('races')
    .insert({
      creator_id: creatorId,
      challenger_id: challengerId,
      route_polyline: routePolyline,
      origin,
      destination,
      gems_wagered: gemsWagered,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data as Race
}

export async function submitRaceResult(raceId: string, userId: string, timeSeconds: number, score: number) {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const race = await sb.from('races').select('*').eq('id', raceId).single()
  const isCreator = (race.data as any)?.creator_id === userId
  const patch = isCreator
    ? { creator_time_seconds: timeSeconds, creator_score: score }
    : { challenger_time_seconds: timeSeconds, challenger_score: score }
  const { error } = await sb.from('races').update(patch).eq('id', raceId)
  if (error) throw error
}

export function subscribeToRace(raceId: string, onUpdate: (race: Race) => void) {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channel = sb
    .channel(`race-${raceId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'races',
        filter: `id=eq.${raceId}`,
      },
      (payload) => onUpdate(payload.new as Race)
    )
    .subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}

export async function listFinishedRacesForUser(userId: string, limit = 20): Promise<Race[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('races')
    .select('*')
    .or(`creator_id.eq.${userId},challenger_id.eq.${userId}`)
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data as Race[]) ?? []
}

