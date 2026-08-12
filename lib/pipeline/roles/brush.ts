import {
  SuggestionPayloadSchema,
  type SuggestionPayload,
} from "@/lib/schemas";
import type { PipelineRoleHandler, RoleContext } from "../types";

/** Product Brush · engineering ImplementerRole (TRD §8.1). */
export type ImplementerRole = PipelineRoleHandler<SuggestionPayload>;

/**
 * Wrap a Brush runner with Zod validation.
 * Emit only SuggestionPayload; prefer data-monet-id targetHints.
 * May receive `ctx.revisionNotes` on at most one Proof-driven revise.
 */
export function createBrushHandler(
  run: (ctx: RoleContext) => Promise<SuggestionPayload>,
): ImplementerRole {
  return {
    async run(ctx) {
      const out = await run(ctx);
      return SuggestionPayloadSchema.parse(out);
    },
  };
}
