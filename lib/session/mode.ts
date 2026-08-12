/** Top-level Interact ↔ Select toggle (S0-F / TRD §6.2). */
export const WorkspaceMode = {
  Interact: "interact",
  Select: "select",
} as const;

export type WorkspaceMode = (typeof WorkspaceMode)[keyof typeof WorkspaceMode];

export const WORKSPACE_MODES: WorkspaceMode[] = [
  WorkspaceMode.Interact,
  WorkspaceMode.Select,
];

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === WorkspaceMode.Interact || value === WorkspaceMode.Select;
}

/**
 * Select-mode sub-flow (S2-F / TRD §6.2):
 * idle → drawing → scouting → instructing
 * Esc / clear from any phase → idle (clears draft selection + facts).
 */
export const SelectPhase = {
  Idle: "idle",
  Drawing: "drawing",
  Scouting: "scouting",
  Instructing: "instructing",
} as const;

export type SelectPhase = (typeof SelectPhase)[keyof typeof SelectPhase];

export const SELECT_PHASES: SelectPhase[] = [
  SelectPhase.Idle,
  SelectPhase.Drawing,
  SelectPhase.Scouting,
  SelectPhase.Instructing,
];

export function isSelectPhase(value: unknown): value is SelectPhase {
  return (
    value === SelectPhase.Idle ||
    value === SelectPhase.Drawing ||
    value === SelectPhase.Scouting ||
    value === SelectPhase.Instructing
  );
}
