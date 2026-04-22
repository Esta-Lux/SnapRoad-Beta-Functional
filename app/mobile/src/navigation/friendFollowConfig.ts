/**
 * Mid-trip reroute when navigating to a friend with live location sharing.
 * Tuned to ~2s live location publishes: small enough to keep the polyline
 * tied to the friend, with a floor to avoid Mapbox / native reroute thrash.
 */
/** Ignore sub-noise movement (GPS + map jitter). */
export const FRIEND_FOLLOW_REROUTE_MIN_MOVE_M = 45;
/** Default minimum gap between follow reroutes (ms). */
export const FRIEND_FOLLOW_REROUTE_MIN_INTERVAL_MS = 8_000;
/**
 * If the friend’s reported point jumped this far (e.g. highway / correction),
 * allow a quicker reroute so the line doesn’t stay wrong for a full interval.
 */
export const FRIEND_FOLLOW_REROUTE_LONG_JUMP_M = 220;
/** When applying a “long jump” reroute, still keep a short debounce. */
export const FRIEND_FOLLOW_REROUTE_LONG_JUMP_MIN_INTERVAL_MS = 2_500;
