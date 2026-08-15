import { describe, expect, it } from "vitest";
import type { SuggestionPayload } from "@/lib/schemas";
import {
  applySuggestion,
  revertSuggestion,
  ApplyUndoStack,
  resolveMonetTarget,
  isSafePatchString,
} from "./index";

type StubOpts = {
  monetId?: string;
  tagName?: string;
  text?: string;
  classNames?: string[];
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

function createClassList(initial: string[] = []) {
  const set = new Set(initial);
  return {
    add(...names: string[]) {
      for (const n of names) set.add(n);
    },
    remove(...names: string[]) {
      for (const n of names) set.delete(n);
    },
    contains(name: string) {
      return set.has(name);
    },
    toggle(name: string) {
      if (set.has(name)) {
        set.delete(name);
        return false;
      }
      set.add(name);
      return true;
    },
    toArray() {
      return [...set];
    },
  };
}

function createElement(opts: StubOpts = {}): HTMLElement {
  const attrs = new Map<string, string>();
  if (opts.monetId) attrs.set("data-monet-id", opts.monetId);

  let textContent = opts.text ?? "";
  const style = createStyleBag();
  const classList = createClassList(opts.classNames ?? []);
  const children: HTMLElement[] = [];

  const el = {
    tagName: (opts.tagName ?? "DIV").toUpperCase(),
    style,
    classList,
    children,
    get textContent() {
      return textContent;
    },
    set textContent(value: string) {
      textContent = value;
    },
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

function createPreviewRoot(targets: HTMLElement[]): HTMLElement {
  const root = createElement({ tagName: "DIV" });
  (root as unknown as { children: HTMLElement[] }).children.push(...targets);
  for (const child of targets) {
    Object.defineProperty(child, "contains", {
      value(node: Node) {
        return node === child;
      },
    });
  }
  Object.defineProperty(root, "contains", {
    value(node: Node) {
      if (node === root) return true;
      return targets.includes(node as HTMLElement);
    },
  });
  return root;
}

describe("resolveMonetTarget", () => {
  it("resolves bare data-monet-id hints", () => {
    const cta = createElement({ monetId: "hero-cta", tagName: "BUTTON" });
    const root = createPreviewRoot([cta]);
    const resolved = resolveMonetTarget(root, "hero-cta");
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.monetId).toBe("hero-cta");
      expect(resolved.element).toBe(cta);
    }
  });

  it("resolves [data-monet-id] attribute selectors", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const resolved = resolveMonetTarget(root, '[data-monet-id="hero-cta"]');
    expect(resolved.ok).toBe(true);
  });

  it("rejects arbitrary CSS selectors", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const resolved = resolveMonetTarget(root, "body button");
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe("target-unscoped");
  });
});

describe("applySuggestion", () => {
  it("applies style-patch to data-monet-id target (hero-cta fixture shape)", () => {
    const cta = createElement({ monetId: "hero-cta", tagName: "BUTTON" });
    const root = createPreviewRoot([cta]);
    const suggestion: SuggestionPayload = {
      kind: "style-patch",
      targetHint: "hero-cta",
      patch: {
        color: "#1a1f26",
        backgroundColor: "#e8e0d4",
        borderColor: "#2a2f36",
      },
      previewLabel: "Raise CTA contrast (AA)",
    };

    const result = applySuggestion({ suggestion, previewRoot: root, turnId: "t1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.targetId).toBe("hero-cta");
    expect(cta.style.getPropertyValue("color")).toBe("#1a1f26");
    expect(cta.style.getPropertyValue("background-color")).toBe("#e8e0d4");
    expect(cta.style.getPropertyValue("border-color")).toBe("#2a2f36");
    expect(result.turnId).toBe("t1");
  });

  it("reverts style-patch via inverse + revertSuggestion", () => {
    const cta = createElement({ monetId: "hero-cta", tagName: "BUTTON" });
    cta.style.setProperty("color", "#abc");
    const root = createPreviewRoot([cta]);

    const applied = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { color: "#111111" },
        previewLabel: "Darken",
      },
      previewRoot: root,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(cta.style.getPropertyValue("color")).toBe("#111111");

    const reverted = revertSuggestion(applied, root);
    expect(reverted.ok).toBe(true);
    expect(cta.style.getPropertyValue("color")).toBe("#abc");
  });

  it("applies class-toggle add/remove", () => {
    const nav = createElement({
      monetId: "primary-nav",
      classNames: ["loud"],
    });
    const root = createPreviewRoot([nav]);

    const result = applySuggestion({
      suggestion: {
        kind: "class-toggle",
        targetHint: "primary-nav",
        patch: { add: ["quiet"], remove: ["loud"] },
        previewLabel: "Quiet nav",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(true);
    expect(nav.classList.contains("quiet")).toBe(true);
    expect(nav.classList.contains("loud")).toBe(false);

    if (!result.ok) return;
    const reverted = revertSuggestion(result, root);
    expect(reverted.ok).toBe(true);
    expect(nav.classList.contains("loud")).toBe(true);
    expect(nav.classList.contains("quiet")).toBe(false);
  });

  it("pins data-monet-hook for demo class-toggle classes", () => {
    const nav = createElement({ monetId: "primary-nav" });
    const root = createPreviewRoot([nav]);

    const result = applySuggestion({
      suggestion: {
        kind: "class-toggle",
        targetHint: "primary-nav",
        patch: { add: ["monet-demo-hierarchy"] },
        previewLabel: "Hierarchy hook",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(true);
    expect(nav.getAttribute("data-monet-hook")).toBe("hierarchy");

    if (!result.ok) return;
    const reverted = revertSuggestion(result, root);
    expect(reverted.ok).toBe(true);
    expect(nav.getAttribute("data-monet-hook")).toBeNull();
  });

  it("applies css-var on preview root while scoping via monet id hint", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);

    const result = applySuggestion({
      suggestion: {
        kind: "css-var",
        targetHint: "hero-cta",
        patch: { "--brand-ink": "#2a2f36", accent: "#c45" },
        previewLabel: "Brand vars",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(true);
    expect(root.style.getPropertyValue("--brand-ink")).toBe("#2a2f36");
    expect(root.style.getPropertyValue("--accent")).toBe("#c45");
  });

  it("applies text-replace safely", () => {
    const cta = createElement({
      monetId: "hero-cta",
      tagName: "BUTTON",
      text: "Get started",
    });
    const root = createPreviewRoot([cta]);

    const result = applySuggestion({
      suggestion: {
        kind: "text-replace",
        targetHint: "hero-cta",
        patch: { text: "Try Monet" },
        previewLabel: "Rename CTA",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(true);
    expect(cta.textContent).toBe("Try Monet");

    if (!result.ok) return;
    revertSuggestion(result, root);
    expect(cta.textContent).toBe("Get started");
  });

  it("blocks javascript: in style values", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const result = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { backgroundImage: "url(javascript:alert(1))" },
        previewLabel: "Bad",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsafe-patch");
  });

  it("blocks text-replace on SCRIPT", () => {
    const bad = createElement({
      monetId: "hero-cta",
      tagName: "SCRIPT",
      text: "",
    });
    const root = createPreviewRoot([bad]);
    const result = applySuggestion({
      suggestion: {
        kind: "text-replace",
        targetHint: "hero-cta",
        patch: { text: "x" },
        previewLabel: "Nope",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("unsafe-patch");
  });

  it("fails when target is missing", () => {
    const root = createPreviewRoot([]);
    const result = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { color: "#000" },
        previewLabel: "Missing",
      },
      previewRoot: root,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("target-not-found");
  });

  it("enforces allowedTargetIds", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const result = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { color: "#000" },
        previewLabel: "Scoped",
      },
      previewRoot: root,
      allowedTargetIds: ["signup-form"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("target-unscoped");
  });
});

describe("ApplyUndoStack", () => {
  it("pushes from success and pops LIFO", () => {
    const cta = createElement({ monetId: "hero-cta" });
    const root = createPreviewRoot([cta]);
    const stack = new ApplyUndoStack();

    const a = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: { color: "#111" },
        previewLabel: "A",
      },
      previewRoot: root,
      turnId: "turn-a",
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(stack.pushFromSuccess(a)).toBe(true);

    const entry = stack.pop();
    expect(entry?.turnId).toBe("turn-a");
    expect(stack.size).toBe(0);
  });
});

describe("isSafePatchString", () => {
  it("rejects script-like payloads", () => {
    expect(isSafePatchString("javascript:void(0)")).toBe(false);
    expect(isSafePatchString("<script>alert(1)</script>")).toBe(false);
    expect(isSafePatchString("#1a1f26")).toBe(true);
  });
});
