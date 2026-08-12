import { describe, expect, it } from "vitest";
import { createId } from "@/lib/ids";
import type {
  EditBrief,
  EditPlan,
  ProofResult,
  RegionFacts,
  RegionGeometry,
  SuggestionPayload,
} from "@/lib/schemas";
import {
  createBriefHandler,
  createBrushHandler,
  createCraftHandler,
  createOrchestratorProvider,
  createProofHandler,
  runOrchestrator,
  type PipelineRequest,
  type PipelineRoleHandlers,
  type RoleContext,
} from "./index";

const now = "2026-08-12T03:00:00.000Z";

function sampleRegion(): RegionGeometry {
  return {
    id: createId(),
    tool: "rect",
    bbox: { x: 40, y: 80, width: 160, height: 44 },
    createdAt: now,
  };
}

function sampleFacts(): RegionFacts {
  return {
    colors: [
      { hex: "#888888", ratio: 0.5 },
      { hex: "#ffffff", ratio: 0.5 },
    ],
    fonts: [{ family: "Georgia", sizePx: 16, weight: 600 }],
    contrast: [
      {
        foreground: "#888888",
        background: "#ffffff",
        ratio: 3.5,
        passAA: false,
      },
    ],
    interactiveCount: 1,
    linkCount: 0,
    textSample: "Get started",
    targetIds: ["hero-cta"],
  };
}

function sampleRequest(): PipelineRequest {
  return {
    sessionId: createId(),
    instruction: "Improve contrast on the CTA",
    region: sampleRegion(),
    facts: sampleFacts(),
    pageContext: { sampleId: "landing", title: "Sample" },
  };
}

const briefOk: EditBrief = {
  restatedIntent: "Raise CTA contrast to WCAG AA",
  constraints: ["Stay on hero-cta"],
  successCriteria: ["Contrast passAA true"],
};

const planOk: EditPlan = {
  summary: "Darken CTA text",
  targetIds: ["hero-cta"],
  changes: [
    {
      targetId: "hero-cta",
      description: "Set color to near-black",
      rationale: "Fixes AA",
    },
  ],
};

const suggestionV1: SuggestionPayload = {
  kind: "style-patch",
  targetHint: "hero-cta",
  patch: { color: "#666666" },
  previewLabel: "Darken CTA",
};

const suggestionV2: SuggestionPayload = {
  kind: "style-patch",
  targetHint: "hero-cta",
  patch: { color: "#111111" },
  previewLabel: "Darken CTA (revised)",
};

function happyHandlers(
  overrides: Partial<{
    brief: (ctx: RoleContext) => Promise<EditBrief>;
    craft: (ctx: RoleContext) => Promise<EditPlan>;
    brush: (ctx: RoleContext) => Promise<SuggestionPayload>;
    proof: (ctx: RoleContext) => Promise<ProofResult>;
  }> = {},
): PipelineRoleHandlers {
  let proofCalls = 0;

  return {
    brief: createBriefHandler(
      overrides.brief ?? (async () => briefOk),
    ),
    craft: createCraftHandler(
      overrides.craft ?? (async () => planOk),
    ),
    brush: createBrushHandler(
      overrides.brush ??
        (async (ctx) => {
          if (ctx.revisionNotes) return suggestionV2;
          return suggestionV1;
        }),
    ),
    proof: createProofHandler(
      overrides.proof ??
        (async () => {
          proofCalls += 1;
          if (proofCalls === 1) {
            return {
              ok: false,
              notes: "Contrast still fails AA",
              reviseBrush: true,
              issues: ["ratio < 4.5"],
            };
          }
          return {
            ok: true,
            notes: "Contrast AA pass",
          };
        }),
    ),
  };
}

describe("S3-A orchestrator", () => {
  it("runs Brief → Craft → Brush → Proof and returns typed handoffs", async () => {
    const handlers = happyHandlers({
      proof: async () => ({ ok: true, notes: "ok" }),
    });

    const res = await runOrchestrator(sampleRequest(), handlers, {
      model: "test-pipeline",
      now: () => new Date(now),
    });

    expect(res.model).toBe("test-pipeline");
    expect(res.turn.brief).toEqual(briefOk);
    expect(res.turn.plan).toEqual(planOk);
    expect(res.turn.suggestion).toEqual(suggestionV1);
    expect(res.turn.proof?.ok).toBe(true);
    expect(res.turn.stages.map((s) => s.role)).toEqual([
      "scout",
      "brief",
      "craft",
      "brush",
      "proof",
    ]);
    expect(res.turn.stages.every((s) => s.status === "done")).toBe(true);
  });

  it("allows at most one Brush revise when Proof requests it", async () => {
    let brushRuns = 0;
    let proofRuns = 0;
    const revisionNotesSeen: Array<string | undefined> = [];

    const handlers = happyHandlers({
      brush: async (ctx) => {
        brushRuns += 1;
        revisionNotesSeen.push(ctx.revisionNotes);
        return brushRuns === 1 ? suggestionV1 : suggestionV2;
      },
      proof: async () => {
        proofRuns += 1;
        // Always ask to revise — orchestrator must cap at one.
        return {
          ok: proofRuns >= 2,
          notes: proofRuns === 1 ? "needs revise" : "still imperfect but capped",
          reviseBrush: true,
        };
      },
    });

    const res = await runOrchestrator(sampleRequest(), handlers, {
      model: "test-pipeline",
    });

    expect(brushRuns).toBe(2);
    expect(proofRuns).toBe(2);
    expect(revisionNotesSeen[0]).toBeUndefined();
    expect(revisionNotesSeen[1]).toContain("needs revise");
    expect(res.turn.suggestion).toEqual(suggestionV2);
    expect(res.turn.proof?.ok).toBe(true);
    // Cap: second Proof cannot leave reviseBrush true for another loop.
    expect(res.turn.proof?.reviseBrush).toBe(false);
  });

  it("halts before Craft when Brief clarifies and policy=ask", async () => {
    const handlers = happyHandlers({
      brief: async () => ({
        ...briefOk,
        clarifyQuestion: "Which CTA — primary or ghost?",
      }),
    });

    const res = await runOrchestrator(sampleRequest(), handlers, {
      clarifyPolicy: "ask",
      model: "test-pipeline",
    });

    expect(res.turn.brief?.clarifyQuestion).toBeTruthy();
    expect(res.turn.plan).toBeUndefined();
    expect(res.turn.suggestion).toBeUndefined();
    expect(res.turn.proof).toBeUndefined();
    expect(res.turn.stages.find((s) => s.role === "brief")?.status).toBe(
      "done",
    );
    expect(res.turn.stages.find((s) => s.role === "craft")?.status).toBe(
      "skipped",
    );
    expect(res.turn.stages.find((s) => s.role === "brush")?.status).toBe(
      "skipped",
    );
    expect(res.turn.stages.find((s) => s.role === "proof")?.status).toBe(
      "skipped",
    );
  });

  it("exposes a PipelineProvider via createOrchestratorProvider", async () => {
    const provider = createOrchestratorProvider(
      happyHandlers({
        proof: async () => ({ ok: true, notes: "ok" }),
      }),
      { model: "stub-shaped" },
    );

    const res = await provider.run(sampleRequest());
    expect(res.model).toBe("stub-shaped");
    expect(res.turn.proof?.ok).toBe(true);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
