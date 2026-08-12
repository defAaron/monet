import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PipelineOrchestratorError,
  PipelineRequestSchema,
  PipelineResponseSchema,
  createStubPipelineProvider,
  type PipelineRequest,
  type PipelineResponse,
} from "@/lib/pipeline";

/** TRD §8.3 — ~20s server budget; fall back to stub on timeout. */
const PIPELINE_TIMEOUT_MS = 20_000;

/** Soft cap before JSON parse (TRD §8.3 max body; §16 input size). */
const MAX_BODY_BYTES = 256 * 1024;

/** Instruction length guard (schemas leave this open; route enforces). */
const MAX_INSTRUCTION_CHARS = 2_000;

export const runtime = "nodejs";

/**
 * POST /api/pipeline
 *
 * Validates PipelineRequest, runs full turn stages via stub orchestrator,
 * returns typed PipelineResponse. Apply remains client-side.
 */
export async function POST(request: Request): Promise<Response> {
  const started = Date.now();

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large", maxBytes: MAX_BODY_BYTES },
        { status: 413 },
      );
    }
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large", maxBytes: MAX_BODY_BYTES },
        { status: 413 },
      );
    }
    raw = text.length === 0 ? null : JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let req: PipelineRequest;
  try {
    req = PipelineRequestSchema.parse(raw);
  } catch (err) {
    return validationErrorResponse(err);
  }

  if (req.instruction.length > MAX_INSTRUCTION_CHARS) {
    return NextResponse.json(
      {
        error: "Instruction too long",
        maxChars: MAX_INSTRUCTION_CHARS,
      },
      { status: 400 },
    );
  }

  const provider = createStubPipelineProvider();

  try {
    const response = await withTimeout(
      provider.run(req),
      PIPELINE_TIMEOUT_MS,
    );
    return jsonPipelineResponse(response);
  } catch (err) {
    const latencyMs = Date.now() - started;

    // TRD §8.2 — log role + latency; do not log page HTML. Always return a
    // typed stub-fallback turn so the demo path stays live (TRD §8.3 / §8.5).
    console.error("[api/pipeline] falling back to stub", {
      role: err instanceof PipelineOrchestratorError ? err.role : undefined,
      timedOut: err instanceof PipelineTimeoutError,
      latencyMs,
      message: err instanceof Error ? err.message : String(err),
    });

    const fallback = await createStubPipelineProvider({
      fixtureId: "fallback",
      model: "stub-fallback",
    }).run(req);

    return jsonPipelineResponse({
      ...fallback,
      model: "stub-fallback",
      latencyMs,
    });
  }
}

function jsonPipelineResponse(response: PipelineResponse): Response {
  const parsed = PipelineResponseSchema.parse(response);
  return NextResponse.json(parsed, { status: 200 });
}

function validationErrorResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid PipelineRequest",
        issues: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: "Invalid PipelineRequest" }, { status: 400 });
}

class PipelineTimeoutError extends Error {
  constructor(ms: number) {
    super(`Pipeline timed out after ${ms}ms`);
    this.name = "PipelineTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new PipelineTimeoutError(ms));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
