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

/**
 * When `useStableText` runs under headless `navSdkDrivesContent`, the native SDK
 * can emit tiny single-frame diffs. A longer hold (~1s) matches bumper-to-bumper
 * driving better than the default 120ms without feeling mushy on real step
 * changes (those reset the key and flush immediately).
 */
export const TURN_TEXT_STABLE_SDK_MS = 960;

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
 *     {@code dwellMs} of dwell.
 *
 * Mirrors the behaviour of `useStableText` in `TurnInstructionCard` so the
 * hook is a thin wrapper over this pure core.
 */
export function resolveStableText(
  prev: StableTextState,
  incomingRaw: string | null | undefined,
  resetKey: string | number,
  nowMs: number,
  dwellMs: number = TEXT_STABLE_MS,
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
    if (nowMs - prev.pendingSince >= dwellMs) {
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

// ── Turn card: native SDK distance smoothing (0–5 mph bounce) ──────────────

const MANEUVER_DIST_LOW_SPD_MPH = 5.5;
/** Last ~100 ft: 3 m steps; then 6 m; then 10 m (stops 45↔52 m GPS bounce in a jam). */
function crawlDisplayBucketMeters(rawM: number): number {
  if (rawM < 20) {
    return Math.round(rawM / 3) * 3;
  }
  if (rawM < 55) {
    return Math.round(rawM / 6) * 6;
  }
  return Math.round(rawM / 10) * 10;
}
const MANEUVER_DIST_CRAWL_HOLD_MS = 750;
const MANEUVER_DIST_CRAWL_INSTANT_M = 28;
const MANEUVER_DIST_CRUISE_EMA = 0.4;
const MANEUVER_DIST_CRUISE_EPS_M = 1.0;

export type ManeuverDisplayMetersState = {
  displayed: number;
  lastCommitAt: number;
  stepKey: string;
};

/**
 * Dampen {@code primaryDistanceMeters} noise before {@link formatImperialManeuverDistance}:
 * at crawl, bucket in 5m steps and time-gate; at speed, a light EMA + epsilon gate.
 * Large jumps (reroute) commit immediately. Step key change resets the snapshot.
 */
// ── ETA strip: remaining miles + minutes (NavigationStatusStrip) ───────────

export type StripProgressSnap = {
  milesPacked: number;
  minsPacked: number;
  updatedAt: number;
};

/** Align with {@link useDriveNavigation} `liveEta` coarse packing. */
function packStripMiles(m: number): number {
  return Math.round(Math.max(0, m) * 20) / 20;
}

function packStripMin(t: number): number {
  return Math.round(Math.max(0, t) * 4) / 4;
}

/** Min time between visible strip updates when packed values nudge (traffic jitter). */
export const STRIP_PROGRESS_DWELL_MS = 1400;
/** Commit immediately when native reports a large change (reroute, big traffic swing). */
export const STRIP_MI_JUMP = 0.22;
export const STRIP_MIN_JUMP = 2.5;

/**
 * Stabilize remaining distance + time on the nav strip. Native `distanceRemaining` /
 * `durationRemaining` can flutter every progress tick; this holds the last readable pair
 * unless packed values move meaningfully or a dwell elapses.
 */
export function resolveStableStripProgress(
  prev: StripProgressSnap | null,
  rawMiles: number,
  rawMinutes: number,
  nowMs: number,
): StripProgressSnap {
  const pm = packStripMiles(rawMiles);
  const pt = packStripMin(rawMinutes);
  if (!prev) {
    return { milesPacked: pm, minsPacked: pt, updatedAt: nowMs };
  }
  const bigJump =
    Math.abs(pm - prev.milesPacked) >= STRIP_MI_JUMP ||
    Math.abs(pt - prev.minsPacked) >= STRIP_MIN_JUMP;
  if (bigJump) {
    return { milesPacked: pm, minsPacked: pt, updatedAt: nowMs };
  }
  const samePacked =
    Math.abs(pm - prev.milesPacked) < 1e-9 && Math.abs(pt - prev.minsPacked) < 1e-9;
  if (samePacked) {
    return prev;
  }
  if (nowMs - prev.updatedAt < STRIP_PROGRESS_DWELL_MS) {
    return prev;
  }
  return { milesPacked: pm, minsPacked: pt, updatedAt: nowMs };
}

export function resolveStableManeuverDisplayMeters(
  prev: ManeuverDisplayMetersState | null,
  rawM: number,
  nowMs: number,
  stepKey: string,
  speedMph: number,
): ManeuverDisplayMetersState {
  if (!Number.isFinite(rawM) || rawM < 0) {
    return prev ?? { displayed: 0, lastCommitAt: nowMs, stepKey };
  }
  if (!prev || stepKey !== prev.stepKey) {
    return { displayed: rawM, lastCommitAt: nowMs, stepKey };
  }
  if (Math.abs(rawM - prev.displayed) > MANEUVER_DIST_CRAWL_INSTANT_M) {
    return { displayed: rawM, lastCommitAt: nowMs, stepKey };
  }

  if (speedMph < MANEUVER_DIST_LOW_SPD_MPH) {
    const b = crawlDisplayBucketMeters(rawM);
    if (Math.abs(b - prev.displayed) < 0.1) {
      return prev;
    }
    // Monotonic close-in: do not add a 750ms lag while actually approaching the maneuver.
    if (b < prev.displayed - 0.1 && nowMs - prev.lastCommitAt >= 220) {
      return { displayed: b, lastCommitAt: nowMs, stepKey };
    }
    if (nowMs - prev.lastCommitAt < MANEUVER_DIST_CRAWL_HOLD_MS) {
      return prev;
    }
    return { displayed: b, lastCommitAt: nowMs, stepKey };
  }

  const blended = prev.displayed * (1 - MANEUVER_DIST_CRUISE_EMA) + rawM * MANEUVER_DIST_CRUISE_EMA;
  if (Math.abs(blended - prev.displayed) < MANEUVER_DIST_CRUISE_EPS_M) {
    return prev;
  }
  return { displayed: blended, lastCommitAt: nowMs, stepKey };
}
