import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const startTripSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  startLocation: locationSchema,
  destination: locationSchema
});

export const endTripSchema = z.object({
  endLocation: locationSchema,
  routeGeometry: z.any().optional()
});

export const tripEventSchema = z.object({
  eventType: z.enum(['speeding', 'hard_brake', 'rapid_acceleration']),
  severity: z.enum(['low', 'medium', 'high']),
  location: locationSchema,
  speedKmh: z.number().positive().optional()
});
