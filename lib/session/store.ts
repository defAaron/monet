"use client";

import { create } from "zustand";
import { isWorkspaceMode, WorkspaceMode } from "./mode";

export interface SessionUiState {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;
}

export const useSessionStore = create<SessionUiState>((set, get) => ({
  mode: WorkspaceMode.Interact,
  setMode: (mode) => {
    if (!isWorkspaceMode(mode)) return;
    set({ mode });
  },
  toggleMode: () => {
    const next =
      get().mode === WorkspaceMode.Interact
        ? WorkspaceMode.Select
        : WorkspaceMode.Interact;
    set({ mode: next });
  },
}));
