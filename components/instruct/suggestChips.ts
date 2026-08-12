import type { RegionFacts } from "@/lib/schemas";

/** Demo-aligned suggestion chips (PRD F4 / TRD §23). Prefill only — never auto-run. */
export type InstructChipId =
  | "contrast"
  | "hierarchy"
  | "spacing"
  | "focus"
  | "primary-cta";

export interface InstructChip {
  id: InstructChipId;
  label: string;
  /** Full instruction text written into the input on click. */
  text: string;
}

export const INSTRUCT_CHIP_CATALOG: readonly InstructChip[] = [
  {
    id: "contrast",
    label: "Contrast",
    text: "Improve contrast so text and controls pass WCAG AA.",
  },
  {
    id: "hierarchy",
    label: "Hierarchy",
    text: "Clarify visual hierarchy so the primary action stands out.",
  },
  {
    id: "spacing",
    label: "Spacing",
    text: "Loosen spacing so the layout breathes.",
  },
  {
    id: "focus",
    label: "Focus",
    text: "Add clear focus rings and error affordances for accessibility.",
  },
  {
    id: "primary-cta",
    label: "Primary CTA",
    text: "Make this CTA the clear primary action.",
  },
] as const;

const BY_ID = new Map(
  INSTRUCT_CHIP_CATALOG.map((chip) => [chip.id, chip] as const),
);

const DEFAULT_ORDER: InstructChipId[] = [
  "contrast",
  "hierarchy",
  "spacing",
];

const MAX_CHIPS = 4;

function chip(id: InstructChipId): InstructChip {
  const found = BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown instruct chip: ${id}`);
  }
  return found;
}

/**
 * Order suggestion chips from Scout facts (target ids, contrast fails, density).
 * Always returns a small set suitable for the instruct rail.
 */
export function suggestInstructChips(
  facts?: RegionFacts | null,
): InstructChip[] {
  if (!facts) {
    return DEFAULT_ORDER.map(chip);
  }

  const scores = new Map<InstructChipId, number>([
    ["contrast", 1],
    ["hierarchy", 1],
    ["spacing", 1],
    ["focus", 0],
    ["primary-cta", 0],
  ]);

  const targets = facts.targetIds ?? [];
  const hasFail = (facts.contrast ?? []).some((pair) => !pair.passAA);

  if (hasFail) {
    scores.set("contrast", (scores.get("contrast") ?? 0) + 4);
  }

  if (targets.includes("hero-cta")) {
    scores.set("primary-cta", (scores.get("primary-cta") ?? 0) + 3);
    scores.set("contrast", (scores.get("contrast") ?? 0) + 2);
  }

  if (targets.includes("primary-nav")) {
    scores.set("hierarchy", (scores.get("hierarchy") ?? 0) + 3);
  }

  if (targets.includes("signup-form")) {
    scores.set("focus", (scores.get("focus") ?? 0) + 3);
  }

  if (facts.interactiveCount >= 3 || facts.linkCount >= 3) {
    scores.set("hierarchy", (scores.get("hierarchy") ?? 0) + 2);
  }

  if ((facts.fonts ?? []).some((f) => (f.sizePx ?? 0) > 0 && (f.sizePx ?? 0) < 14)) {
    scores.set("hierarchy", (scores.get("hierarchy") ?? 0) + 1);
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (
        INSTRUCT_CHIP_CATALOG.findIndex((c) => c.id === a[0]) -
        INSTRUCT_CHIP_CATALOG.findIndex((c) => c.id === b[0])
      );
    })
    .map(([id]) => chip(id));

  return ranked.slice(0, MAX_CHIPS);
}
