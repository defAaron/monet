import {
  createBriefHandler,
  createBrushHandler,
  createCraftHandler,
  createProofHandler,
  type PipelineRoleHandlers,
} from "../roles";
import type { StubFixture } from "./fixtures";

/**
 * Role handlers that emit a single fixture’s typed handoffs through the orchestrator.
 * Brush may return `suggestionRevised` when `ctx.revisionNotes` is set.
 */
export function createStubHandlersFromFixture(
  fixture: StubFixture,
): PipelineRoleHandlers {
  let proofPasses = 0;

  return {
    brief: createBriefHandler(async () => fixture.brief),
    craft: createCraftHandler(async () => {
      // Keep plan targetIds aligned with suggestion when fixture left them empty.
      if (fixture.plan.targetIds.length > 0) return fixture.plan;
      return {
        ...fixture.plan,
        targetIds: [fixture.suggestion.targetHint],
        changes: fixture.plan.changes.map((c) =>
          c.targetId === "unknown"
            ? { ...c, targetId: fixture.suggestion.targetHint }
            : c,
        ),
      };
    }),
    brush: createBrushHandler(async (ctx) => {
      if (ctx.revisionNotes && fixture.suggestionRevised) {
        return fixture.suggestionRevised;
      }
      return fixture.suggestion;
    }),
    proof: createProofHandler(async () => {
      proofPasses += 1;
      if (proofPasses > 1 && fixture.proofAfterRevise) {
        return fixture.proofAfterRevise;
      }
      return fixture.proof;
    }),
  };
}
