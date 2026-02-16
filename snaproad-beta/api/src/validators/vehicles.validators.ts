import { z } from 'zod';

export const createVehicleSchema = z.object({
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  fuelType: z.enum(['gas', 'diesel', 'electric', 'hybrid']),
  isPrimary: z.boolean().optional()
});

export const updateVehicleSchema = z.object({
  make: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  fuelType: z.enum(['gas', 'diesel', 'electric', 'hybrid']).optional(),
  isPrimary: z.boolean().optional()
});
