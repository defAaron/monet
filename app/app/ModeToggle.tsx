"use client";

import { useSessionStore, WorkspaceMode } from "@/lib/session";
import styles from "./page.module.css";

export function ModeToggle() {
  const mode = useSessionStore((state) => state.mode);
  const setMode = useSessionStore((state) => state.setMode);

  return (
    <div
      className={styles.modeToggle}
      role="group"
      aria-label="Workspace mode"
    >
      <button
        type="button"
        className={`${styles.modeButton} ${
          mode === WorkspaceMode.Interact ? styles.modeButtonActive : ""
        }`}
        aria-pressed={mode === WorkspaceMode.Interact}
        aria-label="Interact mode — preview is clickable"
        onClick={() => setMode(WorkspaceMode.Interact)}
      >
        Interact
      </button>
      <button
        type="button"
        className={`${styles.modeButton} ${
          mode === WorkspaceMode.Select ? styles.modeButtonActive : ""
        }`}
        aria-pressed={mode === WorkspaceMode.Select}
        aria-label="Select mode — draw a region"
        onClick={() => setMode(WorkspaceMode.Select)}
      >
        Select
      </button>
    </div>
  );
}
