import { z } from 'zod';

export const moderateIncidentSchema = z.object({
  action: z.enum(['approve', 'reject', 'flag']),
  notes: z.string().max(1000).optional()
});

export const adjustRewardsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  gemsAmount: z.number().int(), // Can be positive or negative
  reason: z.string().min(1, 'Reason is required').max(500)
});

export const updatePartnerStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
  reason: z.string().max(500).optional()
});
