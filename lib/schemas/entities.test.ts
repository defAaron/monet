import { describe, expect, it } from "vitest";
import { createId } from "@/lib/ids";
import {
  EditSessionSchema,
  EditTurnSchema,
  RegionFactsSchema,
  RegionGeometrySchema,
  type EditSession,
  type EditTurn,
  type RegionFacts,
  type RegionGeometry,
} from "@/lib/schemas";

const now = "2026-08-12T02:00:00.000Z";

function sampleRegion(): RegionGeometry {
  return {
    id: createId(),
    tool: "rect",
    bbox: { x: 10, y: 20, width: 200, height: 48 },
    createdAt: now,
  };
}

function sampleFacts(): RegionFacts {
  return {
    colors: [
      { hex: "#111111", ratio: 0.6 },
      { hex: "#f5f5f5", ratio: 0.4 },
    ],
    fonts: [{ family: "Inter", sizePx: 16, weight: 600 }],
    contrast: [
      {
        foreground: "#111111",
        background: "#f5f5f5",
        ratio: 14.2,
        passAA: true,
      },
    ],
    interactiveCount: 1,
    linkCount: 0,
    textSample: "Get started",
    domPathHints: ["button.cta", "section.hero"],
    targetIds: ["hero-cta"],
  };
}

describe("TRD §5.1 contracts (S2-A)", () => {
  it("parses RegionFacts", () => {
    const parsed = RegionFactsSchema.parse(sampleFacts());
    expect(parsed.targetIds).toEqual(["hero-cta"]);
    expect(parsed.contrast?.[0]?.passAA).toBe(true);
  });

  it("parses RegionGeometry used by EditTurn", () => {
    const freehand: RegionGeometry = {
      ...sampleRegion(),
      tool: "freehand",
      path: [
        { x: 0, y: 0 },
        { x: 10, y: 4 },
        { x: 8, y: 12 },
      ],
    };
    expect(RegionGeometrySchema.parse(freehand).path).toHaveLength(3);
  });

  it("parses EditTurn with Scout facts and pending stages", () => {
    const sessionId = createId();
    const turn: EditTurn = {
      id: createId(),
      sessionId,
      region: sampleRegion(),
      instruction: "Improve contrast on the CTA",
      facts: sampleFacts(),
      stages: [
        { role: "scout", status: "done", startedAt: now, finishedAt: now },
        { role: "brief", status: "pending" },
        { role: "craft", status: "pending" },
        { role: "brush", status: "pending" },
        { role: "proof", status: "pending" },
      ],
      applied: false,
      createdAt: now,
      updatedAt: now,
    };

    const parsed = EditTurnSchema.parse(turn);
    expect(parsed.facts?.interactiveCount).toBe(1);
    expect(parsed.stages).toHaveLength(5);
    expect(parsed.brief).toBeUndefined();
  });

  it("parses EditSession with nested turns", () => {
    const sessionId = createId();
    const turn: EditTurn = {
      id: createId(),
      sessionId,
      region: sampleRegion(),
      instruction: "Make the nav clearer",
      stages: [],
      applied: false,
      createdAt: now,
      updatedAt: now,
    };

    const session: EditSession = {
      id: sessionId,
      title: "Sample landing",
      preview: { kind: "sample", sampleId: "landing" },
      turns: [turn],
      createdAt: now,
      updatedAt: now,
    };

    const parsed = EditSessionSchema.parse(session);
    expect(parsed.preview.kind).toBe("sample");
    expect(parsed.turns[0]?.instruction).toContain("nav");
  });

  it("rejects invalid color ratios and non-uuid turn ids", () => {
    expect(
      RegionFactsSchema.safeParse({
        ...sampleFacts(),
        colors: [{ hex: "#000", ratio: 1.5 }],
      }).success,
    ).toBe(false);

    expect(
      EditTurnSchema.safeParse({
        id: "not-a-uuid",
        sessionId: createId(),
        region: sampleRegion(),
        instruction: "x",
        stages: [],
        applied: false,
        createdAt: now,
        updatedAt: now,
      }).success,
    ).toBe(false);
  });
});
