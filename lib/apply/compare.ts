import { applySuggestion } from "./applySuggestion";
import type { ApplyResult, ApplyUndoEntry } from "./types";

export type ComparePhase = "before" | "after";

/**
 * Toggle preview to the pre-apply ("before") or applied ("after") look
 * for a stack entry without popping the undo stack.
 */
export function applyComparePhase(
  entry: ApplyUndoEntry,
  previewRoot: Element,
  phase: ComparePhase,
): ApplyResult {
  return applySuggestion({
    suggestion: phase === "before" ? entry.inverse : entry.suggestion,
    previewRoot,
    turnId: entry.turnId,
  });
}
