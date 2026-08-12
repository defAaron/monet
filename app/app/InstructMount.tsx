"use client";

import { useState } from "react";
import { InstructPanel } from "@/components/instruct";
import { SelectPhase, useSessionStore, WorkspaceMode } from "@/lib/session";
import styles from "./InstructMount.module.css";

/**
 * S2-F mount: wires select-phase + submitInstruction to S2-D/E InstructPanel.
 * Turn creation stays on the session store (S2 gate); chips never auto-run.
 */
export function InstructMount() {
  const mode = useSessionStore((s) => s.mode);
  const selectPhase = useSessionStore((s) => s.selectPhase);
  const region = useSessionStore((s) => s.region);
  const regionFacts = useSessionStore((s) => s.regionFacts);
  const regionStatus = useSessionStore((s) => s.regionStatus);
  const submitInstruction = useSessionStore((s) => s.submitInstruction);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instructing =
    mode === WorkspaceMode.Select &&
    selectPhase === SelectPhase.Instructing &&
    regionStatus === "confirmed" &&
    regionFacts != null;

  return (
    <div className={styles.root}>
      <p className={styles.phase} aria-live="polite">
        {mode !== WorkspaceMode.Select
          ? "Switch to Select, draw a region, then Confirm / Enter."
          : phaseLabel(selectPhase)}
      </p>

      <InstructPanel
        facts={regionFacts}
        region={region}
        disabled={!instructing}
        placeholder={
          instructing
            ? "e.g. Increase contrast and make the label clearer"
            : "Confirm a region first"
        }
        onSubmit={({ instruction }) => {
          setError(null);
          setStatus(null);
          const turn = submitInstruction(instruction);
          if (!turn) {
            setError(
              "Confirm a region and wait for Scout facts before submitting.",
            );
            return;
          }
          const total = useSessionStore.getState().session.turns.length;
          setStatus(`Turn created (${total} total). Ready for S3 pipeline.`);
        }}
      />

      {error ? <p className={styles.error}>{error}</p> : null}
      {status ? (
        <p className={styles.ok} role="status">
          {status}
        </p>
      ) : null}
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
      return "Instruct: add guidance, then Submit.";
    default:
      return "";
  }
}
