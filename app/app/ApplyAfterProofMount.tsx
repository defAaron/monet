"use client";

import { useEffect, useRef, useState } from "react";
import { queryPreviewRoot } from "@/lib/apply";
import { useSessionStore } from "@/lib/session";

/**
 * S3-F glue: when a turn has `proof.ok` + suggestion, apply it to
 * `#monet-preview-root`. Re-applies persisted `applied` turns after reload
 * because DOM mutations are ephemeral and `applied` is durable.
 */
export function ApplyAfterProofMount() {
  const turns = useSessionStore((s) => s.session.turns);
  const showingBefore = useSessionStore((s) => s.showingBefore);
  const applyTurnIfProofOk = useSessionStore((s) => s.applyTurnIfProofOk);
  const restoreAppliedTurn = useSessionStore((s) => s.restoreAppliedTurn);
  const attempted = useRef(new Set<string>());
  const [hydrated, setHydrated] = useState(() =>
    useSessionStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (showingBefore) return;

    let cancelled = false;
    let tries = 0;
    let frame = 0;

    const run = () => {
      if (cancelled) return;
      const previewRoot = queryPreviewRoot();
      if (!previewRoot) {
        tries += 1;
        if (tries < 30) {
          frame = requestAnimationFrame(run);
        }
        return;
      }

      for (const turn of turns) {
        if (!turn.proof?.ok) continue;
        if (!turn.suggestion) continue;

        if (turn.applied) {
          const result = restoreAppliedTurn(turn.id, previewRoot);
          if (!result.ok) {
            console.error("[monet] restore failed", result.code, result.message);
          } else {
            attempted.current.add(turn.id);
          }
          continue;
        }

        // Skip turns we already applied or that the user undid this session.
        if (attempted.current.has(turn.id)) continue;

        const result = applyTurnIfProofOk(turn.id, previewRoot);
        if (result.ok || result.code === "already-applied") {
          attempted.current.add(turn.id);
        } else {
          console.error("[monet] apply failed", result.code, result.message);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [
    hydrated,
    turns,
    showingBefore,
    applyTurnIfProofOk,
    restoreAppliedTurn,
  ]);

  return null;
}
