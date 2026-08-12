"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { createId } from "@/lib/ids";
import type {
  EditSession,
  EditTurn,
  RegionFacts,
  RegionGeometry,
  RegionTool,
} from "@/lib/schemas";
import {
  EditSessionSchema,
  EditTurnSchema,
  RegionFactsSchema,
  RegionGeometrySchema,
} from "@/lib/schemas";
import {
  isSelectPhase,
  isWorkspaceMode,
  SelectPhase,
  WorkspaceMode,
} from "./mode";
import {
  SESSION_STORAGE_KEY,
  createDefaultSession,
  parseStoredSession,
  writeSessionToStorage,
} from "./persist";
import { createPostScoutStages } from "./turns";

export type RegionStatus = "draft" | "confirmed";

export interface SessionUiState {
  /** Durable edit session document (TRD §5.1); persisted as monet.session.v1. */
  session: EditSession;

  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;

  /**
   * Select-mode sub-flow (S2-F): idle → drawing → scouting → instructing.
   * Ephemeral — not persisted.
   */
  selectPhase: SelectPhase;

  /** Active lasso tool while in Select mode. */
  selectionTool: RegionTool;
  setSelectionTool: (tool: RegionTool) => void;

  /** Current region under the preview (null when cleared). Ephemeral — not persisted. */
  region: RegionGeometry | null;
  /** draft until Enter confirms; Esc clears either status. */
  regionStatus: RegionStatus | null;
  /** Scout output for the confirmed region. Ephemeral until submitInstruction. */
  regionFacts: RegionFacts | null;

  createRegion: (input: Omit<RegionGeometry, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }) => RegionGeometry | null;
  updateRegion: (region: RegionGeometry) => void;
  clearRegion: () => void;
  /** Confirm draft → scouting. Caller (overlay) runs Scout then applyScoutFacts. */
  confirmRegion: () => boolean;
  /** Store Scout facts and advance drawing→scouting→instructing. */
  applyScoutFacts: (facts: RegionFacts) => boolean;
  /**
   * S2 gate: create an EditTurn with geometry + facts + instruction.
   * Returns the turn on success, null if not ready / invalid.
   */
  submitInstruction: (instruction: string) => EditTurn | null;

  /** Replace the whole EditSession (validated). */
  replaceSession: (session: EditSession) => boolean;
  /** Reset to a fresh default sample session. */
  resetSession: () => void;
  setSessionTitle: (title: string) => void;
  setSessionPreview: (preview: EditSession["preview"]) => void;
  /** Insert or replace a turn by id; keeps sessionId aligned. */
  upsertTurn: (turn: EditTurn) => boolean;
  removeTurn: (turnId: string) => boolean;
}

type PersistedSessionSlice = Pick<SessionUiState, "session">;

function parseRegion(candidate: RegionGeometry): RegionGeometry | null {
  const parsed = RegionGeometrySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function withUpdatedSession(
  session: EditSession,
  patch: Partial<Pick<EditSession, "title" | "preview" | "turns">>,
): EditSession | null {
  const candidate: EditSession = {
    ...session,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const parsed = EditSessionSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Persist only EditSession JSON under monet.session.v1 (not Zustand wrapper). */
const editSessionStorage: PersistStorage<PersistedSessionSlice> = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    const session = parseStoredSession(raw);
    if (!session) return null;
    return { state: { session }, version: 0 };
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    const parsed = EditSessionSchema.safeParse(value.state.session);
    if (!parsed.success) return;
    window.localStorage.setItem(name, JSON.stringify(parsed.data));
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export const useSessionStore = create<SessionUiState>()(
  persist(
    (set, get) => ({
      session: createDefaultSession(),

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

      selectPhase: SelectPhase.Idle,

      selectionTool: "rect",
      setSelectionTool: (tool) => {
        if (tool !== "rect" && tool !== "freehand") return;
        set({ selectionTool: tool });
      },

      region: null,
      regionStatus: null,
      regionFacts: null,

      createRegion: (input) => {
        const candidate: RegionGeometry = {
          id: input.id ?? createId(),
          tool: input.tool,
          bbox: input.bbox,
          path: input.path,
          createdAt: input.createdAt ?? new Date().toISOString(),
        };
        const region = parseRegion(candidate);
        if (!region) return null;
        // New stroke replaces prior confirmation/facts and returns to drawing.
        set({
          region,
          regionStatus: "draft",
          regionFacts: null,
          selectPhase: SelectPhase.Drawing,
        });
        return region;
      },

      updateRegion: (next) => {
        const region = parseRegion(next);
        if (!region) return;
        const phase = get().selectPhase;
        set({
          region,
          regionStatus: get().regionStatus ?? "draft",
          selectPhase:
            phase === SelectPhase.Idle || !isSelectPhase(phase)
              ? SelectPhase.Drawing
              : phase,
        });
      },

      clearRegion: () => {
        // S1 Esc/clear: drop selection; S2-F also resets select phase + facts.
        set({
          region: null,
          regionStatus: null,
          regionFacts: null,
          selectPhase: SelectPhase.Idle,
        });
      },

      confirmRegion: () => {
        const { region, regionStatus } = get();
        if (!region) return false;
        if (regionStatus === "confirmed") return false;
        set({
          regionStatus: "confirmed",
          selectPhase: SelectPhase.Scouting,
          regionFacts: null,
        });
        return true;
      },

      applyScoutFacts: (facts) => {
        const { region, regionStatus, selectPhase } = get();
        if (!region || regionStatus !== "confirmed") return false;
        if (
          selectPhase !== SelectPhase.Scouting &&
          selectPhase !== SelectPhase.Instructing
        ) {
          return false;
        }
        const parsed = RegionFactsSchema.safeParse(facts);
        if (!parsed.success) return false;
        set({
          regionFacts: parsed.data,
          selectPhase: SelectPhase.Instructing,
        });
        return true;
      },

      submitInstruction: (instruction) => {
        const text = instruction.trim();
        if (!text) return null;

        const { region, regionStatus, regionFacts, session } = get();
        if (!region || regionStatus !== "confirmed" || !regionFacts) {
          return null;
        }

        const now = new Date().toISOString();
        const turn: EditTurn = {
          id: createId(),
          sessionId: session.id,
          region,
          instruction: text,
          facts: regionFacts,
          stages: createPostScoutStages(now),
          applied: false,
          createdAt: now,
          updatedAt: now,
        };

        if (!get().upsertTurn(turn)) return null;
        return turn;
      },

      replaceSession: (candidate) => {
        const parsed = EditSessionSchema.safeParse(candidate);
        if (!parsed.success) return false;
        set({ session: parsed.data });
        return true;
      },

      resetSession: () => {
        set({ session: createDefaultSession() });
      },

      setSessionTitle: (title) => {
        const next = withUpdatedSession(get().session, { title });
        if (!next) return;
        set({ session: next });
      },

      setSessionPreview: (preview) => {
        const next = withUpdatedSession(get().session, { preview });
        if (!next) return;
        set({ session: next });
      },

      upsertTurn: (turn) => {
        const { session } = get();
        const aligned: EditTurn = {
          ...turn,
          sessionId: session.id,
        };
        const parsedTurn = EditTurnSchema.safeParse(aligned);
        if (!parsedTurn.success) return false;

        const turns = [...session.turns];
        const index = turns.findIndex((t) => t.id === parsedTurn.data.id);
        if (index >= 0) {
          turns[index] = parsedTurn.data;
        } else {
          turns.push(parsedTurn.data);
        }

        const next = withUpdatedSession(session, { turns });
        if (!next) return false;
        set({ session: next });
        return true;
      },

      removeTurn: (turnId) => {
        const { session } = get();
        const turns = session.turns.filter((t) => t.id !== turnId);
        if (turns.length === session.turns.length) return false;
        const next = withUpdatedSession(session, { turns });
        if (!next) return false;
        set({ session: next });
        return true;
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: editSessionStorage,
      // Only the EditSession document is durable; lasso drafts stay ephemeral.
      partialize: (state) => ({ session: state.session }),
      merge: (persisted, current) => {
        const candidate = (persisted as { session?: unknown } | null)?.session;
        const parsed = EditSessionSchema.safeParse(candidate);
        if (!parsed.success) return current;
        return { ...current, session: parsed.data };
      },
      onRehydrateStorage: () => (state) => {
        // Seed monet.session.v1 on first visit so sessionId is stable across reloads.
        if (!state) return;
        if (typeof window === "undefined") return;
        if (window.localStorage.getItem(SESSION_STORAGE_KEY)) return;
        writeSessionToStorage(state.session);
      },
    },
  ),
);
