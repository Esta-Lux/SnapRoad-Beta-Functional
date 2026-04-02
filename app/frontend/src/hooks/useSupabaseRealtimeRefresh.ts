import { useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

type TableSubscription = {
  table: string
  filter?: string
}

export function useSupabaseRealtimeRefresh(
  channelName: string,
  tables: TableSubscription[],
  onRefresh: () => void,
) {
  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase || tables.length === 0) return

    const channel = supabase.channel(channelName)
    tables.forEach(({ table, filter }) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => onRefresh(),
      )
    })

    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, onRefresh, tables])
}
