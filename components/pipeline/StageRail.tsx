"use client";

import type { PipelineRole, PipelineStageStatus } from "@/lib/schemas";
import { useSessionStore } from "@/lib/session";
import styles from "./StageRail.module.css";

/** Fixed MVP order (TRD §8 / PRD §6.4): Scout → Brief → Craft → Brush → Proof. */
export const STAGE_RAIL_ROLES: readonly {
  role: PipelineRole;
  label: string;
}[] = [
  { role: "scout", label: "Scout" },
  { role: "brief", label: "Brief" },
  { role: "craft", label: "Craft" },
  { role: "brush", label: "Brush" },
  { role: "proof", label: "Proof" },
] as const;

export interface StageRailStage {
  role: PipelineRole;
  status?: PipelineStageStatus;
}

export interface StageRailProps {
  /**
   * Optional stage statuses. When omitted, reads the latest EditTurn stages
   * from the session store (S3-D live wiring).
   */
  stages?: readonly StageRailStage[];
  className?: string;
  /** Visually hide the section title when the parent already labels the rail. */
  hideTitle?: boolean;
}

function statusFor(
  role: PipelineRole,
  stages: readonly StageRailStage[] | undefined,
): PipelineStageStatus {
  const hit = stages?.find((s) => s.role === role);
  return hit?.status ?? "pending";
}

function statusLabel(status: PipelineStageStatus): string {
  switch (status) {
    case "running":
      return "running";
    case "done":
      return "done";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    case "pending":
    default:
      return "pending";
  }
}

const STATUS_CLASS: Record<PipelineStageStatus, string> = {
  pending: styles.status_pending,
  running: styles.status_running,
  done: styles.status_done,
  failed: styles.status_failed,
  skipped: styles.status_skipped,
};

function announceText(
  stages: readonly StageRailStage[] | undefined,
): string {
  if (!stages?.length) {
    return "Pipeline idle. Roles: Scout, Brief, Craft, Brush, Proof.";
  }
  const parts = STAGE_RAIL_ROLES.map(({ role, label }) => {
    return `${label} ${statusLabel(statusFor(role, stages))}`;
  });
  return `Pipeline: ${parts.join(", ")}.`;
}

/**
 * Compact pipeline stage rail (S2-G / S3-D).
 * Labels match TRD five-role order; live statuses come from props or the
 * latest session turn after instruct → /api/pipeline.
 */
export function StageRail({
  stages: stagesProp,
  className,
  hideTitle = false,
}: StageRailProps) {
  const storeStages = useSessionStore((s) => {
    const turns = s.session.turns;
    if (!turns.length) return undefined;
    return turns[turns.length - 1]?.stages;
  });
  const stages = stagesProp ?? storeStages;

  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const live = announceText(stages);

  return (
    <section className={rootClass} aria-label="Pipeline stages">
      {hideTitle ? null : <h3 className={styles.title}>Stages</h3>}

      <ol className={styles.list}>
        {STAGE_RAIL_ROLES.map(({ role, label }, index) => {
          const status = statusFor(role, stages);
          const stepClass = `${styles.step} ${STATUS_CLASS[status]}`;

          return (
            <li key={role} className={stepClass} data-role={role} data-status={status}>
              {index > 0 ? (
                <span className={styles.connector} aria-hidden="true" />
              ) : null}
              <span className={styles.marker} aria-hidden="true" />
              <span className={styles.label}>{label}</span>
              <span className={styles.status}>{statusLabel(status)}</span>
            </li>
          );
        })}
      </ol>

      {/* TRD E-A8 / PRD §10: announce stage changes without pointer access. */}
      <p className={styles.live} aria-live="polite" aria-atomic="true">
        {live}
      </p>
    </section>
  );
}
