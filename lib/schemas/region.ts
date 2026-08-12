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

/** Dominant color sample under a region (TRD §5.1 RegionFacts.colors). */
export const RegionColorFactSchema = z.object({
  hex: z.string(),
  ratio: z.number().min(0).max(1),
});

/** Font sample under a region (TRD §5.1 RegionFacts.fonts). */
export const RegionFontFactSchema = z.object({
  family: z.string().optional(),
  sizePx: z.number().optional(),
  weight: z.number().optional(),
});

/** Contrast pair under a region (TRD §5.1 RegionFacts.contrast). */
export const RegionContrastFactSchema = z.object({
  foreground: z.string(),
  background: z.string(),
  ratio: z.number(),
  passAA: z.boolean(),
});

/** Deterministic Scout output for a selected region (TRD §5.1). */
export const RegionFactsSchema = z.object({
  colors: z.array(RegionColorFactSchema),
  fonts: z.array(RegionFontFactSchema),
  contrast: z.array(RegionContrastFactSchema).optional(),
  interactiveCount: z.number().int().nonnegative(),
  linkCount: z.number().int().nonnegative(),
  textSample: z.string().optional(),
  domPathHints: z.array(z.string()).optional(),
  targetIds: z.array(z.string()).optional(),
});

export type RegionTool = z.infer<typeof RegionToolSchema>;
export type RegionGeometry = z.infer<typeof RegionGeometrySchema>;
export type RegionColorFact = z.infer<typeof RegionColorFactSchema>;
export type RegionFontFact = z.infer<typeof RegionFontFactSchema>;
export type RegionContrastFact = z.infer<typeof RegionContrastFactSchema>;
export type RegionFacts = z.infer<typeof RegionFactsSchema>;
