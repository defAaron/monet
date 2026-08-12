import type { EditPlan, ProofResult, SuggestionPayload } from "@/lib/schemas";
import { applySuggestion } from "./applySuggestion";
import { parseMonetIdHint } from "./resolve";
import { PREVIEW_ROOT_ID } from "./types";
import type { ApplyFailure, ApplyResult } from "./types";

/**
 * Minimal turn shape for the Proof gate (full `EditTurn` or pipeline turn slice).
 */
export type ProofGatedTurn = {
  id?: string;
  proof?: ProofResult;
  suggestion?: SuggestionPayload;
  plan?: EditPlan;
  /** When true, refuse a second apply (DOM is ephemeral; flag is durable). */
  applied?: boolean;
};

function fail(code: ApplyFailure["code"], message: string): ApplyFailure {
  return { ok: false, code, message };
}

/**
 * Collect scoped `data-monet-id`s from the Craft plan, else the Brush hint.
 */
export function resolveAllowedTargetIds(
  turn: ProofGatedTurn,
): readonly string[] | undefined {
  const fromPlan = turn.plan?.targetIds;
  if (fromPlan && fromPlan.length > 0) {
    return fromPlan;
  }
  const hint = turn.suggestion?.targetHint;
  if (!hint) return undefined;
  const monetId = parseMonetIdHint(hint);
  return monetId ? [monetId] : undefined;
}

/**
 * Apply Brush suggestion **only when** `proof.ok === true` (TRD §11.2).
 *
 * MVP: no override path. Prefer `plan.targetIds` as `allowedTargetIds`.
 * Call from S3-D / workspace after a pipeline turn lands with proof.
 */
export function applyIfProofOk(
  turn: ProofGatedTurn,
  previewRoot: Element,
): ApplyResult {
  if (turn.applied) {
    return fail("already-applied", "Turn suggestion was already applied");
  }

  if (!turn.proof) {
    return fail("proof-missing", "Proof result is required before apply");
  }

  if (!turn.proof.ok) {
    return fail(
      "proof-not-ok",
      turn.proof.notes || "Proof failed; apply refused",
    );
  }

  if (!turn.suggestion) {
    return fail(
      "suggestion-missing",
      "SuggestionPayload is required after Proof ok",
    );
  }

  const allowedTargetIds = resolveAllowedTargetIds(turn);

  return applySuggestion({
    suggestion: turn.suggestion,
    previewRoot,
    ...(turn.id !== undefined ? { turnId: turn.id } : {}),
    ...(allowedTargetIds !== undefined ? { allowedTargetIds } : {}),
  });
}

/** Locate `#monet-preview-root` in a document (browser / jsdom). */
export function queryPreviewRoot(
  doc: ParentNode | Document | null | undefined =
    typeof document !== "undefined" ? document : null,
): Element | null {
  if (!doc) return null;
  if ("getElementById" in doc && typeof doc.getElementById === "function") {
    return doc.getElementById(PREVIEW_ROOT_ID);
  }
  return doc.querySelector(`#${PREVIEW_ROOT_ID}`);
}
