import type { SuggestionPayload } from "@/lib/schemas";

export const MONET_ID_ATTR = "data-monet-id";
export const PREVIEW_ROOT_ID = "monet-preview-root";

export type ApplyErrorCode =
  | "invalid-suggestion"
  | "missing-preview-root"
  | "target-not-found"
  | "target-unscoped"
  | "unsafe-patch"
  | "unsupported-kind"
  | "apply-failed"
  /** S3-F Proof gate */
  | "proof-missing"
  | "proof-not-ok"
  | "suggestion-missing"
  | "already-applied"
  | "turn-not-found"
  /** S3-G undo / compare */
  | "nothing-to-undo";

export interface ApplySuccess {
  ok: true;
  /** Resolved `data-monet-id`, or `null` when mutating the preview root (`css-var`). */
  targetId: string | null;
  suggestion: SuggestionPayload;
  /** Re-apply via `applySuggestion` to undo this mutation. */
  inverse: SuggestionPayload;
  turnId?: string;
}

export interface ApplyFailure {
  ok: false;
  code: ApplyErrorCode;
  message: string;
}

export type ApplyResult = ApplySuccess | ApplyFailure;

export interface ApplySuggestionOptions {
  suggestion: SuggestionPayload;
  /** `#monet-preview-root` element (or equivalent preview host). */
  previewRoot: Element;
  /** Optional turn id for undo stacks (S3-G). */
  turnId?: string;
  /**
   * When set, the resolved `data-monet-id` must be in this list
   * (Proof / plan `targetIds` can pass this from S3-F).
   */
  allowedTargetIds?: readonly string[];
}

export interface ApplyUndoEntry {
  turnId: string;
  suggestion: SuggestionPayload;
  inverse: SuggestionPayload;
}
