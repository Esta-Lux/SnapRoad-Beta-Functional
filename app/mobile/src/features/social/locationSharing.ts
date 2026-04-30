import {
  type FriendLiveShareMode,
  normalizeFriendLiveShareMode,
} from '../../location/friendLiveShareConfig';

export type ApiResultLike = {
  success: boolean;
  error?: string;
};

export type LocationSharingState = {
  isSharing: boolean;
  sharingMode: FriendLiveShareMode;
};

function getPayloadObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const top = payload as { data?: unknown };
  if (top.data && typeof top.data === 'object') return top.data as Record<string, unknown>;
  return payload as Record<string, unknown>;
}

export function extractLocationSharingValue(payload: unknown): boolean | null {
  const obj = getPayloadObject(payload);
  return typeof obj?.is_sharing === 'boolean' ? obj.is_sharing : null;
}

export function extractLocationSharingState(payload: unknown): LocationSharingState | null {
  const obj = getPayloadObject(payload);
  if (typeof obj?.is_sharing !== 'boolean') return null;
  return {
    isSharing: obj.is_sharing,
    sharingMode: normalizeFriendLiveShareMode(obj.sharing_mode, obj.is_sharing),
  };
}

export function getApiErrorMessage(res: ApiResultLike, fallback: string): string | null {
  if (res.success) return null;
  return (typeof res.error === 'string' && res.error.trim()) ? res.error : fallback;
}
