export { applySuggestion, revertSuggestion } from "./applySuggestion";
export {
  applyIfProofOk,
  queryPreviewRoot,
  resolveAllowedTargetIds,
  type ProofGatedTurn,
} from "./applyIfProofOk";
export { ApplyUndoStack } from "./undoStack";
export { applyComparePhase, type ComparePhase } from "./compare";
export {
  APPLY_MORPH_CLASS,
  APPLY_MORPH_MS,
  clearApplyMorph,
  flashApplyMorph,
  flashApplyMorphByTarget,
} from "./morph";
export {
  resolveMonetTarget,
  parseMonetIdHint,
  queryByMonetId,
  readMonetId,
} from "./resolve";
export {
  isSafePatchString,
  isSafeMonetId,
  isSafeClassName,
  isSafeCssPropertyName,
  ApplySafetyError,
} from "./safety";
export {
  MONET_ID_ATTR,
  PREVIEW_ROOT_ID,
  type ApplyErrorCode,
  type ApplyResult,
  type ApplySuccess,
  type ApplyFailure,
  type ApplySuggestionOptions,
  type ApplyUndoEntry,
} from "./types";
