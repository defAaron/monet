import { z } from "zod";
import {
  EditBriefSchema,
  EditPlanSchema,
  PipelineStageSchema,
  ProofResultSchema,
  RegionFactsSchema,
  RegionGeometrySchema,
  SessionIdSchema,
  SuggestionPayloadSchema,
  type EditBrief,
  type EditPlan,
  type PipelineStage,
  type ProofResult,
  type RegionFacts,
  type RegionGeometry,
  type SessionId,
  type SuggestionPayload,
} from "@/lib/schemas";

/** Page synopsis passed with a pipeline request (TRD §8.1). */
export const PipelinePageContextSchema = z.object({
  sampleId: z.string().optional(),
  title: z.string().optional(),
  synopsis: z.string().optional(),
});

/** Input to the pipeline after client-side Scout (TRD §8.1). */
export const PipelineRequestSchema = z.object({
  sessionId: SessionIdSchema,
  instruction: z.string().min(1),
  region: RegionGeometrySchema,
  facts: RegionFactsSchema,
  pageContext: PipelinePageContextSchema,
});

/** Orchestrator / provider result (TRD §8.1). Apply is client-side. */
export const PipelineResponseSchema = z.object({
  turn: z.object({
    brief: EditBriefSchema.optional(),
    plan: EditPlanSchema.optional(),
    suggestion: SuggestionPayloadSchema.optional(),
    proof: ProofResultSchema.optional(),
    stages: z.array(PipelineStageSchema),
    outcomeSummary: z.string().optional(),
  }),
  model: z.string(),
  latencyMs: z.number().nonnegative(),
});

export type PipelinePageContext = z.infer<typeof PipelinePageContextSchema>;
export type PipelineRequest = z.infer<typeof PipelineRequestSchema>;
export type PipelineResponse = z.infer<typeof PipelineResponseSchema>;

/**
 * Accumulated handoff state for a role run (TRD §8.1 RoleContext).
 * Scout facts live on `req`; later stages fill brief → plan → suggestion → proof.
 */
export type RoleContext = {
  req: PipelineRequest;
  brief?: EditBrief;
  plan?: EditPlan;
  suggestion?: SuggestionPayload;
  proof?: ProofResult;
  /** From Proof → Brush when reviseBrush is set (at most one revise). */
  revisionNotes?: string;
};

/** Single role adapter; stub / LLM implementations plug in here. */
export type PipelineRoleHandler<TOut> = {
  run(ctx: RoleContext): Promise<TOut>;
};

/** Full provider surface for S3-B stub and S3-C API (TRD §8.1). */
export type PipelineProvider = {
  run(req: PipelineRequest): Promise<PipelineResponse>;
};

/**
 * When Brief sets `clarifyQuestion`:
 * - `ask` — halt before Craft (stages craft/brush/proof skipped)
 * - `proceed` — ignore clarify and continue with safest interpretation
 */
export type ClarifyPolicy = "ask" | "proceed";

export type OrchestratorOptions = {
  /** Reported on PipelineResponse.model (e.g. "stub-pipeline"). */
  model?: string;
  clarifyPolicy?: ClarifyPolicy;
  /** Optional wall-clock override for tests. */
  now?: () => Date;
};

export type PipelineTurnSlice = PipelineResponse["turn"];

export type {
  EditBrief,
  EditPlan,
  PipelineStage,
  ProofResult,
  RegionFacts,
  RegionGeometry,
  SessionId,
  SuggestionPayload,
};
