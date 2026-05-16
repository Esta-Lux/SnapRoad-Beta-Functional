type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' ? (v as UnknownRecord) : null;
}

export function unwrapApiData(payload: unknown): unknown {
  const root = asRecord(payload);
  if (!root) return payload;
  const data = root.data;
  const nested = asRecord(data);
  if (nested && 'data' in nested) return nested.data;
  return data ?? payload;
}

export type ReferralStatus = 'pending' | 'verified' | 'declined';

export type ReferralAchievement = {
  key: string;
  label: string;
  requirement: number;
  unlocked: boolean;
};

export type RecentReferral = {
  email: string;
  joinedAt: string | null;
  status: ReferralStatus;
  gemsAwarded: number;
};

export type ReferralDashboard = {
  code: string;
  inviteUrl: string;
  invitedCount: number;
  verifiedCount: number;
  pendingCount: number;
  declinedCount: number;
  gemsEarned: number;
  rewardPerSignup: number;
  nextRewardTarget: number | null;
  nextRewardLabel: string | null;
  progressPercent: number;
  achievements: ReferralAchievement[];
  recentReferrals: RecentReferral[];
};

const ALLOWED_STATUSES: ReferralStatus[] = ['pending', 'verified', 'declined'];

function toStatus(value: unknown): ReferralStatus {
  const raw = String(value ?? '').toLowerCase().trim();
  return (ALLOWED_STATUSES as string[]).includes(raw) ? (raw as ReferralStatus) : 'pending';
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toStringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function pickJoinedAt(root: UnknownRecord): string | null {
  if (typeof root.joined_at === 'string') return root.joined_at;
  if (typeof root.verified_at === 'string') return root.verified_at;
  if (typeof root.created_at === 'string') return root.created_at;
  return null;
}

export function parseRecentReferral(payload: unknown): RecentReferral {
  const root = asRecord(payload) ?? {};
  return {
    email: toStringOr(root.email, ''),
    joinedAt: pickJoinedAt(root),
    status: toStatus(root.status),
    gemsAwarded: toInt(root.gems_awarded, 0),
  };
}

export function parseRecentReferralList(payload: unknown): RecentReferral[] {
  const unwrapped = unwrapApiData(payload);
  const list = Array.isArray(unwrapped) ? unwrapped : [];
  return list.map(parseRecentReferral);
}

function parseAchievement(payload: unknown): ReferralAchievement | null {
  const root = asRecord(payload);
  if (!root) return null;
  const key = toStringOr(root.key, '');
  const label = toStringOr(root.label, '');
  if (!key || !label) return null;
  return {
    key,
    label,
    requirement: toInt(root.requirement, 0),
    unlocked: Boolean(root.unlocked),
  };
}

export function parseReferralDashboard(payload: unknown): ReferralDashboard {
  const root = asRecord(unwrapApiData(payload)) ?? {};
  const achievementsRaw = Array.isArray(root.achievements) ? root.achievements : [];
  const achievements = achievementsRaw
    .map(parseAchievement)
    .filter((v): v is ReferralAchievement => v != null);
  const recentRaw = Array.isArray(root.recent_referrals) ? root.recent_referrals : [];
  return {
    code: toStringOr(root.code, ''),
    inviteUrl: toStringOr(root.invite_url, ''),
    invitedCount: toInt(root.invited_count, 0),
    verifiedCount: toInt(root.verified_count, 0),
    pendingCount: toInt(root.pending_count, 0),
    declinedCount: toInt(root.declined_count, 0),
    gemsEarned: toInt(root.gems_earned, 0),
    rewardPerSignup: toInt(root.reward_per_signup, 100),
    nextRewardTarget:
      root.next_reward_target == null || root.next_reward_target === ''
        ? null
        : toInt(root.next_reward_target, 0),
    nextRewardLabel: typeof root.next_reward_label === 'string' ? root.next_reward_label : null,
    progressPercent: Math.max(0, Math.min(100, toInt(root.progress_percent, 0))),
    achievements,
    recentReferrals: recentRaw.map(parseRecentReferral),
  };
}

export function formatStatusLabel(status: ReferralStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'declined':
      return 'Declined';
    case 'pending':
    default:
      return 'Pending';
  }
}
