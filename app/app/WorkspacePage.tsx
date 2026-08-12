"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ToolSwitcher } from "@/components/lasso";
import { StageRail } from "@/components/pipeline/StageRail";
import { PreviewHost, PREVIEW_WIDTH_PX } from "@/components/preview";
import type { RegionTool } from "@/lib/schemas";
import { useSessionStore, WorkspaceMode } from "@/lib/session";
import { SampleLanding } from "@/samples/landing";
import { ApplyAfterProofMount } from "./ApplyAfterProofMount";
import { ApplyControls } from "./ApplyControls";
import { InstructMount } from "./InstructMount";
import { ModeToggle } from "./ModeToggle";
import styles from "./page.module.css";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

function focusIsInToolsRail(): boolean {
  const active = document.activeElement;
  if (!(active instanceof Element)) return false;
  const tools = active.closest('[aria-label="Tools"]');
  return tools != null;
}

/**
 * Focus instruct textarea (`/` or `i`) when not typing in a field.
 * Falls back to the instruct panel when the input is disabled.
 */
function focusInstructChrome() {
  const input = document.getElementById("monet-instruct-input");
  if (input instanceof HTMLTextAreaElement && !input.disabled) {
    input.focus();
    return;
  }
  const panel = document.getElementById("monet-instruct-panel");
  panel?.focus();
}

function pickToolFromShortcut(tool: RegionTool) {
  const { setSelectionTool, setMode, mode } = useSessionStore.getState();
  setSelectionTool(tool);
  if (mode !== WorkspaceMode.Select) {
    setMode(WorkspaceMode.Select);
  }
}

export function WorkspacePage() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      // R/F — switch lasso tool when focus is in the Tools rail (Select path).
      if (focusIsInToolsRail()) {
        const key = event.key.toLowerCase();
        if (key === "r") {
          event.preventDefault();
          pickToolFromShortcut("rect");
          return;
        }
        if (key === "f") {
          event.preventDefault();
          pickToolFromShortcut("freehand");
          return;
        }
      }

      if (event.key === "/" || event.key === "i" || event.key === "I") {
        event.preventDefault();
        focusInstructChrome();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={styles.shell}>
      <ApplyAfterProofMount />
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}>
            Monet
          </Link>
          <span className={styles.sessionName}>Sample session</span>
        </div>
        <div className={styles.controls}>
          <ModeToggle />
          <button
            type="button"
            className={styles.shareSoon}
            disabled
            title="Sharing is not available in this build"
            aria-label="Share soon — not available yet"
          >
            Share soon
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.rail} aria-label="Tools">
          <h2 className={styles.railTitle}>Tools</h2>
          <ToolSwitcher />
          <ApplyControls />
        </aside>

        <main className={styles.canvas}>
          <div className={styles.canvasMeta}>
            <span>Preview · sample/landing</span>
            <span>{PREVIEW_WIDTH_PX}px fixed</span>
          </div>
          <PreviewHost>
            <SampleLanding />
          </PreviewHost>
        </main>

        <aside className={styles.side} aria-label="Instruct">
          <h2 className={styles.sideTitle}>Instruct</h2>
          <InstructMount />
          <StageRail />
        </aside>
      </div>
    </div>
  );
}
