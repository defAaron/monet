import { z } from "zod";

export const PipelineRoleSchema = z.enum([
  "scout",
  "brief",
  "craft",
  "brush",
  "proof",
]);

export const PipelineStageStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
]);

export const EditBriefSchema = z.object({
  restatedIntent: z.string(),
  constraints: z.array(z.string()),
  successCriteria: z.array(z.string()),
  clarifyQuestion: z.string().optional(),
});

export const EditPlanSchema = z.object({
  summary: z.string(),
  targetIds: z.array(z.string()),
  changes: z.array(
    z.object({
      targetId: z.string(),
      description: z.string(),
      rationale: z.string().optional(),
    }),
  ),
});

export const SuggestionKindSchema = z.enum([
  "css-var",
  "style-patch",
  "class-toggle",
  "text-replace",
]);

export const SuggestionPayloadSchema = z.object({
  kind: SuggestionKindSchema,
  targetHint: z.string(),
  patch: z.record(z.string(), z.unknown()),
  previewLabel: z.string(),
});

export const ProofResultSchema = z.object({
  ok: z.boolean(),
  notes: z.string(),
  reviseBrush: z.boolean().optional(),
  issues: z.array(z.string()).optional(),
});

export const PipelineStageSchema = z.object({
  role: PipelineRoleSchema,
  status: PipelineStageStatusSchema,
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export type PipelineRole = z.infer<typeof PipelineRoleSchema>;
export type PipelineStageStatus = z.infer<typeof PipelineStageStatusSchema>;
export type EditBrief = z.infer<typeof EditBriefSchema>;
export type EditPlan = z.infer<typeof EditPlanSchema>;
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>;
export type SuggestionPayload = z.infer<typeof SuggestionPayloadSchema>;
export type ProofResult = z.infer<typeof ProofResultSchema>;
export type PipelineStage = z.infer<typeof PipelineStageSchema>;
