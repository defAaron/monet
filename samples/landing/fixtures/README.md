# Landing demo fixtures (S3-I)

Canonical pitch-spine fixtures for `sampleId: "landing"`.
**S3-B should import these** instead of maintaining a parallel copy under
`lib/pipeline/stub/fixtures/`.

## Import (for S3-B)

```ts
// Option A — catalog + helpers
import {
  LANDING_DEMO_FIXTURES,
  HERO_CTA_CONTRAST_FIXTURE_ID,
  getLandingFixtureById,
} from "@/samples/landing/fixtures";

// Option B — raw JSON (drop-in for StubFixtureSchema.parse)
import heroCtaContrast from "@/samples/landing/fixtures/hero-cta-contrast.json";
import heroCtaPrimaryCta from "@/samples/landing/fixtures/hero-cta-primary-cta.json";
import primaryNavHierarchy from "@/samples/landing/fixtures/primary-nav-hierarchy.json";
import signupFormFocus from "@/samples/landing/fixtures/signup-form-focus.json";
```

Fixture shape matches `StubFixtureSchema` (`id`, `regionHints`, `chips`,
`keywords`, `brief`, `plan`, `suggestion`, `proof`, `outcomeSummary`).

Production matching stays in `lib/pipeline/stub/match.ts` (S3-B).

## TRD §23 ↔ sample IDs

| Fixture id | `data-monet-id` | Chip | Patch | Sample before |
|---|---|---|---|---|
| `hero-cta-contrast` | `hero-cta` | Contrast | `style-patch` → `#1a1f26` / `#e8e0d4` | `#a89a8c` on `#cfc6bb` (~1.62:1) |
| `hero-cta-primary-cta` | `hero-cta` | Primary CTA | `style-patch` solid ink | Washed CTA vs ghost secondary |
| `primary-nav-hierarchy` | `primary-nav` | Hierarchy | `style-patch` quieter weight | Crowded links + dual pills |
| `signup-form-focus` | `signup-form` | Focus | `style-patch` outline ring | `outline: none` on inputs |

## Gate path

Minimum closed-loop demo: **`hero-cta-contrast`** (`HERO_CTA_CONTRAST_FIXTURE_ID`).

Chip text (from instruct catalog):
`Improve contrast so text and controls pass WCAG AA.`

## Optional class hooks (sample CSS)

`SampleLanding.module.css` also defines global apply hooks if stub/apply later
prefer `class-toggle`:

| Class | Target | Effect |
|---|---|---|
| `monet-demo-hierarchy` | `primary-nav` | Quiet links; Start free primary; Book demo demoted |
| `monet-demo-focus` | `signup-form` | Descendant focus rings + `:user-invalid` borders |

See `sample-map.json` for the issue inventory.

## Files

```
samples/landing/fixtures/
  hero-cta-contrast.json
  hero-cta-primary-cta.json
  primary-nav-hierarchy.json
  signup-form-focus.json
  sample-map.json
  index.ts
  fixtures.test.ts
  README.md
```
