import { getSupabaseClient } from '@/lib/supabaseClient'

export interface Convoy {
  id: string
  leader_id: string
  group_id: string
  destination: { lat: number; lng: number; name: string }
  member_ids: string[]
  status: 'active' | 'ended'
  created_at: string
}

function sb() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase not configured')
  return client
}

export async function startConvoy(
  leaderId: string,
  groupId: string,
  destination: { lat: number; lng: number; name: string },
  memberIds: string[]
): Promise<Convoy> {
  const { data, error } = await sb()
    .from('convoys')
    .insert({
      leader_id: leaderId,
      group_id: groupId,
      destination,
      member_ids: memberIds,
      status: 'active',
    })
    .select()
    .single()
  if (error) throw error
  return data as Convoy
}

export async function endConvoy(convoyId: string) {
  const { error } = await sb().from('convoys').update({ status: 'ended' }).eq('id', convoyId)
  if (error) throw error
}

export function subscribeToConvoy(convoyId: string, onUpdate: (convoy: Convoy) => void) {
  const client = sb()
  const channel = client
    .channel(`convoy-${convoyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'convoys',
        filter: `id=eq.${convoyId}`,
      },
      (payload) => onUpdate(payload.new as Convoy)
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}
