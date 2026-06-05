import {
  navLogicDebugEnabled,
  navLogicSdkEnabled,
  navNativeFullScreenEnabled,
  navNativeSdkEnabled,
} from './navFeatureFlags';

let lastLogMs = 0;

/**
 * Throttled console snapshot when `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` (release EAS or local Metro).
 */
export function logNavLogicSnapshot(reason: string, extra?: Record<string, unknown>) {
  if (!navLogicDebugEnabled()) return;
  const now = Date.now();
  if (now - lastLogMs < 1200 && reason !== 'mount') return;
  lastLogMs = now;
  const flags = {
    EXPO_PUBLIC_NAV_LOGIC_SDK: process.env.EXPO_PUBLIC_NAV_LOGIC_SDK,
    EXPO_PUBLIC_NAV_NATIVE_SDK: process.env.EXPO_PUBLIC_NAV_NATIVE_SDK,
    navLogicSdkEnabled: navLogicSdkEnabled(),
    navNativeSdkEnabled: navNativeSdkEnabled(),
    navNativeFullScreenEnabled: navNativeFullScreenEnabled(),
  };
  // eslint-disable-next-line no-console
  console.log('[NavLogicDebug]', reason, flags, extra ?? {});
}

/**
 * Per-category throttle for the verification NDJSON logger. Keyed by the
 * `channel` argument so bearing, projection, render, and provider emit
 * independently without drowning each other out.
 */
const lastVerifyLogByChannel: Record<string, number> = {};
const VERIFY_THROTTLE_MS: Record<string, number> = {
  bearing: 750,
  projection: 750,
  'render.polyline': 1500,
  'provider.mount': 1500,
  'reroute.handoff': 0,
  'transition.sdk_ingest': 300,
  'transition.route_change': 0,
  'transition.guidance_identity': 0,
  'transition.turn_card_render': 300,
  'transition.orion_event': 0,
  'transition.speech_decision': 0,
};

export type NavTransitionTraceChannel =
  | 'sdk_ingest'
  | 'route_change'
  | 'guidance_identity'
  | 'turn_card_render'
  | 'orion_event'
  | 'speech_decision';

export type NavTransitionTraceEvent = {
  tripId?: string | null;
  sdkPhase?: string | null;
  legIndex?: number | null;
  stepIndex?: number | null;
  instructionSource?: 'sdk' | 'sdk_waiting' | 'js' | 'unknown' | string | null;
  distanceToManeuverM?: number | null;
  instruction?: string | null;
  orionEventType?: string | null;
  speechAllowed?: boolean | null;
  speechReason?: string | null;
  guidanceStepIdentity?: string | null;
  criticalTurnTransition?: boolean | null;
  [key: string]: unknown;
};

let transitionSeq = 0;

/**
 * NDJSON-style single-line log for runtime verification of the navigation
 * plan (camera heading, polyline authority, projection hysteresis, reroute
 * handoff). Gated on the same `EXPO_PUBLIC_NAV_LOGIC_DEBUG=1` flag used for
 * `logNavLogicSnapshot` so no cost in production. Emit one `[NavVerify]`
 * line per event; readers can `grep '^\[NavVerify\]' | cut -d' ' -f2- | jq`
 * to get structured JSON. Throttled per-channel to keep the log usable
 * during a real trip.
 */
export function logNavVerify(
  channel:
    | 'bearing'
    | 'projection'
    | 'render.polyline'
    | 'provider.mount'
    | 'reroute.handoff'
    | `transition.${NavTransitionTraceChannel}`,
  payload: Record<string, unknown>,
): void {
  if (!navLogicDebugEnabled()) return;
  const now = Date.now();
  const throttle = VERIFY_THROTTLE_MS[channel] ?? 1000;
  const last = lastVerifyLogByChannel[channel] ?? 0;
  if (throttle > 0 && now - last < throttle) return;
  lastVerifyLogByChannel[channel] = now;
  const line = JSON.stringify({ ts: now, channel, ...payload });
  // eslint-disable-next-line no-console
  console.log('[NavVerify]', line);
}

export function logNavTransition(
  channel: NavTransitionTraceChannel,
  payload: NavTransitionTraceEvent = {},
): void {
  if (!navLogicDebugEnabled()) return;
  transitionSeq += 1;
  logNavVerify(`transition.${channel}`, {
    seq: transitionSeq,
    ...payload,
  });
}

export function resetNavTransitionTraceForTests(): void {
  transitionSeq = 0;
  Object.keys(lastVerifyLogByChannel).forEach((key) => {
    delete lastVerifyLogByChannel[key];
  });
}
