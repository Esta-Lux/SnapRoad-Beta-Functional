/**
 * Persistent off-route evidence before triggering reroute (avoids single noisy GPS ticks).
 */

export type OffRouteState = {
  count: number;
  rerouteTriggeredAt: number | null;
};

export type OffRouteDecision = OffRouteState & { shouldReroute: boolean };

export function nextOffRouteState(args: {
  prev: OffRouteState;
  distanceToRouteMeters: number;
  confidence: number;
  now: number;
}): OffRouteDecision {
  const severe = args.distanceToRouteMeters > 45 && args.confidence < 0.65;
  const moderate = args.distanceToRouteMeters > 30 && args.confidence < 0.55;
  let count = args.prev.count;
  if (severe) count += 1;
  else if (moderate) count += 0.5;
  else count = Math.max(0, count - 1);

  const shouldReroute = count >= 3;
  return {
    count,
    rerouteTriggeredAt: shouldReroute ? args.now : args.prev.rerouteTriggeredAt,
    shouldReroute,
  };
}
