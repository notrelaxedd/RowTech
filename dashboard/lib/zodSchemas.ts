import { z } from "zod";

// =============================================================================
// Zod Validation Schemas
// Used by API routes to validate request bodies.
// =============================================================================

export const telemetryEntrySchema = z.object({
  mac:            z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
  phase:          z.number().int().min(0).max(3),
  roll:           z.number(),
  pitch:          z.number(),
  featherAngle:   z.number().min(0).max(180),
  rushScore:      z.number().min(0).max(10),
  strokeRate:     z.number().min(0).max(60),
  catchSharpness: z.number().int().min(0).max(5000),
  batteryVoltage: z.number().min(0).max(5),
  timestamp:      z.number().int().nonnegative(),
});

export const telemetryPostSchema = z.object({
  sensors: z.array(telemetryEntrySchema).min(1).max(8),
});

export const strokePostSchema = z.object({
  mac:                z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
  featherAngle:       z.number().min(0).max(180),
  featherConsistency: z.number().min(0),
  rushScore:          z.number().min(0).max(10),
  catchSharpness:     z.number().int().min(0).max(5000),
  strokeRate:         z.number().min(0).max(60),
  timestamp:          z.number().int().nonnegative(),
});

export const createSessionSchema = z.object({
  boat_id: z.string().uuid(),
});

export const updateSessionSchema = z.object({
  ended_at: z.string().datetime().optional(),
  duration: z.number().int().nonnegative().optional(),
  notes:    z.string().max(2000).optional(),
  avg_rate: z.number().min(0).max(60).optional(),
});

export const createBoatSchema = z.object({
  name:       z.string().min(1).max(100),
  seat_count: z.number().int().min(1).max(8).default(8),
});

export const updateBoatSchema = z.object({
  name:       z.string().min(1).max(100).optional(),
  seat_count: z.number().int().min(1).max(8).optional(),
  seats: z.array(z.object({
    seat_number: z.number().int().min(1).max(8),
    profile_id:  z.string().uuid().nullable(),
    device_mac:  z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).nullable(),
  })).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createProfileSchema = z.object({
  name:      z.string().min(1).max(100),
  photo_url: z.string().url().optional(),
  side:      z.enum(["port", "starboard"]).optional(),
  height_cm: z.number().int().min(100).max(250).optional(),
  weight_kg: z.number().int().min(30).max(200).optional(),
  notes:     z.string().max(2000).optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

export type TelemetryPostInput   = z.infer<typeof telemetryPostSchema>;
export type StrokePostInput       = z.infer<typeof strokePostSchema>;
export type CreateSessionInput    = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput    = z.infer<typeof updateSessionSchema>;
export type CreateBoatInput       = z.infer<typeof createBoatSchema>;
export type UpdateBoatInput       = z.infer<typeof updateBoatSchema>;
export type UpdateDeviceInput     = z.infer<typeof updateDeviceSchema>;
export type CreateProfileInput    = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput    = z.infer<typeof updateProfileSchema>;
