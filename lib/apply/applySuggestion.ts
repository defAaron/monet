import {
  SuggestionPayloadSchema,
  type SuggestionPayload,
} from "@/lib/schemas";
import {
  applyClassToggle,
  applyCssVar,
  applyStylePatch,
  applyTextReplace,
  buildInverseSuggestion,
} from "./kinds";
import { flashApplyMorph } from "./morph";
import { resolveMonetTarget } from "./resolve";
import { ApplySafetyError } from "./safety";
import type {
  ApplyFailure,
  ApplyResult,
  ApplySuggestionOptions,
  ApplySuccess,
} from "./types";

function fail(code: ApplyFailure["code"], message: string): ApplyFailure {
  return { ok: false, code, message };
}

function parseSuggestion(
  raw: SuggestionPayload,
): { ok: true; suggestion: SuggestionPayload } | ApplyFailure {
  const parsed = SuggestionPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      "invalid-suggestion",
      parsed.error.issues[0]?.message ?? "Invalid SuggestionPayload",
    );
  }
  return { ok: true, suggestion: parsed.data };
}

/**
 * Apply a Brush `SuggestionPayload` to the preview DOM.
 *
 * Mutations are scoped to elements with `data-monet-id` under `previewRoot`
 * (`css-var` sets variables on the preview root itself). Does **not** check
 * `proof.ok` — callers must use `applyIfProofOk` (S3-F) on the demo path.
 *
 * On success, `inverse` is a SuggestionPayload that restores prior state
 * when passed back through `applySuggestion` (for S3-G undo).
 */
export function applySuggestion(
  options: ApplySuggestionOptions,
): ApplyResult {
  const { previewRoot, turnId, allowedTargetIds } = options;

  if (!previewRoot || typeof previewRoot.querySelectorAll !== "function") {
    return fail("missing-preview-root", "previewRoot is required");
  }

  const parsed = parseSuggestion(options.suggestion);
  if (!parsed.ok) return parsed;
  const { suggestion } = parsed;

  try {
    if (suggestion.kind === "css-var") {
      return applyCssVarSuggestion({
        suggestion,
        previewRoot,
        turnId,
        allowedTargetIds,
      });
    }

    const resolved = resolveMonetTarget(previewRoot, suggestion.targetHint);
    if (!resolved.ok) {
      return fail(resolved.code, resolved.message);
    }

    if (
      allowedTargetIds &&
      allowedTargetIds.length > 0 &&
      !allowedTargetIds.includes(resolved.monetId)
    ) {
      return fail(
        "target-unscoped",
        `data-monet-id="${resolved.monetId}" is not in allowedTargetIds`,
      );
    }

    const { inversePatch } = applyKind(suggestion, resolved.element);
    const inverse = buildInverseSuggestion(suggestion, inversePatch);

    // S4-B: short morph cue on the scoped target (also covers undo / compare).
    flashApplyMorph(resolved.element);

    const success: ApplySuccess = {
      ok: true,
      targetId: resolved.monetId,
      suggestion,
      inverse,
      ...(turnId !== undefined ? { turnId } : {}),
    };
    return success;
  } catch (err) {
    if (err instanceof ApplySafetyError) {
      return fail(err.code, err.message);
    }
    const message = err instanceof Error ? err.message : "Apply failed";
    return fail("apply-failed", message);
  }
}

function applyCssVarSuggestion(args: {
  suggestion: SuggestionPayload;
  previewRoot: Element;
  turnId?: string;
  allowedTargetIds?: readonly string[];
}): ApplyResult {
  const { suggestion, previewRoot, turnId, allowedTargetIds } = args;

  // Still require a resolvable monet-id hint so vars stay tied to a demo target.
  const resolved = resolveMonetTarget(previewRoot, suggestion.targetHint);
  if (!resolved.ok) {
    return fail(resolved.code, resolved.message);
  }
  if (
    allowedTargetIds &&
    allowedTargetIds.length > 0 &&
    !allowedTargetIds.includes(resolved.monetId)
  ) {
    return fail(
      "target-unscoped",
      `data-monet-id="${resolved.monetId}" is not in allowedTargetIds`,
    );
  }

  const { inversePatch } = applyCssVar(previewRoot, suggestion.patch);
  const inverse = buildInverseSuggestion(suggestion, inversePatch);

  // Cue the resolved demo target (vars live on root; focus stays on the ID).
  flashApplyMorph(resolved.element);

  return {
    ok: true,
    targetId: resolved.monetId,
    suggestion,
    inverse,
    ...(turnId !== undefined ? { turnId } : {}),
  };
}

function applyKind(
  suggestion: SuggestionPayload,
  element: Element,
): { inversePatch: Record<string, unknown> } {
  switch (suggestion.kind) {
    case "style-patch":
      return applyStylePatch(element, suggestion.patch);
    case "class-toggle":
      return applyClassToggle(element, suggestion.patch);
    case "text-replace":
      return applyTextReplace(element, suggestion.patch);
    case "css-var":
      // Handled separately (preview root).
      throw new ApplySafetyError("css-var must target preview root");
    default: {
      const _exhaustive: never = suggestion.kind;
      void _exhaustive;
      throw new ApplySafetyError(`Unsupported kind: ${String(suggestion.kind)}`);
    }
  }
}

/**
 * Convenience: re-apply `result.inverse` against the same preview root.
 * Used by undo (S3-G); does not manage the undo stack itself.
 */
export function revertSuggestion(
  result: ApplySuccess,
  previewRoot: Element,
): ApplyResult {
  return applySuggestion({
    suggestion: result.inverse,
    previewRoot,
    turnId: result.turnId,
    ...(result.targetId
      ? { allowedTargetIds: [result.targetId] }
      : {}),
  });
}
