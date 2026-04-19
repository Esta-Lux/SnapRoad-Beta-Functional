import { api } from '../../api/client';
import type { Friend, FriendCategory } from '../../types';
import { normalizeFriendFromApi } from '../../lib/friendPresence';

export type PendingIncoming = { id: string; from_user_id: string; from_name?: string; from_email?: string };
export type PendingOutgoing = { id: string; to_user_id: string; to_name?: string };

/** Single place for Friends dashboard list fetch + normalization. */
export async function fetchFriendsNormalized(): Promise<Friend[]> {
  try {
    const res = await api.get<unknown>('/api/friends/list');
    if (!res.success) return [];
    const envelope = res.data as { data?: unknown };
    const data = envelope?.data ?? res.data;
    const raw = Array.isArray(data) ? data : [];
    return raw.map((row: Record<string, unknown>) => normalizeFriendFromApi(row));
  } catch {
    return [];
  }
}

export async function fetchPendingRequests(): Promise<{ incoming: PendingIncoming[]; outgoing: PendingOutgoing[] }> {
  try {
    const [inc, out] = await Promise.all([
      api.get<unknown>('/api/friends/requests'),
      api.get<unknown>('/api/friends/requests/sent'),
    ]);
    const idata = inc.success ? ((inc.data as { data?: unknown })?.data ?? inc.data) : [];
    const odata = out.success ? ((out.data as { data?: unknown })?.data ?? out.data) : [];
    return {
      incoming: Array.isArray(idata) ? (idata as PendingIncoming[]) : [],
      outgoing: Array.isArray(odata) ? (odata as PendingOutgoing[]) : [],
    };
  } catch {
    return { incoming: [], outgoing: [] };
  }
}

export async function fetchFriendCategories(): Promise<FriendCategory[]> {
  try {
    const res = await api.get<unknown>('/api/friends/categories');
    if (!res.success) return [];
    const data = (res.data as { data?: unknown })?.data ?? res.data;
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row) => ({
        id: String((row as { id?: unknown }).id ?? ''),
        name: String((row as { name?: unknown }).name ?? 'Category'),
        color: typeof (row as { color?: unknown }).color === 'string' ? (row as { color: string }).color : '#3B82F6',
        friend_count: Number.isFinite(Number((row as { friend_count?: unknown }).friend_count))
          ? Number((row as { friend_count?: unknown }).friend_count)
          : 0,
      }))
      .filter((c) => c.id);
  } catch {
    return [];
  }
}
