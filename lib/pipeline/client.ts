import type { EditTurn, PipelineRole, PipelineStage } from "@/lib/schemas";
import {
  PipelineRequestSchema,
  PipelineResponseSchema,
  type PipelinePageContext,
  type PipelineRequest,
  type PipelineResponse,
} from "./types";

/** Default path for the MVP pipeline route (TRD §8.3). */
export const PIPELINE_API_PATH = "/api/pipeline";

export type RunPipelineOptions = {
  signal?: AbortSignal;
  /** Inject for tests; defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
};

export class PipelineClientError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(
    message: string,
    options?: { status?: number; body?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "PipelineClientError";
    this.status = options?.status;
    this.body = options?.body;
  }
}

/** Build a validated PipelineRequest (client Scout already done). */
export function buildPipelineRequest(input: {
  sessionId: string;
  instruction: string;
  region: PipelineRequest["region"];
  facts: PipelineRequest["facts"];
  pageContext?: PipelinePageContext;
}): PipelineRequest {
  return PipelineRequestSchema.parse({
    sessionId: input.sessionId,
    instruction: input.instruction,
    region: input.region,
    facts: input.facts,
    pageContext: input.pageContext ?? {},
  });
}

/**
 * POST /api/pipeline and validate PipelineResponse.
 * Apply stays client-side (S3-E/F); this only fetches the turn slice.
 */
export async function runPipeline(
  req: PipelineRequest,
  options: RunPipelineOptions = {},
): Promise<PipelineResponse> {
  const parsedReq = PipelineRequestSchema.parse(req);
  const fetchFn = options.fetch ?? globalThis.fetch;

  let response: Response;
  try {
    response = await fetchFn(PIPELINE_API_PATH, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedReq),
      signal: options.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new PipelineClientError(
      "Network error calling /api/pipeline — is the Next.js dev server running on this origin?",
      {
        cause: err,
      },
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    throw new PipelineClientError(
      `Invalid JSON from /api/pipeline (${response.status})`,
      { status: response.status, cause: err },
    );
  }

  if (!response.ok) {
    throw new PipelineClientError(
      messageFromErrorBody(body) ??
        `Pipeline request failed (${response.status})`,
      { status: response.status, body },
    );
  }

  const parsed = PipelineResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new PipelineClientError("Invalid PipelineResponse from /api/pipeline", {
      status: response.status,
      body,
    });
  }

  return parsed.data;
}

/**
 * Merge API turn slice onto the local EditTurn.
 * Keeps id / sessionId / region / instruction / facts / applied.
 * Does not set `applied` — Proof-gated apply is S3-F.
 */
export function mergeTurnWithPipelineResponse(
  turn: EditTurn,
  response: PipelineResponse,
): EditTurn {
  const slice = response.turn;
  return {
    ...turn,
    brief: slice.brief,
    plan: slice.plan,
    suggestion: slice.suggestion,
    proof: slice.proof,
    stages: slice.stages,
    outcomeSummary: slice.outcomeSummary,
    updatedAt: new Date().toISOString(),
  };
}

/** Mark a role running (optimistic rail advance while the request is in flight). */
export function withStageRunning(
  stages: readonly PipelineStage[],
  role: PipelineRole,
  at = new Date().toISOString(),
): PipelineStage[] {
  return stages.map((stage) => {
    if (stage.role !== role) return stage;
    return {
      ...stage,
      status: "running",
      startedAt: at,
      finishedAt: undefined,
      error: undefined,
    };
  });
}

/** Mark a role failed after a client/network/API error. */
export function withStageFailed(
  stages: readonly PipelineStage[],
  role: PipelineRole,
  error: string,
  at = new Date().toISOString(),
): PipelineStage[] {
  return stages.map((stage) => {
    if (stage.role !== role) return stage;
    return {
      ...stage,
      status: "failed",
      startedAt: stage.startedAt ?? at,
      finishedAt: at,
      error,
    };
  });
}

/**
 * Run the pipeline for an existing turn and return the merged turn.
 * Requires `turn.facts` (client Scout).
 */
export async function runPipelineForTurn(
  turn: EditTurn,
  pageContext: PipelinePageContext = {},
  options: RunPipelineOptions = {},
): Promise<{ response: PipelineResponse; turn: EditTurn }> {
  if (!turn.facts) {
    throw new PipelineClientError("Turn is missing Scout facts");
  }

  const req = buildPipelineRequest({
    sessionId: turn.sessionId,
    instruction: turn.instruction,
    region: turn.region,
    facts: turn.facts,
    pageContext,
  });

  const response = await runPipeline(req, options);
  return {
    response,
    turn: mergeTurnWithPipelineResponse(turn, response),
  };
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function messageFromErrorBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const error = (body as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : undefined;
}
