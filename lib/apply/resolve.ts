import { isSafeMonetId } from "./safety";
import { MONET_ID_ATTR } from "./types";

const ATTR_SELECTOR_RE =
  /^\[\s*data-monet-id\s*=\s*(["'])([^"']+)\1\s*\]$/i;

export type ResolveTargetResult =
  | { ok: true; element: Element; monetId: string }
  | { ok: false; code: "target-not-found" | "target-unscoped"; message: string };

/**
 * Resolve `targetHint` to an element with `data-monet-id` under `previewRoot`.
 * Accepts a bare monet id or `[data-monet-id="…"]`. Arbitrary CSS selectors are rejected.
 */
export function resolveMonetTarget(
  previewRoot: Element,
  targetHint: string,
): ResolveTargetResult {
  const hint = targetHint.trim();
  if (!hint) {
    return {
      ok: false,
      code: "target-not-found",
      message: "Empty targetHint",
    };
  }

  const monetId = parseMonetIdHint(hint);
  if (!monetId) {
    return {
      ok: false,
      code: "target-unscoped",
      message:
        "targetHint must be a data-monet-id (or [data-monet-id=\"…\"]); arbitrary selectors are blocked",
    };
  }

  if (!isSafeMonetId(monetId)) {
    return {
      ok: false,
      code: "target-unscoped",
      message: `Invalid data-monet-id: ${monetId}`,
    };
  }

  const element = queryByMonetId(previewRoot, monetId);
  if (!element) {
    return {
      ok: false,
      code: "target-not-found",
      message: `No element with data-monet-id="${monetId}" under preview root`,
    };
  }

  if (!previewRoot.contains(element) && element !== previewRoot) {
    return {
      ok: false,
      code: "target-unscoped",
      message: "Resolved target is outside preview root",
    };
  }

  return { ok: true, element, monetId };
}

export function parseMonetIdHint(hint: string): string | null {
  const trimmed = hint.trim();
  const attrMatch = ATTR_SELECTOR_RE.exec(trimmed);
  if (attrMatch) return attrMatch[2];
  if (trimmed.includes("[") || trimmed.includes(" ") || trimmed.includes(">")) {
    return null;
  }
  if (trimmed.startsWith("#") || trimmed.startsWith(".")) {
    return null;
  }
  return trimmed;
}

export function queryByMonetId(
  previewRoot: Element,
  monetId: string,
): Element | null {
  // Scoped query — never document-global.
  const nodes = previewRoot.querySelectorAll(`[${MONET_ID_ATTR}]`);
  for (const node of nodes) {
    if (node.getAttribute(MONET_ID_ATTR) === monetId) {
      return node;
    }
  }
  if (previewRoot.getAttribute(MONET_ID_ATTR) === monetId) {
    return previewRoot;
  }
  return null;
}

export function readMonetId(element: Element): string | null {
  const id = element.getAttribute(MONET_ID_ATTR)?.trim();
  return id || null;
}
