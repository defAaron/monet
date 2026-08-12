import type { ApplySuccess, ApplyUndoEntry } from "./types";

/**
 * In-memory undo stack for applied suggestions (TRD §11.2).
 * UI chrome lives in S3-G; this is the apply-engine data structure.
 */
export class ApplyUndoStack {
  private readonly entries: ApplyUndoEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  peek(): ApplyUndoEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  push(entry: ApplyUndoEntry): void {
    this.entries.push(entry);
  }

  /** Record a successful apply onto the stack (requires `turnId`). */
  pushFromSuccess(result: ApplySuccess): boolean {
    if (!result.turnId) return false;
    this.push({
      turnId: result.turnId,
      suggestion: result.suggestion,
      inverse: result.inverse,
    });
    return true;
  }

  pop(): ApplyUndoEntry | undefined {
    return this.entries.pop();
  }

  clear(): void {
    this.entries.length = 0;
  }

  toArray(): readonly ApplyUndoEntry[] {
    return [...this.entries];
  }
}
