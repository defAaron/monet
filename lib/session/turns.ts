import type { PipelineStage } from "@/lib/schemas";

/** Initial stage rail after Scout has already run client-side (S2 gate). */
export function createPostScoutStages(now = new Date().toISOString()): PipelineStage[] {
  return [
    {
      role: "scout",
      status: "done",
      startedAt: now,
      finishedAt: now,
    },
    { role: "brief", status: "pending" },
    { role: "craft", status: "pending" },
    { role: "brush", status: "pending" },
    { role: "proof", status: "pending" },
  ];
}
