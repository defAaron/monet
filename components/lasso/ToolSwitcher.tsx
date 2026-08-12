"use client";

import { useSessionStore, WorkspaceMode } from "@/lib/session";
import type { RegionTool } from "@/lib/schemas";
import styles from "./ToolSwitcher.module.css";

const TOOLS: { id: RegionTool; label: string; ariaLabel: string }[] = [
  { id: "rect", label: "Rect", ariaLabel: "Rectangle lasso" },
  { id: "freehand", label: "Freehand", ariaLabel: "Freehand lasso" },
];

export function ToolSwitcher() {
  const mode = useSessionStore((s) => s.mode);
  const setMode = useSessionStore((s) => s.setMode);
  const selectionTool = useSessionStore((s) => s.selectionTool);
  const setSelectionTool = useSessionStore((s) => s.setSelectionTool);
  const clearRegion = useSessionStore((s) => s.clearRegion);
  const region = useSessionStore((s) => s.region);
  const regionStatus = useSessionStore((s) => s.regionStatus);
  const confirmRegion = useSessionStore((s) => s.confirmRegion);

  const selectEnabled = mode === WorkspaceMode.Select;

  const pickTool = (tool: RegionTool) => {
    setSelectionTool(tool);
    if (mode !== WorkspaceMode.Select) {
      setMode(WorkspaceMode.Select);
    }
  };

  return (
    <div className={styles.root}>
      <div
        className={styles.group}
        role="group"
        aria-label="Lasso tool"
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`${styles.tool} ${
              selectionTool === tool.id && selectEnabled ? styles.toolActive : ""
            }`}
            aria-label={tool.ariaLabel}
            aria-pressed={selectionTool === tool.id && selectEnabled}
            aria-keyshortcuts={tool.id === "rect" ? "R" : "F"}
            onClick={() => pickTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.action}
        disabled={!selectEnabled || !region}
        aria-label="Clear selection"
        onClick={() => clearRegion()}
      >
        Clear
      </button>

      <button
        type="button"
        className={styles.action}
        disabled={
          !selectEnabled || !region || regionStatus === "confirmed"
        }
        aria-label="Confirm selection"
        onClick={() => confirmRegion()}
      >
        Confirm
      </button>

      {!selectEnabled ? (
        <p className={styles.hint}>Pick Rect or Freehand to start drawing.</p>
      ) : (
        <p className={styles.hint}>
          Esc clears · Enter confirms · R/F tools
        </p>
      )}
    </div>
  );
}
