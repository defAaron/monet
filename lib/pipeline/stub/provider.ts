import { createOrchestratorProvider } from "../orchestrator";
import type {
  OrchestratorOptions,
  PipelineProvider,
  PipelineRequest,
  PipelineResponse,
} from "../types";
import { createStubHandlersFromFixture } from "./handlers";
import { matchStubFixture, stubModelForFixture } from "./match";
import type { StubFixture } from "./fixtures";
import { getStubFixtureById, STUB_FALLBACK_FIXTURE } from "./fixtures";

export type StubPipelineProviderOptions = OrchestratorOptions & {
  /**
   * Force a fixture id (tests / demo cache). When omitted, match by region + keywords.
   */
  fixtureId?: string;
  /**
   * Override model string. Default: "stub-pipeline" or "stub-fallback".
   */
  model?: string;
};

/**
 * Deterministic offline StubPipelineProvider (TRD §8.1 / §23).
 * Matches region heuristic + instruction keywords → fixture → orchestrator roles.
 */
export function createStubPipelineProvider(
  options: StubPipelineProviderOptions = {},
): PipelineProvider {
  return {
    async run(req: PipelineRequest): Promise<PipelineResponse> {
      const { fixture, model } = resolveStubRun(req, options);
      const provider = createOrchestratorProvider(
        createStubHandlersFromFixture(fixture),
        {
          ...options,
          model,
        },
      );

      const res = await provider.run(req);

      if (!fixture.outcomeSummary) return res;

      return {
        ...res,
        turn: {
          ...res.turn,
          outcomeSummary: fixture.outcomeSummary,
        },
      };
    },
  };
}

/** Alias matching TRD naming. */
export const StubPipelineProvider = {
  create: createStubPipelineProvider,
};

export type ResolvedStubRun = {
  fixture: StubFixture;
  model: string;
  score: number;
};

/**
 * Resolve which fixture + model a request would use (also useful for API fallback).
 */
export function resolveStubRun(
  req: PipelineRequest,
  options: StubPipelineProviderOptions = {},
): ResolvedStubRun {
  if (options.fixtureId) {
    const forced =
      getStubFixtureById(options.fixtureId) ?? STUB_FALLBACK_FIXTURE;
    return {
      fixture: forced,
      model: options.model ?? stubModelForFixture(forced),
      score: options.fixtureId === "fallback" ? 0 : 100,
    };
  }

  const match = matchStubFixture(req);
  return {
    fixture: match.fixture,
    model: options.model ?? stubModelForFixture(match.fixture),
    score: match.score,
  };
}
