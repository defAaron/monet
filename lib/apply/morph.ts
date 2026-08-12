import { queryByMonetId } from "./resolve";

/** Temporary class toggled on mutated preview nodes (see `styles/globals.css`). */
export const APPLY_MORPH_CLASS = "monet-apply-morph";

/** Keep in sync with `--monet-apply-morph-ms` / keyframe duration in globals. */
export const APPLY_MORPH_MS = 420;

type Timer = ReturnType<typeof setTimeout>;

let morphTimer: Timer | null = null;
let morphElement: Element | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function clearMorphTimer(): void {
  if (morphTimer !== null) {
    clearTimeout(morphTimer);
    morphTimer = null;
  }
}

/** Remove any in-flight morph class (tests / rapid apply→undo). */
export function clearApplyMorph(): void {
  clearMorphTimer();
  if (morphElement?.classList?.contains(APPLY_MORPH_CLASS)) {
    morphElement.classList.remove(APPLY_MORPH_CLASS);
  }
  morphElement = null;
}

/**
 * Brief visual cue on a scoped preview node after apply / undo / compare.
 * No-ops under `prefers-reduced-motion: reduce` and outside the browser.
 */
export function flashApplyMorph(element: Element | null | undefined): void {
  if (!element || typeof element.classList?.add !== "function") return;
  if (prefersReducedMotion()) return;

  clearMorphTimer();
  if (morphElement && morphElement !== element) {
    morphElement.classList.remove(APPLY_MORPH_CLASS);
  }

  // Restart CSS animation if the class is already present.
  element.classList.remove(APPLY_MORPH_CLASS);
  if (typeof (element as HTMLElement).offsetWidth === "number") {
    void (element as HTMLElement).offsetWidth;
  }

  element.classList.add(APPLY_MORPH_CLASS);
  morphElement = element;

  morphTimer = setTimeout(() => {
    element.classList.remove(APPLY_MORPH_CLASS);
    if (morphElement === element) morphElement = null;
    morphTimer = null;
  }, APPLY_MORPH_MS);
}

/**
 * Resolve `data-monet-id` under the preview root, then flash.
 * When `targetId` is null, flashes the preview root (e.g. css-var edge cases).
 */
export function flashApplyMorphByTarget(
  previewRoot: Element,
  targetId: string | null,
): void {
  if (targetId) {
    flashApplyMorph(queryByMonetId(previewRoot, targetId));
    return;
  }
  flashApplyMorph(previewRoot);
}
