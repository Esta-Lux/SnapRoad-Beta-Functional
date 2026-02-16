import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const registerPartnerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(255),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  subscriptionPlan: z.enum(['local', 'growth', 'enterprise'])
});

export const createOfferSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  discountPercent: z.number().int().min(1).max(100),
  gemsRequired: z.number().int().min(1),
  location: locationSchema,
  radiusKm: z.number().positive().optional(),
  bannerUrl: z.string().url().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const updateOfferSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  gemsRequired: z.number().int().min(1).optional(),
  location: locationSchema.optional(),
  radiusKm: z.number().positive().optional(),
  bannerUrl: z.string().url().optional(),
  status: z.enum(['active', 'paused', 'expired']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});
