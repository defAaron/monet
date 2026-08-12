import { describe, expect, it } from "vitest";
import { createId } from "@/lib/ids";
import type { EditSession, EditTurn } from "@/lib/schemas";
import {
  SESSION_STORAGE_KEY,
  clearSessionStorage,
  createDefaultSession,
  parseStoredSession,
  readSessionFromStorage,
  writeSessionToStorage,
  type SessionStorageLike,
} from "./persist";

function memoryStorage(seed?: Record<string, string>): SessionStorageLike {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

const now = "2026-08-12T03:00:00.000Z";

function sampleTurn(sessionId: string): EditTurn {
  return {
    id: createId(),
    sessionId,
    region: {
      id: createId(),
      tool: "rect",
      bbox: { x: 0, y: 0, width: 120, height: 40 },
      createdAt: now,
    },
    instruction: "Improve contrast",
    stages: [],
    applied: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe("S2-B session persist (monet.session.v1)", () => {
  it("creates a default EditSession for the sample landing", () => {
    const session = createDefaultSession({
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: now,
      updatedAt: now,
    });
    expect(session.preview).toEqual({ kind: "sample", sampleId: "landing" });
    expect(session.turns).toEqual([]);
    expect(session.title).toBe("Sample landing");
  });

  it("round-trips EditSession under monet.session.v1", () => {
    const storage = memoryStorage();
    const sessionId = createId();
    const session: EditSession = {
      ...createDefaultSession({
        id: sessionId,
        createdAt: now,
        updatedAt: now,
      }),
      turns: [sampleTurn(sessionId)],
    };

    expect(writeSessionToStorage(session, storage)).toBe(true);
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(parseStoredSession(raw!)).toEqual(session);
    expect(readSessionFromStorage(storage)).toEqual(session);
  });

  it("rejects corrupt or schema-invalid payloads", () => {
    const storage = memoryStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({ id: "not-a-uuid", turns: [] }),
    });
    expect(readSessionFromStorage(storage)).toBeNull();
    expect(parseStoredSession("{")).toBeNull();
    expect(
      writeSessionToStorage(
        { id: "bad" } as unknown as EditSession,
        storage,
      ),
    ).toBe(false);
  });

  it("clears the versioned key", () => {
    const storage = memoryStorage();
    writeSessionToStorage(
      createDefaultSession({
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: now,
        updatedAt: now,
      }),
      storage,
    );
    clearSessionStorage(storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
