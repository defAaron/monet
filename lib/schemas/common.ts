import { z } from "zod";

export const UserIdSchema = z.string().uuid();
export const ProjectIdSchema = z.string().uuid();
export const SessionIdSchema = z.string().uuid();
export const EditTurnIdSchema = z.string().uuid();
export const RegionIdSchema = z.string().uuid();

export type UserId = z.infer<typeof UserIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type EditTurnId = z.infer<typeof EditTurnIdSchema>;
export type RegionId = z.infer<typeof RegionIdSchema>;

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const BBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export type Point = z.infer<typeof PointSchema>;
export type BBox = z.infer<typeof BBoxSchema>;
