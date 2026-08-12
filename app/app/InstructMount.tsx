"use client";

import { useRef, useState } from "react";
import {
  InstructPanel,
  OutcomeSummary,
  resolveOutcomeSummary,
} from "@/components/instruct";
import {
  PipelineClientError,
  runPipelineForTurn,
  withStageFailed,
  withStageRunning,
} from "@/lib/pipeline/client";
import { SelectPhase, useSessionStore, WorkspaceMode } from "@/lib/session";
import styles from "./InstructMount.module.css";

/**
 * S2-F / S3-D / S3-H mount: submitInstruction → POST /api/pipeline →
 * upsert turn stages + quiet outcome summary chrome.
 */
export function InstructMount() {
  const mode = useSessionStore((s) => s.mode);
  const selectPhase = useSessionStore((s) => s.selectPhase);
  const region = useSessionStore((s) => s.region);
  const regionFacts = useSessionStore((s) => s.regionFacts);
  const regionStatus = useSessionStore((s) => s.regionStatus);
  const submitInstruction = useSessionStore((s) => s.submitInstruction);
  const upsertTurn = useSessionStore((s) => s.upsertTurn);
  // Select a stable turn reference; resolve outside the snapshot (React 19
  // requires getSnapshot to return cached referential equality).
  const lastTurn = useSessionStore((s) => {
    const turns = s.session.turns;
    return turns.length ? turns[turns.length - 1]! : null;
  });
  const outcome = lastTurn ? resolveOutcomeSummary(lastTurn) : null;

  const [error, setError] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const instructing =
    mode === WorkspaceMode.Select &&
    selectPhase === SelectPhase.Instructing &&
    regionStatus === "confirmed" &&
    regionFacts != null;

  const disabled = !instructing || pipelineRunning;
  const showOutcome = outcome != null && !pipelineRunning;

  return (
    <div
      id="monet-instruct-panel"
      className={styles.root}
      tabIndex={-1}
    >
      <p className={styles.phase} aria-live="polite">
        {mode !== WorkspaceMode.Select
          ? "Switch to Select, draw a region, then Confirm / Enter."
          : pipelineRunning
            ? "Pipeline running…"
            : phaseLabel(selectPhase)}
      </p>

      <InstructPanel
        facts={regionFacts}
        region={region}
        disabled={disabled}
        placeholder={
          instructing
            ? pipelineRunning
              ? "Pipeline running…"
              : "e.g. Increase contrast and make the label clearer"
            : "Confirm a region first"
        }
        onSubmit={({ instruction }) => {
          void (async () => {
            setError(null);

            const turn = submitInstruction(instruction);
            if (!turn) {
              setError(
                "Confirm a region and wait for Scout facts before submitting.",
              );
              return;
            }

            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            const runningTurn = {
              ...turn,
              stages: withStageRunning(turn.stages, "brief"),
              updatedAt: new Date().toISOString(),
            };
            upsertTurn(runningTurn);
            setPipelineRunning(true);

            try {
              const session = useSessionStore.getState().session;
              const pageContext = {
                sampleId: session.preview.sampleId,
                title: session.title,
              };

              const { turn: completed } = await runPipelineForTurn(
                turn,
                pageContext,
                { signal: controller.signal },
              );

              if (!upsertTurn(completed)) {
                setError("Pipeline finished but the turn could not be saved.");
                return;
              }
            } catch (err) {
              if (isAbortError(err)) return;

              const message =
                err instanceof PipelineClientError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : "Pipeline request failed.";

              upsertTurn({
                ...turn,
                stages: withStageFailed(turn.stages, "brief", message),
                updatedAt: new Date().toISOString(),
              });
              setError(message);
            } finally {
              if (abortRef.current === controller) {
                abortRef.current = null;
              }
              setPipelineRunning(false);
            }
          })();
        }}
      />

      {showOutcome ? (
        <OutcomeSummary text={outcome.text} ok={outcome.ok} />
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

function phaseLabel(phase: SelectPhase): string {
  switch (phase) {
    case SelectPhase.Idle:
      return "Draw a rect or freehand lasso.";
    case SelectPhase.Drawing:
      return "Draft ready — Enter confirms · Esc clears.";
    case SelectPhase.Scouting:
      return "Scouting region…";
    case SelectPhase.Instructing:
      return "Instruct: add guidance, then Submit. Press / or I to focus.";
    default:
      return "";
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}
