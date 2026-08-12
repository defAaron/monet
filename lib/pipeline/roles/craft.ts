import {
  EditPlanSchema,
  type EditPlan,
} from "@/lib/schemas";
import type { PipelineRoleHandler, RoleContext } from "../types";

/** Product Craft · engineering DesignerRole (TRD §8.1). */
export type DesignerRole = PipelineRoleHandler<EditPlan>;

/**
 * Wrap a Craft runner with Zod validation.
 * Plan must stay scoped to provided targetIds; no whole-page redesign.
 */
export function createCraftHandler(
  run: (ctx: RoleContext) => Promise<EditPlan>,
): DesignerRole {
  return {
    async run(ctx) {
      const out = await run(ctx);
      return EditPlanSchema.parse(out);
    },
  };
}
