import {
  EditBriefSchema,
  type EditBrief,
} from "@/lib/schemas";
import type { PipelineRoleHandler, RoleContext } from "../types";

/** Product Brief · engineering InterpreterRole (TRD §8.1). */
export type InterpreterRole = PipelineRoleHandler<EditBrief>;

/**
 * Wrap a Brief runner with Zod validation so stub/LLM outputs stay typed.
 * Scout is already on `ctx.req.facts`; Brief must not invent patches.
 */
export function createBriefHandler(
  run: (ctx: RoleContext) => Promise<EditBrief>,
): InterpreterRole {
  return {
    async run(ctx) {
      const out = await run(ctx);
      return EditBriefSchema.parse(out);
    },
  };
}
