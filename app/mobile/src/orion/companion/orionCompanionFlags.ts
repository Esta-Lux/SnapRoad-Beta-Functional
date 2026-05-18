/** Orion V1 proactive companion (event-driven lines). Default off until QA. */
export function orionCompanionV1Enabled(): boolean {
  const raw = String(process.env.EXPO_PUBLIC_ORION_COMPANION_V1 ?? '0').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}
