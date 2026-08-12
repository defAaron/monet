/**
 * Demo fixture pack for sample/landing (S3-I · TRD §23).
 *
 * Canonical pitch-spine JSON for StubPipelineProvider (S3-B).
 * Prefer importing from here instead of duplicating under lib/pipeline/stub/fixtures/.
 */
import { z } from "zod";
import {
  EditBriefSchema,
  EditPlanSchema,
  ProofResultSchema,
  SuggestionPayloadSchema,
} from "@/lib/schemas";

import heroCtaContrast from "./hero-cta-contrast.json";
import heroCtaPrimaryCta from "./hero-cta-primary-cta.json";
import primaryNavHierarchy from "./primary-nav-hierarchy.json";
import signupFormFocus from "./signup-form-focus.json";
import sampleMapJson from "./sample-map.json";

/**
 * Stub-compatible fixture shape (matches lib/pipeline/stub StubFixtureSchema).
 * S3-B can `import … from "@/samples/landing/fixtures/*.json"` and parse with its schema.
 */
export const LandingDemoFixtureSchema = z.object({
  id: z.string().min(1),
  regionHints: z.array(z.string()).min(1),
  chips: z.array(z.string()).min(1),
  keywords: z.array(z.string()).min(1),
  brief: EditBriefSchema,
  plan: EditPlanSchema,
  suggestion: SuggestionPayloadSchema,
  suggestionRevised: SuggestionPayloadSchema.optional(),
  proof: ProofResultSchema,
  proofAfterRevise: ProofResultSchema.optional(),
  outcomeSummary: z.string().optional(),
});

export type LandingDemoFixture = z.infer<typeof LandingDemoFixtureSchema>;

const DEMO_RAW = [
  heroCtaContrast,
  heroCtaPrimaryCta,
  primaryNavHierarchy,
  signupFormFocus,
] as const;

/** Pitch-path fixtures from TRD §23 (sample/landing). */
export const LANDING_DEMO_FIXTURES: readonly LandingDemoFixture[] =
  DEMO_RAW.map((raw) => LandingDemoFixtureSchema.parse(raw));

/** Stable sample `data-monet-id`s on SampleLanding. */
export const LANDING_MONET_IDS = [
  "hero-cta",
  "primary-nav",
  "signup-form",
] as const;

export type LandingMonetId = (typeof LANDING_MONET_IDS)[number];

/** Closed-loop gate path (S3 gate): hero-cta + Contrast. */
export const HERO_CTA_CONTRAST_FIXTURE_ID = "hero-cta-contrast" as const;

/** Sample issue map + optional class-toggle hooks (not required by stub). */
export const LANDING_SAMPLE_MAP = sampleMapJson;

/** Import path constant for S3-B docs / wiring. */
export const LANDING_FIXTURES_IMPORT =
  "@/samples/landing/fixtures" as const;

export function getLandingFixtureById(
  id: string,
): LandingDemoFixture | undefined {
  return LANDING_DEMO_FIXTURES.find((f) => f.id === id);
}

export function listLandingFixturesForRegion(
  regionHint: string,
): LandingDemoFixture[] {
  return LANDING_DEMO_FIXTURES.filter((f) =>
    f.regionHints.includes(regionHint),
  );
}

export type MatchLandingFixtureInput = {
  targetIds?: string[] | null;
  instruction?: string | null;
  chipId?: string | null;
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lightweight matcher mirrored for sample-side tests / docs.
 * S3-B owns production matching in `lib/pipeline/stub/match.ts`.
 */
export function matchLandingDemoFixture(
  input: MatchLandingFixtureInput,
): LandingDemoFixture | null {
  const targets = input.targetIds ?? [];
  const instruction = normalize(input.instruction ?? "");
  const chipId = input.chipId ? normalize(input.chipId) : null;

  let best: LandingDemoFixture | null = null;
  let bestScore = 0;

  for (const fixture of LANDING_DEMO_FIXTURES) {
    let score = 0;
    const regionHit = fixture.regionHints.some((h) => targets.includes(h));
    if (targets.length > 0 && !regionHit) continue;
    if (regionHit) score += 10;

    if (chipId && fixture.chips.some((c) => normalize(c) === chipId)) {
      score += 20;
    }

    if (instruction) {
      let hits = 0;
      for (const kw of fixture.keywords) {
        if (instruction.includes(normalize(kw))) hits += 1;
      }
      for (const chip of fixture.chips) {
        const c = normalize(chip);
        if (
          instruction.includes(c) ||
          instruction.includes(c.replace(/-/g, " "))
        ) {
          hits += 1;
        }
      }
      if (hits === 0 && !chipId) continue;
      score += hits * 3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = fixture;
    }
  }

  return bestScore > 0 ? best : null;
}
