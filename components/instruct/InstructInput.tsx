"use client";

import type { FormEvent, KeyboardEvent } from "react";
import styles from "./InstructInput.module.css";

/** TRD §18 — cap pipeline instruction size. */
export const INSTRUCT_MAX_LENGTH = 500;

export interface InstructInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Explicit submit only — chips must not call this. */
  onSubmit: (instruction: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  submitLabel?: string;
}

/**
 * Instruction textarea + submit (S2-E).
 * ⌘/Ctrl+Enter submits; chips never trigger this path.
 */
export function InstructInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Make this CTA the clear primary…",
  className,
  maxLength = INSTRUCT_MAX_LENGTH,
  submitLabel = "Instruct",
}: InstructInputProps) {
  const trimmed = value.trim();
  const canSubmit = !disabled && trimmed.length > 0;
  const nearLimit = value.length >= maxLength - 40;
  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(trimmed.slice(0, maxLength));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className={rootClass} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="monet-instruct-input">
        Instruction
      </label>
      <textarea
        id="monet-instruct-input"
        className={styles.textarea}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.footer}>
        <span
          className={`${styles.meta} ${nearLimit ? styles.metaWarn : ""}`}
          aria-live="polite"
        >
          {value.length}/{maxLength}
          {canSubmit ? " · ⌘↵" : ""}
        </span>
        <button
          type="submit"
          className={styles.submit}
          disabled={!canSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
