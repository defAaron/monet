import { z } from "zod";
import { BBoxSchema, PointSchema, RegionIdSchema } from "./common";

export const RegionToolSchema = z.enum(["rect", "freehand"]);

export const RegionGeometrySchema = z.object({
  id: RegionIdSchema,
  tool: RegionToolSchema,
  bbox: BBoxSchema,
  path: z.array(PointSchema).optional(),
  createdAt: z.string().datetime(),
});

export const RegionFactsSchema = z.object({
  colors: z.array(
    z.object({
      hex: z.string(),
      ratio: z.number().min(0).max(1),
    }),
  ),
  fonts: z.array(
    z.object({
      family: z.string().optional(),
      sizePx: z.number().optional(),
      weight: z.number().optional(),
    }),
  ),
  contrast: z
    .array(
      z.object({
        foreground: z.string(),
        background: z.string(),
        ratio: z.number(),
        passAA: z.boolean(),
      }),
    )
    .optional(),
  interactiveCount: z.number().int().nonnegative(),
  linkCount: z.number().int().nonnegative(),
  textSample: z.string().optional(),
  domPathHints: z.array(z.string()).optional(),
  targetIds: z.array(z.string()).optional(),
});

export type RegionTool = z.infer<typeof RegionToolSchema>;
export type RegionGeometry = z.infer<typeof RegionGeometrySchema>;
export type RegionFacts = z.infer<typeof RegionFactsSchema>;
