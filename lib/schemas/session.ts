import { z } from "zod";
import {
  EditTurnIdSchema,
  ProjectIdSchema,
  SessionIdSchema,
  UserIdSchema,
} from "./common";
import {
  EditBriefSchema,
  EditPlanSchema,
  PipelineStageSchema,
  ProofResultSchema,
  SuggestionPayloadSchema,
} from "./pipeline";
import { RegionFactsSchema, RegionGeometrySchema } from "./region";

/** One instruct → pipeline → apply cycle (TRD §5.1). */
export const EditTurnSchema = z.object({
  id: EditTurnIdSchema,
  sessionId: SessionIdSchema,
  region: RegionGeometrySchema,
  instruction: z.string(),
  facts: RegionFactsSchema.optional(),
  brief: EditBriefSchema.optional(),
  plan: EditPlanSchema.optional(),
  suggestion: SuggestionPayloadSchema.optional(),
  proof: ProofResultSchema.optional(),
  stages: z.array(PipelineStageSchema),
  outcomeSummary: z.string().optional(),
  applied: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Future identity fields — optional in MVP
  authorId: UserIdSchema.optional(),
  authorDisplayName: z.string().optional(),
});

export const PreviewKindSchema = z.enum(["sample", "html", "url"]);

export const SessionPreviewSchema = z.object({
  kind: PreviewKindSchema,
  sampleId: z.string().optional(),
  html: z.string().optional(),
  url: z.string().url().optional(),
});

/** Local edit session document (TRD §5.1). Persist wrapper is S2-B. */
export const EditSessionSchema = z.object({
  id: SessionIdSchema,
  title: z.string(),
  preview: SessionPreviewSchema,
  turns: z.array(EditTurnSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Future
  projectId: ProjectIdSchema.optional(),
  createdBy: UserIdSchema.optional(),
});

export type EditTurn = z.infer<typeof EditTurnSchema>;
export type EditSession = z.infer<typeof EditSessionSchema>;
export type PreviewKind = z.infer<typeof PreviewKindSchema>;
export type SessionPreview = z.infer<typeof SessionPreviewSchema>;
