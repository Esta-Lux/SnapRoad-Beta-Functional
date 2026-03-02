import { z } from 'zod';

export const redeemOfferSchema = z.object({
  // Location for verification (optional)
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});
