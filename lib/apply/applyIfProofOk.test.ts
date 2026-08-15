import { describe, expect, it } from "vitest";
import type { EditPlan, ProofResult, SuggestionPayload } from "@/lib/schemas";
import {
  applyIfProofOk,
  resolveAllowedTargetIds,
  type ProofGatedTurn,
} from "./applyIfProofOk";

type StubOpts = {
  monetId?: string;
  tagName?: string;
};

function createStyleBag() {
  const props = new Map<string, string>();
  return {
    getPropertyValue(name: string) {
      return props.get(name) ?? "";
    },
    setProperty(name: string, value: string) {
      props.set(name, String(value));
    },
    removeProperty(name: string) {
      const prev = props.get(name) ?? "";
      props.delete(name);
      return prev;
    },
  };
}

function createElement(opts: StubOpts = {}): HTMLElement {
  const attrs = new Map<string, string>();
  if (opts.monetId) attrs.set("data-monet-id", opts.monetId);
  const style = createStyleBag();
  const children: HTMLElement[] = [];

  const el = {
    tagName: (opts.tagName ?? "DIV").toUpperCase(),
    style,
    children,
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    contains(node: Node) {
      if ((node as unknown) === el) return true;
      return children.includes(node as HTMLElement);
    },
    querySelectorAll(selector: string) {
      if (!selector.includes("data-monet-id")) {
        return [] as unknown as NodeListOf<Element>;
      }
      const matches = children.filter((c) => c.getAttribute("data-monet-id"));
      return matches as unknown as NodeListOf<Element>;
    },
  };

  return el as unknown as HTMLElement;
}

function createPreviewRoot(children: HTMLElement[]): HTMLElement {
  const root = createElement();
  (root as unknown as { children: HTMLElement[] }).children = children;
  root.querySelectorAll = ((selector: string) => {
    if (!selector.includes("data-monet-id")) {
      return [] as unknown as NodeListOf<Element>;
    }
    return children.filter((c) =>
      c.getAttribute("data-monet-id"),
    ) as unknown as NodeListOf<Element>;
  }) as typeof root.querySelectorAll;
  root.contains = ((node: Node) => {
    if ((node as unknown) === root) return true;
    return children.includes(node as HTMLElement);
  }) as typeof root.contains;
  return root;
}

const heroSuggestion: SuggestionPayload = {
  kind: "style-patch",
  targetHint: "hero-cta",
  patch: {
    color: "#1a1f26",
    backgroundColor: "#e8e0d4",
    borderColor: "#2a2f36",
  },
  previewLabel: "Raise CTA contrast (AA)",
};

const heroPlan: EditPlan = {
  summary: "Recolor the hero CTA so Scout’s contrast fail clears AA.",
  targetIds: ["hero-cta"],
  changes: [
    {
      targetId: "hero-cta",
      description: "Darken label; lighten fill",
    },
  ],
};

const proofOk: ProofResult = {
  ok: true,
  notes: "hero-cta contrast AA pass.",
};

const proofFail: ProofResult = {
  ok: false,
  notes: "Contrast still below AA.",
  issues: ["contrast"],
};

describe("resolveAllowedTargetIds", () => {
  it("prefers plan.targetIds", () => {
    const turn: ProofGatedTurn = {
      plan: heroPlan,
      suggestion: heroSuggestion,
    };
    expect(resolveAllowedTargetIds(turn)).toEqual(["hero-cta"]);
  });

  it("falls back to suggestion targetHint", () => {
    const turn: ProofGatedTurn = { suggestion: heroSuggestion };
    expect(resolveAllowedTargetIds(turn)).toEqual(["hero-cta"]);
  });
});

describe("applyIfProofOk", () => {
  it("applies hero-cta contrast when proof.ok", () => {
    const cta = createElement({ monetId: "hero-cta", tagName: "BUTTON" });
    const root = createPreviewRoot([cta]);

    const result = applyIfProofOk(
      {
        id: "turn-hero",
        plan: heroPlan,
        suggestion: heroSuggestion,
        proof: proofOk,
      },
      root,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.targetId).toBe("hero-cta");
    expect(result.turnId).toBe("turn-hero");
    expect(cta.style.getPropertyValue("color")).toBe("#1a1f26");
    expect(cta.style.getPropertyValue("background-color")).toBe("#e8e0d4");
  });

  it("refuses when proof.ok is false", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);

    const result = applyIfProofOk(
      {
        suggestion: heroSuggestion,
        plan: heroPlan,
        proof: proofFail,
      },
      root,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("proof-not-ok");
    expect(cta.style.getPropertyValue("color")).toBe("");
  });

  it("refuses when proof is missing", () => {
    const root = createPreviewRoot([
      createElement({ monetId: "hero-cta" }),
    ]);
    const result = applyIfProofOk(
      { suggestion: heroSuggestion, plan: heroPlan },
      root,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("proof-missing");
  });

  it("refuses when suggestion is missing after proof ok", () => {
    const root = createPreviewRoot([
      createElement({ monetId: "hero-cta" }),
    ]);
    const result = applyIfProofOk({ proof: proofOk, plan: heroPlan }, root);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("suggestion-missing");
  });

  it("refuses when already applied", () => {
    const root = createPreviewRoot([
      createElement({ monetId: "hero-cta" }),
    ]);
    const result = applyIfProofOk(
      {
        applied: true,
        proof: proofOk,
        suggestion: heroSuggestion,
        plan: heroPlan,
      },
      root,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("already-applied");
  });

  it("scopes via plan.targetIds (blocks out-of-plan target)", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const result = applyIfProofOk(
      {
        proof: proofOk,
        suggestion: heroSuggestion,
        plan: {
          summary: "Wrong scope",
          targetIds: ["signup-form"],
          changes: [],
        },
      },
      root,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("target-unscoped");
  });
});
