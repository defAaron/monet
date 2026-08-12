import { z } from "zod";
import {
  EditBriefSchema,
  EditPlanSchema,
  ProofResultSchema,
  SuggestionPayloadSchema,
} from "@/lib/schemas";

import heroCtaContrast from "./fixtures/hero-cta-contrast.json";
import heroCtaPrimaryCta from "./fixtures/hero-cta-primary-cta.json";
import primaryNavHierarchy from "./fixtures/primary-nav-hierarchy.json";
import signupFormFocus from "./fixtures/signup-form-focus.json";
import fallbackJson from "./fixtures/fallback.json";

/** Static demo fixture keyed by region hint + instruction chip (TRD §5.2 / §23). */
export const StubFixtureSchema = z.object({
  id: z.string().min(1),
  regionHints: z.array(z.string()),
  chips: z.array(z.string()),
  keywords: z.array(z.string()),
  brief: EditBriefSchema,
  plan: EditPlanSchema,
  suggestion: SuggestionPayloadSchema,
  /** Optional Brush revise payload when Proof requests one revise. */
  suggestionRevised: SuggestionPayloadSchema.optional(),
  proof: ProofResultSchema,
  /** Second Proof result after a revise; defaults to proof when omitted. */
  proofAfterRevise: ProofResultSchema.optional(),
  outcomeSummary: z.string().optional(),
});

export type StubFixture = z.infer<typeof StubFixtureSchema>;

const DEMO_RAW = [
  heroCtaContrast,
  heroCtaPrimaryCta,
  primaryNavHierarchy,
  signupFormFocus,
] as const;

/** Pitch-path fixtures from TRD §23 (excludes fallback). */
export const STUB_DEMO_FIXTURES: readonly StubFixture[] = DEMO_RAW.map((raw) =>
  StubFixtureSchema.parse(raw),
);

/** Conservative offline fallback when no region/chip match (model: stub-fallback). */
export const STUB_FALLBACK_FIXTURE: StubFixture =
  StubFixtureSchema.parse(fallbackJson);

/** Full catalog including fallback. */
export const STUB_FIXTURES: readonly StubFixture[] = [
  ...STUB_DEMO_FIXTURES,
  STUB_FALLBACK_FIXTURE,
];

export function getStubFixtureById(id: string): StubFixture | undefined {
  return STUB_FIXTURES.find((f) => f.id === id);
}
