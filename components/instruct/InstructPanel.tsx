"use client";

import { useState } from "react";
import { createId } from "@/lib/ids";
import type { EditTurn, RegionFacts, RegionGeometry } from "@/lib/schemas";
import { useSessionStore } from "@/lib/session";
import { FactsPanel } from "./FactsPanel";
import { InstructChips } from "./InstructChips";
import { InstructInput } from "./InstructInput";
import { suggestInstructChips } from "./suggestChips";
import styles from "./InstructPanel.module.css";

export interface InstructSubmitPayload {
  instruction: string;
  facts?: RegionFacts | null;
  /** Turn id when persistTurn created/updated a pending turn. */
  turnId?: string;
}

export interface InstructPanelProps {
  /** Scout facts for chips + FactsPanel (S2-D). */
  facts?: RegionFacts | null;
  /**
   * Region to attach when persistTurn is true.
   * Falls back to the ephemeral store region when omitted.
   */
  region?: RegionGeometry | null;
  disabled?: boolean;
  /**
   * Called on explicit Submit (button / ⌘↵) — never on chip click.
   * S2-F should wire turn creation / mode transition here.
   */
  onSubmit?: (payload: InstructSubmitPayload) => void;
  /**
   * When true, upsert a pending EditTurn via the session store.
   * Still does not run the pipeline. Default false (S2-F owns flow).
   */
  persistTurn?: boolean;
  className?: string;
  placeholder?: string;
}

function pendingStages(hasFacts: boolean): EditTurn["stages"] {
  const now = new Date().toISOString();
  return [
    {
      role: "scout",
      status: hasFacts ? "done" : "pending",
      ...(hasFacts ? { startedAt: now, finishedAt: now } : {}),
    },
    { role: "brief", status: "pending" },
    { role: "craft", status: "pending" },
    { role: "brush", status: "pending" },
    { role: "proof", status: "pending" },
  ];
}

/**
 * Instruct rail shell (S2-E): FactsPanel + suggestion chips + instruction input.
 * Chips prefill only; submit is an explicit user action for S2-F to consume.
 */
export function InstructPanel({
  facts = null,
  region = null,
  disabled = false,
  onSubmit,
  persistTurn = false,
  className,
  placeholder,
}: InstructPanelProps) {
  const [instruction, setInstruction] = useState("");
  const storeRegion = useSessionStore((s) => s.region);
  const sessionId = useSessionStore((s) => s.session.id);
  const upsertTurn = useSessionStore((s) => s.upsertTurn);

  const chips = suggestInstructChips(facts);
  const activeRegion = region ?? storeRegion;
  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  const handlePrefill = (text: string) => {
    // Prefill only — never submit / upsert / pipeline.
    setInstruction(text);
  };

  const handleSubmit = (text: string) => {
    let turnId: string | undefined;

    if (persistTurn && activeRegion) {
      const now = new Date().toISOString();
      turnId = createId();
      const turn: EditTurn = {
        id: turnId,
        sessionId,
        region: activeRegion,
        instruction: text,
        ...(facts ? { facts } : {}),
        stages: pendingStages(Boolean(facts)),
        applied: false,
        createdAt: now,
        updatedAt: now,
      };
      const ok = upsertTurn(turn);
      if (!ok) turnId = undefined;
    }

    onSubmit?.({ instruction: text, facts, turnId });
  };

  return (
    <div className={rootClass}>
      <FactsPanel facts={facts}>
        <div className={styles.compose}>
          <InstructChips
            chips={chips}
            onPrefill={handlePrefill}
            disabled={disabled}
          />
          <InstructInput
            value={instruction}
            onChange={setInstruction}
            onSubmit={handleSubmit}
            disabled={disabled}
            placeholder={placeholder}
          />
        </div>
      </FactsPanel>
    </div>
  );
}
