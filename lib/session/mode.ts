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
