import { describe, expect, it } from "vitest";
import {
  ApplyUndoStack,
  applyComparePhase,
  applySuggestion,
} from "./index";

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

function createElement(monetId: string): HTMLElement {
  const attrs = new Map<string, string>([["data-monet-id", monetId]]);
  const style = createStyleBag();
  const children: HTMLElement[] = [];
  const el = {
    tagName: "BUTTON",
    style,
    children,
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    contains(node: Node) {
      return (node as unknown) === el;
    },
    querySelectorAll() {
      return [] as unknown as NodeListOf<Element>;
    },
  };
  return el as unknown as HTMLElement;
}

function createPreviewRoot(target: HTMLElement): HTMLElement {
  const root = createElement("root");
  (root as unknown as { children: HTMLElement[] }).children.push(target);
  Object.defineProperty(root, "contains", {
    value(node: Node) {
      return node === root || node === target;
    },
  });
  Object.defineProperty(root, "getAttribute", {
    value() {
      return null;
    },
  });
  Object.defineProperty(root, "querySelectorAll", {
    value(selector: string) {
      if (!selector.includes("data-monet-id")) {
        return [] as unknown as NodeListOf<Element>;
      }
      return [target] as unknown as NodeListOf<Element>;
    },
  });
  return root;
}

describe("applyComparePhase (S3-G before/after)", () => {
  it("toggles hero-cta contrast patch without popping the stack", () => {
    const cta = createElement("hero-cta");
    cta.style.setProperty("color", "#a89a8c");
    cta.style.setProperty("background-color", "#cfc6bb");
    const root = createPreviewRoot(cta);
    const stack = new ApplyUndoStack();

    const applied = applySuggestion({
      suggestion: {
        kind: "style-patch",
        targetHint: "hero-cta",
        patch: {
          color: "#1a1f26",
          backgroundColor: "#e8e0d4",
          borderColor: "#2a2f36",
        },
        previewLabel: "Raise CTA contrast (AA)",
      },
      previewRoot: root,
      turnId: "turn-hero-cta",
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(stack.pushFromSuccess(applied)).toBe(true);

    expect(cta.style.getPropertyValue("color")).toBe("#1a1f26");

    const before = applyComparePhase(stack.peek()!, root, "before");
    expect(before.ok).toBe(true);
    expect(cta.style.getPropertyValue("color")).toBe("#a89a8c");
    expect(stack.size).toBe(1);

    const after = applyComparePhase(stack.peek()!, root, "after");
    expect(after.ok).toBe(true);
    expect(cta.style.getPropertyValue("color")).toBe("#1a1f26");
    expect(stack.size).toBe(1);
  });
});
