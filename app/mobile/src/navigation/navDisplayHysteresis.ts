/**
 * Presentation-layer hysteresis helpers for the nav HUD.
 *
 * These killed the "Apple Maps vs fighting JS map" feel: the digits the driver
 * reads (arrival hh:mm, speed mph) were re-deriving from live native progress
 * every tick. Native `durationRemaining` drifts by a few seconds per tick even
 * under steady driving (route-graph refinements, traffic edges) so naive
 * `Date.now() + durRem*1000` crossed minute boundaries multiple times per
 * minute, flipping the displayed arrival. Apple Maps holds the minute steady
 * unless the ETA is **definitively** in a new minute.
 *
 * Both helpers are framework-agnostic pure functions that take a previous
 * "displayed" snapshot + a candidate and return the next snapshot. That keeps
 * them unit-testable without a React renderer and lets callers store the
 * snapshot in whatever state primitive they prefer (`useRef`, Redux, etc.).
 */

/** Arrival-minute hysteresis knobs. */
export const ARRIVAL_DWELL_MS = 2000;
export const ARRIVAL_JUMP_MS = 120_000;

export type ArrivalDisplay = {
  /** Epoch ms last committed to the UI. */
  epoch: number;
  /** Wall-clock ms when the commit happened (dwell guard). */
  updatedAt: number;
};

/**
 * Decide whether to commit a new arrival epoch.
 *
 * Rules (in order):
 *   1. No previous snapshot → commit immediately (first mount).
 *   2. |new − prev| > {@link ARRIVAL_JUMP_MS} → reroute / traffic jump, commit.
 *   3. Different minute AND ≥ {@link ARRIVAL_DWELL_MS} since last commit → commit.
 *   4. Otherwise → hold previous snapshot (prevents minute ping-pong).
 */
export function resolveStableArrival(
  prev: ArrivalDisplay | null,
  rawEpochMs: number,
  nowMs: number,
): ArrivalDisplay {
  if (!Number.isFinite(rawEpochMs)) {
    return prev ?? { epoch: rawEpochMs, updatedAt: nowMs };
  }
  if (!prev) {
    return { epoch: rawEpochMs, updatedAt: nowMs };
  }
  const jump = Math.abs(rawEpochMs - prev.epoch);
  if (jump > ARRIVAL_JUMP_MS) {
    return { epoch: rawEpochMs, updatedAt: nowMs };
  }
  const sameMinute =
    Math.floor(rawEpochMs / 60_000) === Math.floor(prev.epoch / 60_000);
  const dwellOk = nowMs - prev.updatedAt >= ARRIVAL_DWELL_MS;
  if (!sameMinute && dwellOk) {
    return { epoch: rawEpochMs, updatedAt: nowMs };
  }
  return prev;
}

/** Speed-mph hysteresis knobs. */
export const SPEED_MPH_DELTA = 1.2;

/**
 * Commit a new rounded mph only when it differs from the current displayed
 * value by at least {@link SPEED_MPH_DELTA}. Kills the X ↔ X+1 flip on sub-mph
 * GPS noise without adding visible lag (actual acceleration deltas far exceed
 * the threshold within ~1 s).
 *
 * Invalid readings (non-finite or negative) are treated as unknown and hold
 * the previous displayed value — Apple Maps' speed badge never blanks on a
 * single bad GPS fix, and neither should ours.
 */
export function resolveStableSpeedMph(
  prevDisplayed: number,
  rawMph: number,
): number {
  if (!Number.isFinite(rawMph) || rawMph < 0) return prevDisplayed;
  if (Math.abs(rawMph - prevDisplayed) >= SPEED_MPH_DELTA) {
    return Math.round(rawMph);
  }
  return prevDisplayed;
}

/** Minimum dwell for the turn card primary / secondary text to commit. */
export const TEXT_STABLE_MS = 120;

export type StableTextState = {
  displayed: string;
  pending: string | null;
  pendingSince: number;
  resetKey: string | number;
};

/**
 * Decide the next committed text + pending-candidate state.
 *
 * Semantics:
 *   - `resetKey` change (real step transition) → accept `incoming` immediately
 *     (or keep displayed if incoming is empty).
 *   - Empty `incoming` → never blank the card; keep displayed.
 *   - Same `incoming` as displayed → cancel pending.
 *   - Different non-empty `incoming` with no prior displayed → commit.
 *   - New candidate → start or refresh a pending window; commit after
 *     {@link TEXT_STABLE_MS} of dwell.
 *
 * Mirrors the behaviour of `useStableText` in `TurnInstructionCard` so the
 * hook is a thin wrapper over this pure core.
 */
export function resolveStableText(
  prev: StableTextState,
  incomingRaw: string | null | undefined,
  resetKey: string | number,
  nowMs: number,
): StableTextState {
  const incoming = (incomingRaw ?? '').trim();

  if (resetKey !== prev.resetKey) {
    return {
      displayed: incoming || prev.displayed,
      pending: null,
      pendingSince: 0,
      resetKey,
    };
  }
  if (!incoming) {
    return prev;
  }
  if (incoming === prev.displayed) {
    if (prev.pending != null) {
      return { ...prev, pending: null, pendingSince: 0 };
    }
    return prev;
  }
  if (!prev.displayed) {
    return { displayed: incoming, pending: null, pendingSince: 0, resetKey };
  }
  if (prev.pending === incoming) {
    if (nowMs - prev.pendingSince >= TEXT_STABLE_MS) {
      return { displayed: incoming, pending: null, pendingSince: 0, resetKey };
    }
    return prev;
  }
  return {
    displayed: prev.displayed,
    pending: incoming,
    pendingSince: nowMs,
    resetKey,
  };
}
