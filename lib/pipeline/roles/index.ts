export { createBriefHandler, type InterpreterRole } from "./brief";
export { createCraftHandler, type DesignerRole } from "./craft";
export { createBrushHandler, type ImplementerRole } from "./brush";
export {
  createProofHandler,
  revisionNotesFromProof,
  type VerifierRole,
} from "./proof";

import type { InterpreterRole } from "./brief";
import type { DesignerRole } from "./craft";
import type { ImplementerRole } from "./brush";
import type { VerifierRole } from "./proof";

/** Bundle of injectable role adapters for the orchestrator. */
export type PipelineRoleHandlers = {
  brief: InterpreterRole;
  craft: DesignerRole;
  brush: ImplementerRole;
  proof: VerifierRole;
};
