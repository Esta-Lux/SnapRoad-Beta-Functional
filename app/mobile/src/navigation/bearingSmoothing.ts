/** Smallest signed difference a → b in degrees (-180, 180]. */
export function shortestAngleDeltaDeg(fromDeg: number, toDeg: number): number {
  if (!Number.isFinite(fromDeg) || !Number.isFinite(toDeg)) return 0;
  let d = toDeg - fromDeg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Step current toward target with max step (degrees), crossing 0/360 safely. */
export function clampStepTowardDeg(current: number, target: number, maxStepDeg: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || maxStepDeg <= 0) return current;
  const d = shortestAngleDeltaDeg(current, target);
  if (Math.abs(d) <= maxStepDeg) return ((target % 360) + 360) % 360;
  const step = Math.sign(d) * maxStepDeg;
  let n = current + step;
  n = ((n % 360) + 360) % 360;
  return n;
}

/** Linear interp on circle (t in 0..1). */
export function lerpAngleDeg(from: number, to: number, t: number): number {
  const tt = Math.max(0, Math.min(1, t));
  const d = shortestAngleDeltaDeg(from, to);
  let n = from + d * tt;
  n = ((n % 360) + 360) % 360;
  return n;
}
