/**
 * Trip end card + `/api/trips/complete` merge target.
 * Lives in `types/` so `tripComplete.ts` avoids importing the navigation hook module.
 */

export interface TripSummary {
  distance: number;
  /** Minutes */
  duration: number;
  duration_seconds?: number;
  safety_score: number;
  gems_earned: number;
  xp_earned: number;
  origin: string;
  destination: string;
  date: string;
  started_at?: string;
  ended_at?: string;
  avg_speed_mph?: number;
  /** Smoothed peak speed observed during the trip (mph). */
  max_speed_mph?: number;
  fuel_used_gallons?: number;
  fuel_cost_estimate?: number;
  mileage_value_estimate?: number;
  /** Real safety-event counts forwarded to backend; 0 when not tracked. */
  hard_braking_events?: number;
  hard_acceleration_events?: number;
  speeding_events?: number;
  incidents_reported?: number;
  /** False = trip sheet still shows, but drive did not meet min distance/time for rewards. */
  counted?: boolean;
  /** Auto-ended at destination — show “You’ve arrived” hero in trip sheet. */
  arrivedAtDestination?: boolean;
  /** Authoritative profile totals after /api/trips/complete (when returned). */
  profile_totals?: {
    total_miles?: number;
    total_trips?: number;
    gems?: number;
    xp?: number;
    level?: number;
    safety_score?: number;
  };
}
