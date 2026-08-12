"use client";

import { useSessionStore, WorkspaceMode } from "@/lib/session";
import type { RegionTool } from "@/lib/schemas";
import styles from "./ToolSwitcher.module.css";

const TOOLS: { id: RegionTool; label: string }[] = [
  { id: "rect", label: "Rect" },
  { id: "freehand", label: "Freehand" },
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
            aria-pressed={selectionTool === tool.id && selectEnabled}
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
        onClick={() => confirmRegion()}
      >
        Confirm
      </button>

      {!selectEnabled ? (
        <p className={styles.hint}>Pick Rect or Freehand to start drawing.</p>
      ) : (
        <p className={styles.hint}>
          Esc clears · Enter confirms
        </p>
      )}
    </div>
  );
}
