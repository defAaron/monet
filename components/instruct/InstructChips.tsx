"use client";

import type { InstructChip } from "./suggestChips";
import styles from "./InstructChips.module.css";

export interface InstructChipsProps {
  chips: readonly InstructChip[];
  /** Prefill only — must not trigger pipeline / submit. */
  onPrefill: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Quick instruction chips (S2-E). Click writes text into the instruct input;
 * never auto-runs the pipeline (PRD F4).
 */
export function InstructChips({
  chips,
  onPrefill,
  disabled = false,
  className,
}: InstructChipsProps) {
  if (chips.length === 0) return null;

  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClass}>
      <p className={styles.label} id="instruct-chips-label">
        Suggestions
      </p>
      <div
        className={styles.list}
        role="group"
        aria-labelledby="instruct-chips-label"
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={styles.chip}
            disabled={disabled}
            title={chip.text}
            onClick={() => onPrefill(chip.text)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>Chips prefill only — submit when ready.</p>
    </div>
  );
}
