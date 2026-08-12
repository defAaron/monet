import type { PipelineRequest } from "../types";
import {
  STUB_DEMO_FIXTURES,
  STUB_FALLBACK_FIXTURE,
  type StubFixture,
} from "./fixtures";

/** Preferred demo region order when multiple targetIds overlap a lasso. */
const REGION_PRIORITY = ["hero-cta", "primary-nav", "signup-form"] as const;

export type StubMatchResult = {
  fixture: StubFixture;
  /** Highest scoring demo fixture, or fallback when score is 0. */
  score: number;
  regionHint: string | undefined;
  matchedKeywords: string[];
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pick the best demo region hint from Scout targetIds (TRD §23 keys).
 */
export function inferRegionHint(
  targetIds: readonly string[] | undefined,
): string | undefined {
  if (!targetIds || targetIds.length === 0) return undefined;

  for (const preferred of REGION_PRIORITY) {
    if (targetIds.includes(preferred)) return preferred;
  }

  return targetIds[0];
}

function keywordHits(instruction: string, keywords: readonly string[]): string[] {
  const hay = normalize(instruction);
  const hits: string[] = [];
  for (const kw of keywords) {
    const needle = normalize(kw);
    if (!needle) continue;
    if (hay.includes(needle)) hits.push(kw);
  }
  return hits;
}

function scoreFixture(
  fixture: StubFixture,
  regionHint: string | undefined,
  instruction: string,
): { score: number; matchedKeywords: string[] } {
  let score = 0;
  const matchedKeywords = keywordHits(instruction, fixture.keywords);

  if (regionHint && fixture.regionHints.includes(regionHint)) {
    score += 10;
  }

  // Chip id exact token (e.g. "contrast", "hierarchy", "focus", "primary-cta")
  const hay = normalize(instruction);
  for (const chip of fixture.chips) {
    const chipNorm = normalize(chip);
    if (!chipNorm) continue;
    if (hay.includes(chipNorm) || hay.includes(chipNorm.replace(/-/g, " "))) {
      score += 6;
    }
  }

  score += matchedKeywords.length * 3;

  // Contrast fail + contrast fixture: soft boost when region matches hero-cta
  // (chip text often says "Improve contrast…") — already covered by keywords.

  return { score, matchedKeywords };
}

/**
 * Resolve a deterministic stub fixture from region heuristic + instruction keywords.
 * Returns the fallback fixture (score 0) when nothing matches.
 */
export function matchStubFixture(req: PipelineRequest): StubMatchResult {
  const regionHint = inferRegionHint(req.facts.targetIds);
  const instruction = req.instruction;

  let best: StubMatchResult | undefined;

  for (const fixture of STUB_DEMO_FIXTURES) {
    const { score, matchedKeywords } = scoreFixture(
      fixture,
      regionHint,
      instruction,
    );
    if (!best || score > best.score) {
      best = { fixture, score, regionHint, matchedKeywords };
    }
  }

  if (!best || best.score <= 0) {
    const fallback = adaptFallbackToRequest(STUB_FALLBACK_FIXTURE, regionHint);
    return {
      fixture: fallback,
      score: 0,
      regionHint,
      matchedKeywords: [],
    };
  }

  return best;
}

/**
 * When falling back, retarget plan/suggestion to the inferred region if known.
 */
function adaptFallbackToRequest(
  fallback: StubFixture,
  regionHint: string | undefined,
): StubFixture {
  if (!regionHint) return fallback;

  return {
    ...fallback,
    plan: {
      ...fallback.plan,
      targetIds: [regionHint],
      changes: fallback.plan.changes.map((c, i) =>
        i === 0 ? { ...c, targetId: regionHint } : c,
      ),
    },
    suggestion: {
      ...fallback.suggestion,
      targetHint: regionHint,
    },
  };
}

/** Model id reported on PipelineResponse for a matched fixture. */
export function stubModelForFixture(fixture: StubFixture): string {
  return fixture.id === "fallback" ? "stub-fallback" : "stub-pipeline";
}
