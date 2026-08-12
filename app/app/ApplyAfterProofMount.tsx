"use client";

import { useEffect, useRef } from "react";
import { queryPreviewRoot } from "@/lib/apply";
import { useSessionStore } from "@/lib/session";

/**
 * S3-F glue: when a turn already has `proof.ok` + suggestion and is not yet
 * applied, run the Proof-gated apply against `#monet-preview-root`.
 *
 * S3-D can also call `applyTurnIfProofOk` directly after upserting pipeline
 * results; this mount covers the case where proof lands on the session first.
 */
export function ApplyAfterProofMount() {
  const turns = useSessionStore((s) => s.session.turns);
  const applyTurnIfProofOk = useSessionStore((s) => s.applyTurnIfProofOk);
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    const previewRoot = queryPreviewRoot();
    if (!previewRoot) return;

    for (const turn of turns) {
      if (turn.applied) continue;
      if (!turn.proof?.ok) continue;
      if (!turn.suggestion) continue;
      if (attempted.current.has(turn.id)) continue;

      attempted.current.add(turn.id);
      applyTurnIfProofOk(turn.id, previewRoot);
    }
  }, [turns, applyTurnIfProofOk]);

  return null;
}
