import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLY_MORPH_CLASS,
  APPLY_MORPH_MS,
  clearApplyMorph,
  flashApplyMorph,
} from "./morph";

function createEl(classNames: string[] = []): HTMLElement {
  const set = new Set(classNames);
  return {
    classList: {
      add(...names: string[]) {
        for (const n of names) set.add(n);
      },
      remove(...names: string[]) {
        for (const n of names) set.delete(n);
      },
      contains(name: string) {
        return set.has(name);
      },
    },
    offsetWidth: 1,
  } as unknown as HTMLElement;
}

afterEach(() => {
  clearApplyMorph();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("flashApplyMorph", () => {
  it("adds then removes the morph class after the duration", () => {
    vi.useFakeTimers();
    const el = createEl();

    flashApplyMorph(el);
    expect(el.classList.contains(APPLY_MORPH_CLASS)).toBe(true);

    vi.advanceTimersByTime(APPLY_MORPH_MS);
    expect(el.classList.contains(APPLY_MORPH_CLASS)).toBe(false);
  });

  it("skips when prefers-reduced-motion is reduce", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    const el = createEl();
    flashApplyMorph(el);
    expect(el.classList.contains(APPLY_MORPH_CLASS)).toBe(false);
  });

  it("moves the class when a second element flashes", () => {
    vi.useFakeTimers();
    const a = createEl();
    const b = createEl();

    flashApplyMorph(a);
    flashApplyMorph(b);

    expect(a.classList.contains(APPLY_MORPH_CLASS)).toBe(false);
    expect(b.classList.contains(APPLY_MORPH_CLASS)).toBe(true);
  });
});
