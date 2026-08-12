"use client";

import type { EditTurn } from "@/lib/schemas";
import styles from "./OutcomeSummary.module.css";

export interface OutcomeSummaryProps {
  /** 1–2 line outcome text (already resolved). */
  text: string;
  /**
   * Visual tone from Proof when known.
   * `null` = neutral (summary without proof).
   */
  ok?: boolean | null;
  className?: string;
}

export interface ResolvedOutcome {
  text: string;
  ok: boolean | null;
}

/**
 * Prefer stub/pipeline `outcomeSummary`; fall back to Proof notes.
 * Keeps chrome outcome-focused — not a critique feed.
 */
export function resolveOutcomeSummary(
  turn: Pick<EditTurn, "outcomeSummary" | "proof">,
): ResolvedOutcome | null {
  const summary = turn.outcomeSummary?.trim();
  if (summary) {
    return { text: summary, ok: turn.proof?.ok ?? null };
  }
  const notes = turn.proof?.notes?.trim();
  if (notes) {
    return { text: notes, ok: turn.proof?.ok ?? null };
  }
  return null;
}

/**
 * Quiet result chrome after a completed pipeline turn (S3-H).
 * One or two lines — confirmation of what changed, not a review essay.
 */
export function OutcomeSummary({
  text,
  ok = null,
  className,
}: OutcomeSummaryProps) {
  const rootClass = [
    styles.root,
    ok === true ? styles.ok : null,
    ok === false ? styles.fail : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass} aria-label="Outcome">
      <h3 className={styles.title}>Outcome</h3>
      <p className={styles.body} role="status">
        {text}
      </p>
    </section>
  );
}
