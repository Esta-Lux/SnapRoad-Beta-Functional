import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const createIncidentSchema = z.object({
  incidentType: z.enum(['accident', 'hazard', 'violation', 'other']),
  description: z.string().max(1000).optional(),
  location: locationSchema
});

export const uploadPhotoSchema = z.object({
  // Photos are handled by multer middleware
});
