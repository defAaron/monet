import { describe, expect, it } from "vitest";
import { createId } from "@/lib/ids";
import type { RegionFacts, RegionGeometry } from "@/lib/schemas";
import {
  INSTRUCT_CHIP_CATALOG,
} from "@/components/instruct/suggestChips";
import {
  createStubPipelineProvider,
  getStubFixtureById,
  inferRegionHint,
  matchStubFixture,
  resolveStubRun,
  STUB_DEMO_FIXTURES,
  type PipelineRequest,
} from "../index";

const now = "2026-08-12T03:00:00.000Z";

function region(): RegionGeometry {
  return {
    id: createId(),
    tool: "rect",
    bbox: { x: 40, y: 80, width: 160, height: 44 },
    createdAt: now,
  };
}

function facts(targetIds: string[], contrastFail = false): RegionFacts {
  return {
    colors: [
      { hex: "#a89a8c", ratio: 0.5 },
      { hex: "#cfc6bb", ratio: 0.5 },
    ],
    fonts: [{ family: "Georgia", sizePx: 16, weight: 600 }],
    contrast: [
      {
        foreground: "#a89a8c",
        background: "#cfc6bb",
        ratio: contrastFail ? 2.1 : 5.2,
        passAA: !contrastFail,
      },
    ],
    interactiveCount: targetIds.includes("primary-nav") ? 4 : 1,
    linkCount: targetIds.includes("primary-nav") ? 3 : 0,
    textSample: "Get started",
    targetIds,
  };
}

function request(
  instruction: string,
  targetIds: string[],
  contrastFail = false,
): PipelineRequest {
  return {
    sessionId: createId(),
    instruction,
    region: region(),
    facts: facts(targetIds, contrastFail),
    pageContext: { sampleId: "landing", title: "Sample" },
  };
}

describe("S3-B stub fixtures + provider", () => {
  it("loads TRD §23 demo fixtures with proof.ok and style-patch targets", () => {
    expect(STUB_DEMO_FIXTURES.map((f) => f.id).sort()).toEqual([
      "hero-cta-contrast",
      "hero-cta-primary-cta",
      "primary-nav-hierarchy",
      "signup-form-focus",
    ]);

    for (const fixture of STUB_DEMO_FIXTURES) {
      expect(fixture.proof.ok).toBe(true);
      expect(["style-patch", "class-toggle"]).toContain(fixture.suggestion.kind);
      expect(fixture.regionHints.length).toBeGreaterThan(0);
      expect(fixture.suggestion.targetHint).toBe(fixture.regionHints[0]);
    }
  });

  it("infers region hint with demo priority", () => {
    expect(inferRegionHint(["signup-form", "hero-cta"])).toBe("hero-cta");
    expect(inferRegionHint(["primary-nav"])).toBe("primary-nav");
    expect(inferRegionHint([])).toBeUndefined();
  });

  it("matches hero-cta + Contrast chip text (pitch spine)", async () => {
    const chip = INSTRUCT_CHIP_CATALOG.find((c) => c.id === "contrast")!;
    const req = request(chip.text, ["hero-cta"], true);
    const match = matchStubFixture(req);

    expect(match.fixture.id).toBe("hero-cta-contrast");
    expect(match.score).toBeGreaterThan(0);

    const provider = createStubPipelineProvider();
    const res = await provider.run(req);

    expect(res.model).toBe("stub-pipeline");
    expect(res.turn.brief?.restatedIntent).toMatch(/contrast/i);
    expect(res.turn.plan?.targetIds).toContain("hero-cta");
    expect(res.turn.suggestion?.kind).toBe("style-patch");
    expect(res.turn.suggestion?.targetHint).toBe("hero-cta");
    expect(res.turn.suggestion?.patch).toMatchObject({
      color: "#1a1f26",
    });
    expect(res.turn.proof?.ok).toBe(true);
    expect(res.turn.outcomeSummary).toMatch(/AA/i);
    expect(res.turn.stages.every((s) => s.status === "done")).toBe(true);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("matches primary-nav + Hierarchy", async () => {
    const chip = INSTRUCT_CHIP_CATALOG.find((c) => c.id === "hierarchy")!;
    const res = await createStubPipelineProvider().run(
      request(chip.text, ["primary-nav"]),
    );

    expect(res.model).toBe("stub-pipeline");
    expect(res.turn.suggestion?.targetHint).toBe("primary-nav");
    expect(res.turn.suggestion?.kind).toBe("class-toggle");
    expect(res.turn.proof?.ok).toBe(true);
    expect(res.turn.outcomeSummary).toMatch(/nav/i);
  });

  it("matches signup-form + Focus", async () => {
    const chip = INSTRUCT_CHIP_CATALOG.find((c) => c.id === "focus")!;
    const res = await createStubPipelineProvider().run(
      request(chip.text, ["signup-form"]),
    );

    expect(res.turn.suggestion?.targetHint).toBe("signup-form");
    expect(res.turn.plan?.summary).toMatch(/focus/i);
    expect(res.turn.proof?.ok).toBe(true);
  });

  it("matches hero-cta + Primary CTA distinctly from contrast", async () => {
    const chip = INSTRUCT_CHIP_CATALOG.find((c) => c.id === "primary-cta")!;
    const res = await createStubPipelineProvider().run(
      request(chip.text, ["hero-cta"]),
    );

    expect(res.turn.suggestion?.targetHint).toBe("hero-cta");
    expect(res.turn.suggestion?.patch).toMatchObject({
      backgroundColor: "#2a2f36",
      color: "#f7f4ef",
    });
    expect(getStubFixtureById("hero-cta-primary-cta")).toBeTruthy();
  });

  it("falls back with model stub-fallback when nothing matches", async () => {
    const req = request("Translate this region into Klingon poetry", [
      "unrelated-widget",
    ]);
    const resolved = resolveStubRun(req);

    expect(resolved.fixture.id).toBe("fallback");
    expect(resolved.model).toBe("stub-fallback");
    expect(resolved.score).toBe(0);

    const res = await createStubPipelineProvider().run(req);
    expect(res.model).toBe("stub-fallback");
    expect(res.turn.proof?.ok).toBe(true);
    expect(res.turn.suggestion?.targetHint).toBe("unrelated-widget");
  });

  it("allows forcing a fixture id", async () => {
    const res = await createStubPipelineProvider({
      fixtureId: "signup-form-focus",
    }).run(request("anything", ["hero-cta"]));

    expect(res.turn.suggestion?.targetHint).toBe("signup-form");
    expect(res.model).toBe("stub-pipeline");
  });
});
