import { createId } from "@/lib/ids";
import { EditSessionSchema, type EditSession } from "@/lib/schemas";

/** Versioned localStorage key (TRD §5.2 / FUTURE checklist). */
export const SESSION_STORAGE_KEY = "monet.session.v1";

export type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Fresh anonymous session pointed at the sample landing preview. */
export function createDefaultSession(
  overrides?: Partial<
    Pick<EditSession, "id" | "title" | "preview" | "createdAt" | "updatedAt">
  >,
): EditSession {
  const now = new Date().toISOString();
  return {
    id: overrides?.id ?? createId(),
    title: overrides?.title ?? "Sample landing",
    preview: overrides?.preview ?? { kind: "sample", sampleId: "landing" },
    turns: [],
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

/** Parse + validate a raw localStorage string as EditSession. */
export function parseStoredSession(raw: string): EditSession | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = EditSessionSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function browserStorage(): SessionStorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

/** Load EditSession from storage; null when missing or invalid. */
export function readSessionFromStorage(
  storage: SessionStorageLike | null = browserStorage(),
): EditSession | null {
  if (!storage) return null;
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  return parseStoredSession(raw);
}

/**
 * Persist a validated EditSession as raw JSON under `monet.session.v1`.
 * Rejects writes that fail EditSessionSchema.
 */
export function writeSessionToStorage(
  session: EditSession,
  storage: SessionStorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  const parsed = EditSessionSchema.safeParse(session);
  if (!parsed.success) return false;
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed.data));
  return true;
}

export function clearSessionStorage(
  storage: SessionStorageLike | null = browserStorage(),
): void {
  storage?.removeItem(SESSION_STORAGE_KEY);
}
