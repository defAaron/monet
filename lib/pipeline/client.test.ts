import { describe, expect, it, vi } from "vitest";
import type { EditTurn } from "@/lib/schemas";
import { createPostScoutStages } from "@/lib/session/turns";
import {
  PipelineClientError,
  buildPipelineRequest,
  mergeTurnWithPipelineResponse,
  runPipeline,
  runPipelineForTurn,
  withStageFailed,
  withStageRunning,
} from "./client";
import type { PipelineResponse } from "./types";

const region = {
  id: "11111111-1111-4111-8111-111111111111",
  tool: "rect" as const,
  bbox: { x: 10, y: 20, width: 100, height: 40 },
  createdAt: "2026-08-11T12:00:00.000Z",
};

const facts = {
  colors: [
    { hex: "#112233", ratio: 0.6 },
    { hex: "#ffffff", ratio: 0.4 },
  ],
  fonts: [{ family: "Georgia", sizePx: 16, weight: 600 }],
  contrast: [
    {
      foreground: "#112233",
      background: "#ffffff",
      ratio: 12,
      passAA: true,
    },
  ],
  interactiveCount: 1,
  linkCount: 0,
  textSample: "Get started",
  targetIds: ["hero-cta"],
};

function sampleTurn(): EditTurn {
  const now = "2026-08-11T12:00:02.000Z";
  return {
    id: "22222222-2222-4222-8222-222222222222",
    sessionId: "33333333-3333-4333-8333-333333333333",
    region,
    instruction: "Increase contrast on the CTA",
    facts,
    stages: createPostScoutStages(now),
    applied: false,
    createdAt: now,
    updatedAt: now,
  };
}

function sampleResponse(): PipelineResponse {
  const now = "2026-08-11T12:00:03.000Z";
  return {
    model: "stub-pipeline",
    latencyMs: 12,
    turn: {
      brief: {
        restatedIntent: "Improve CTA contrast",
        constraints: ["Stay on hero-cta"],
        successCriteria: ["AA contrast"],
      },
      plan: {
        summary: "Darken CTA text",
        targetIds: ["hero-cta"],
        changes: [
          {
            targetId: "hero-cta",
            description: "Raise text contrast",
          },
        ],
      },
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { color: "#0a0a0a" },
        previewLabel: "Darker CTA label",
      },
      proof: {
        ok: true,
        notes: "Contrast improved",
      },
      stages: [
        {
          role: "scout",
          status: "done",
          startedAt: now,
          finishedAt: now,
        },
        {
          role: "brief",
          status: "done",
          startedAt: now,
          finishedAt: now,
        },
        {
          role: "craft",
          status: "done",
          startedAt: now,
          finishedAt: now,
        },
        {
          role: "brush",
          status: "done",
          startedAt: now,
          finishedAt: now,
        },
        {
          role: "proof",
          status: "done",
          startedAt: now,
          finishedAt: now,
        },
      ],
      outcomeSummary: "CTA contrast raised.",
    },
  };
}

describe("buildPipelineRequest", () => {
  it("validates and fills pageContext default", () => {
    const req = buildPipelineRequest({
      sessionId: "33333333-3333-4333-8333-333333333333",
      instruction: "Increase contrast",
      region,
      facts,
    });
    expect(req.pageContext).toEqual({});
    expect(req.instruction).toBe("Increase contrast");
  });
});

describe("runPipeline", () => {
  it("POSTs JSON and returns a validated response", async () => {
    const payload = sampleResponse();
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(payload, { status: 200 }),
    );

    const req = buildPipelineRequest({
      sessionId: "33333333-3333-4333-8333-333333333333",
      instruction: "Increase contrast on the CTA",
      region,
      facts,
      pageContext: { sampleId: "landing", title: "Sample" },
    });

    const res = await runPipeline(req, { fetch: fetchMock });
    expect(res.model).toBe("stub-pipeline");
    expect(res.turn.stages).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledOnce();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws PipelineClientError on HTTP error bodies", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: "Instruction too long" }, { status: 400 }),
    );

    const req = buildPipelineRequest({
      sessionId: "33333333-3333-4333-8333-333333333333",
      instruction: "x",
      region,
      facts,
    });

    await expect(runPipeline(req, { fetch: fetchMock })).rejects.toMatchObject({
      name: "PipelineClientError",
      message: "Instruction too long",
      status: 400,
    });
  });

  it("throws when response shape is invalid", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true }, { status: 200 }),
    );
    const req = buildPipelineRequest({
      sessionId: "33333333-3333-4333-8333-333333333333",
      instruction: "x",
      region,
      facts,
    });

    await expect(runPipeline(req, { fetch: fetchMock })).rejects.toBeInstanceOf(
      PipelineClientError,
    );
  });
});

describe("mergeTurnWithPipelineResponse", () => {
  it("copies pipeline fields without flipping applied", () => {
    const turn = sampleTurn();
    const merged = mergeTurnWithPipelineResponse(turn, sampleResponse());

    expect(merged.id).toBe(turn.id);
    expect(merged.sessionId).toBe(turn.sessionId);
    expect(merged.applied).toBe(false);
    expect(merged.brief?.restatedIntent).toContain("CTA");
    expect(merged.proof?.ok).toBe(true);
    expect(merged.stages.every((s) => s.status === "done")).toBe(true);
    expect(merged.outcomeSummary).toBe("CTA contrast raised.");
  });
});

describe("stage helpers", () => {
  it("marks brief running then failed", () => {
    const stages = createPostScoutStages("2026-08-11T12:00:00.000Z");
    const running = withStageRunning(stages, "brief");
    expect(running.find((s) => s.role === "brief")?.status).toBe("running");

    const failed = withStageFailed(running, "brief", "boom");
    expect(failed.find((s) => s.role === "brief")).toMatchObject({
      status: "failed",
      error: "boom",
    });
  });
});

describe("runPipelineForTurn", () => {
  it("requires facts and merges the response onto the turn", async () => {
    const turn = sampleTurn();
    const fetchMock = vi.fn(async () =>
      Response.json(sampleResponse(), { status: 200 }),
    );

    const { response, turn: next } = await runPipelineForTurn(
      turn,
      { sampleId: "landing" },
      { fetch: fetchMock },
    );

    expect(response.model).toBe("stub-pipeline");
    expect(next.suggestion?.targetHint).toBe("hero-cta");
    expect(next.applied).toBe(false);
  });

  it("rejects turns without facts", async () => {
    const turn = { ...sampleTurn(), facts: undefined };
    await expect(runPipelineForTurn(turn)).rejects.toBeInstanceOf(
      PipelineClientError,
    );
  });
});
