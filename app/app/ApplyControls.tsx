"use client";

import { queryPreviewRoot } from "@/lib/apply";
import { useSessionStore } from "@/lib/session";
import styles from "./ApplyControls.module.css";

/**
 * S3-G chrome: undo last Proof-gated apply + before/after compare toggle.
 */
export function ApplyControls() {
  const undoDepth = useSessionStore((s) => s.undoDepth);
  const showingBefore = useSessionStore((s) => s.showingBefore);
  const undoLastApply = useSessionStore((s) => s.undoLastApply);
  const setComparePhase = useSessionStore((s) => s.setComparePhase);

  const canCompare = undoDepth > 0;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.action}
        disabled={!canCompare}
        aria-label="Undo last apply"
        onClick={() => {
          const root = queryPreviewRoot();
          if (!root) return;
          undoLastApply(root);
        }}
      >
        Undo apply
      </button>

      <div
        className={styles.compare}
        role="group"
        aria-label="Before and after"
      >
        <button
          type="button"
          className={`${styles.phase} ${
            canCompare && showingBefore ? styles.phaseActive : ""
          }`}
          disabled={!canCompare}
          aria-pressed={canCompare && showingBefore}
          aria-label="Show before last apply"
          onClick={() => {
            const root = queryPreviewRoot();
            if (!root) return;
            setComparePhase("before", root);
          }}
        >
          Before
        </button>
        <button
          type="button"
          className={`${styles.phase} ${
            canCompare && !showingBefore ? styles.phaseActive : ""
          }`}
          disabled={!canCompare}
          aria-pressed={canCompare && !showingBefore}
          aria-label="Show after last apply"
          onClick={() => {
            const root = queryPreviewRoot();
            if (!root) return;
            setComparePhase("after", root);
          }}
        >
          After
        </button>
      </div>

      <p className={styles.hint} role="status">
        {canCompare
          ? showingBefore
            ? "Showing before last apply"
            : "Showing after last apply"
          : "Apply a suggestion to enable undo"}
      </p>
    </div>
  );
}
