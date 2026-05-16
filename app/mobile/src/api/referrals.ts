import api from './client';
import type { ApiResponse } from '../types';
import {
  parseRecentReferralList,
  parseReferralDashboard,
  type ReferralDashboard,
  type RecentReferral,
} from './dto/referrals';

export type ApplyReferralResult = {
  status: 'pending' | 'already_referred' | 'declined';
  verified: boolean;
  gemsAwarded: number;
};

export async function getMyReferrals(): Promise<ApiResponse<ReferralDashboard>> {
  const res = await api.get<unknown>('/api/referrals/me');
  if (!res.success) return { success: false, error: res.error };
  return { success: true, data: parseReferralDashboard(res.data) };
}

export async function getRecentReferrals(limit = 20): Promise<ApiResponse<RecentReferral[]>> {
  const res = await api.get<unknown>(`/api/referrals/recent?limit=${limit}`);
  if (!res.success) return { success: false, error: res.error };
  return { success: true, data: parseRecentReferralList(res.data) };
}

export async function applyReferralCode(code: string): Promise<ApiResponse<ApplyReferralResult>> {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Referral code is required' };
  }
  const res = await api.post<{
    success?: boolean;
    error?: string;
    message?: string;
    data?: {
      status?: string;
      referral_id?: string;
      verified?: boolean;
      gems_awarded?: number;
    };
  }>('/api/referrals/apply', { code: trimmed });
  if (!res.success) return { success: false, error: res.error };
  const root = res.data ?? {};
  if (root.success === false) {
    return { success: false, error: root.message ?? root.error ?? 'Referral could not be applied' };
  }
  const payload = root.data ?? {};
  const status = String(payload.status ?? 'pending').toLowerCase() as ApplyReferralResult['status'];
  return {
    success: true,
    data: {
      status: status === 'already_referred' || status === 'declined' ? status : 'pending',
      verified: Boolean(payload.verified),
      gemsAwarded: Number(payload.gems_awarded) || 0,
    },
  };
}
