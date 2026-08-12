import { describe, expect, it } from "vitest";
import {
  EditBriefSchema,
  EditPlanSchema,
  ProofResultSchema,
  SuggestionPayloadSchema,
} from "@/lib/schemas";
import {
  HERO_CTA_CONTRAST_FIXTURE_ID,
  LANDING_DEMO_FIXTURES,
  LANDING_MONET_IDS,
  LANDING_SAMPLE_MAP,
  getLandingFixtureById,
  listLandingFixturesForRegion,
  matchLandingDemoFixture,
} from "./index";

describe("landing demo fixtures (S3-I)", () => {
  it("covers every sample data-monet-id from TRD §23", () => {
    const hints = new Set(
      LANDING_DEMO_FIXTURES.flatMap((f) => f.regionHints),
    );
    for (const id of LANDING_MONET_IDS) {
      expect(hints.has(id)).toBe(true);
    }
    expect(LANDING_SAMPLE_MAP.monetIds).toEqual([...LANDING_MONET_IDS]);
  });

  it("keeps suggestion.targetHint aligned with regionHints + plan.targetIds", () => {
    for (const fixture of LANDING_DEMO_FIXTURES) {
      expect(fixture.regionHints).toContain(fixture.suggestion.targetHint);
      expect(fixture.plan.targetIds).toContain(fixture.suggestion.targetHint);
      expect(fixture.chips.length).toBeGreaterThan(0);
    }
  });

  it("validates turn payloads against pipeline Zod schemas", () => {
    for (const fixture of LANDING_DEMO_FIXTURES) {
      EditBriefSchema.parse(fixture.brief);
      EditPlanSchema.parse(fixture.plan);
      SuggestionPayloadSchema.parse(fixture.suggestion);
      ProofResultSchema.parse(fixture.proof);
      expect(fixture.proof.ok).toBe(true);
      expect(fixture.suggestion.kind).toBe("style-patch");
    }
  });

  it("exposes the hero-cta contrast gate fixture with sample-aligned patch", () => {
    const gate = getLandingFixtureById(HERO_CTA_CONTRAST_FIXTURE_ID);
    expect(gate).toBeDefined();
    expect(gate?.regionHints).toContain("hero-cta");
    expect(gate?.chips).toContain("contrast");
    expect(gate?.suggestion.patch).toMatchObject({
      color: "#1a1f26",
      backgroundColor: "#e8e0d4",
    });
    expect(LANDING_SAMPLE_MAP.knownIssues["hero-cta"].css.passAA).toBe(false);
    expect(LANDING_SAMPLE_MAP.gatePath.fixtureId).toBe(
      HERO_CTA_CONTRAST_FIXTURE_ID,
    );
  });

  it("lists two hero-cta pitch paths (contrast + primary-cta)", () => {
    const hero = listLandingFixturesForRegion("hero-cta");
    expect(hero.map((f) => f.id).sort()).toEqual([
      "hero-cta-contrast",
      "hero-cta-primary-cta",
    ]);
  });

  it("matchLandingDemoFixture prefers hero-cta + contrast keywords", () => {
    const matched = matchLandingDemoFixture({
      targetIds: ["hero-cta"],
      instruction: "Improve contrast so text and controls pass WCAG AA.",
    });
    expect(matched?.id).toBe(HERO_CTA_CONTRAST_FIXTURE_ID);
  });

  it("matchLandingDemoFixture maps primary-nav hierarchy + signup focus", () => {
    expect(
      matchLandingDemoFixture({
        targetIds: ["primary-nav"],
        instruction:
          "Clarify visual hierarchy so the primary action stands out.",
        chipId: "hierarchy",
      })?.id,
    ).toBe("primary-nav-hierarchy");

    expect(
      matchLandingDemoFixture({
        targetIds: ["signup-form"],
        instruction:
          "Add clear focus rings and error affordances for accessibility.",
        chipId: "focus",
      })?.id,
    ).toBe("signup-form-focus");
  });
});
