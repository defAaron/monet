import {
  ProofResultSchema,
  type ProofResult,
} from "@/lib/schemas";
import type { PipelineRoleHandler, RoleContext } from "../types";

/** Product Proof · engineering VerifierRole (TRD §8.1). */
export type VerifierRole = PipelineRoleHandler<ProofResult>;

/**
 * Wrap a Proof runner with Zod validation.
 * May set `reviseBrush` to request at most one Brush revision (orchestrator enforces the cap).
 */
export function createProofHandler(
  run: (ctx: RoleContext) => Promise<ProofResult>,
): VerifierRole {
  return {
    async run(ctx) {
      const out = await run(ctx);
      return ProofResultSchema.parse(out);
    },
  };
}

/** Build revision notes passed Proof → Brush (notes + optional issues). */
export function revisionNotesFromProof(proof: ProofResult): string {
  const issues = proof.issues?.filter(Boolean) ?? [];
  if (issues.length === 0) {
    return proof.notes;
  }
  return [proof.notes, ...issues].filter(Boolean).join(" · ");
}
