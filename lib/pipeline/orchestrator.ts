import type { PipelineRole, PipelineStage } from "@/lib/schemas";
import { createPostScoutStages } from "@/lib/session/turns";
import {
  revisionNotesFromProof,
  type PipelineRoleHandlers,
} from "./roles";
import type {
  ClarifyPolicy,
  OrchestratorOptions,
  PipelineProvider,
  PipelineRequest,
  PipelineResponse,
  RoleContext,
} from "./types";
import { PipelineRequestSchema } from "./types";

const DEFAULT_MODEL = "orchestrator";
const DEFAULT_CLARIFY: ClarifyPolicy = "ask";

export class PipelineOrchestratorError extends Error {
  readonly role: PipelineRole;
  readonly cause?: unknown;

  constructor(role: PipelineRole, message: string, cause?: unknown) {
    super(message);
    this.name = "PipelineOrchestratorError";
    this.role = role;
    this.cause = cause;
  }
}

function isoNow(now: () => Date): string {
  return now().toISOString();
}

function markRunning(
  stages: PipelineStage[],
  role: PipelineRole,
  at: string,
): void {
  const stage = stages.find((s) => s.role === role);
  if (!stage) return;
  stage.status = "running";
  stage.startedAt = at;
  stage.finishedAt = undefined;
  stage.error = undefined;
}

function markDone(
  stages: PipelineStage[],
  role: PipelineRole,
  at: string,
): void {
  const stage = stages.find((s) => s.role === role);
  if (!stage) return;
  stage.status = "done";
  stage.finishedAt = at;
  if (!stage.startedAt) stage.startedAt = at;
  stage.error = undefined;
}

function markFailed(
  stages: PipelineStage[],
  role: PipelineRole,
  at: string,
  error: string,
): void {
  const stage = stages.find((s) => s.role === role);
  if (!stage) return;
  stage.status = "failed";
  stage.finishedAt = at;
  if (!stage.startedAt) stage.startedAt = at;
  stage.error = error;
}

function markSkipped(stages: PipelineStage[], roles: PipelineRole[]): void {
  for (const role of roles) {
    const stage = stages.find((s) => s.role === role);
    if (!stage) continue;
    if (stage.status === "pending") {
      stage.status = "skipped";
    }
  }
}

/**
 * Serial MVP orchestrator (TRD §8.2):
 * Scout (already done) → Brief → Craft → Brush → Proof,
 * with at most one Brush revise when Proof sets reviseBrush.
 */
export async function runOrchestrator(
  req: PipelineRequest,
  handlers: PipelineRoleHandlers,
  options: OrchestratorOptions = {},
): Promise<PipelineResponse> {
  const started = Date.now();
  const now = options.now ?? (() => new Date());
  const model = options.model ?? DEFAULT_MODEL;
  const clarifyPolicy = options.clarifyPolicy ?? DEFAULT_CLARIFY;

  const parsed = PipelineRequestSchema.parse(req);
  const stages = createPostScoutStages(isoNow(now));

  const ctx: RoleContext = { req: parsed };

  // ── Brief ──────────────────────────────────────────────────────────────
  try {
    markRunning(stages, "brief", isoNow(now));
    ctx.brief = await handlers.brief.run(ctx);
    markDone(stages, "brief", isoNow(now));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brief failed";
    markFailed(stages, "brief", isoNow(now), message);
    markSkipped(stages, ["craft", "brush", "proof"]);
    throw new PipelineOrchestratorError("brief", message, err);
  }

  if (ctx.brief.clarifyQuestion && clarifyPolicy === "ask") {
    markSkipped(stages, ["craft", "brush", "proof"]);
    return {
      turn: {
        brief: ctx.brief,
        stages,
      },
      model,
      latencyMs: Date.now() - started,
    };
  }

  // ── Craft ──────────────────────────────────────────────────────────────
  try {
    markRunning(stages, "craft", isoNow(now));
    ctx.plan = await handlers.craft.run(ctx);
    markDone(stages, "craft", isoNow(now));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Craft failed";
    markFailed(stages, "craft", isoNow(now), message);
    markSkipped(stages, ["brush", "proof"]);
    throw new PipelineOrchestratorError("craft", message, err);
  }

  // ── Brush (initial) ────────────────────────────────────────────────────
  try {
    markRunning(stages, "brush", isoNow(now));
    ctx.suggestion = await handlers.brush.run(ctx);
    markDone(stages, "brush", isoNow(now));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brush failed";
    markFailed(stages, "brush", isoNow(now), message);
    markSkipped(stages, ["proof"]);
    throw new PipelineOrchestratorError("brush", message, err);
  }

  // ── Proof (+ optional single Brush revise) ─────────────────────────────
  let brushRevised = false;

  try {
    markRunning(stages, "proof", isoNow(now));
    ctx.proof = await handlers.proof.run(ctx);
    markDone(stages, "proof", isoNow(now));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proof failed";
    markFailed(stages, "proof", isoNow(now), message);
    throw new PipelineOrchestratorError("proof", message, err);
  }

  if (
    ctx.proof &&
    !ctx.proof.ok &&
    ctx.proof.reviseBrush === true &&
    !brushRevised
  ) {
    brushRevised = true;
    ctx.revisionNotes = revisionNotesFromProof(ctx.proof);

    try {
      markRunning(stages, "brush", isoNow(now));
      ctx.suggestion = await handlers.brush.run(ctx);
      markDone(stages, "brush", isoNow(now));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Brush revise failed";
      markFailed(stages, "brush", isoNow(now), message);
      throw new PipelineOrchestratorError("brush", message, err);
    }

    // Clear revise hint so a second Proof pass cannot request another loop.
    ctx.revisionNotes = undefined;

    try {
      markRunning(stages, "proof", isoNow(now));
      ctx.proof = await handlers.proof.run(ctx);
      // Cap: ignore a second reviseBrush request.
      if (ctx.proof.reviseBrush) {
        ctx.proof = { ...ctx.proof, reviseBrush: false };
      }
      markDone(stages, "proof", isoNow(now));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Proof after revise failed";
      markFailed(stages, "proof", isoNow(now), message);
      throw new PipelineOrchestratorError("proof", message, err);
    }
  }

  return {
    turn: {
      brief: ctx.brief,
      plan: ctx.plan,
      suggestion: ctx.suggestion,
      proof: ctx.proof,
      stages,
    },
    model,
    latencyMs: Date.now() - started,
  };
}

/**
 * Build a PipelineProvider from injectable role handlers (S3-B / S3-C plug-in).
 */
export function createOrchestratorProvider(
  handlers: PipelineRoleHandlers,
  options: OrchestratorOptions = {},
): PipelineProvider {
  return {
    run(req) {
      return runOrchestrator(req, handlers, options);
    },
  };
}
