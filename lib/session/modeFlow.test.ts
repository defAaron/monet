import { beforeEach, describe, expect, it } from "vitest";
import { createId } from "@/lib/ids";
import type { RegionFacts, RegionGeometry } from "@/lib/schemas";
import { SelectPhase, useSessionStore, WorkspaceMode } from "./index";

function sampleRegion(): RegionGeometry {
  return {
    id: createId(),
    tool: "rect",
    bbox: { x: 10, y: 20, width: 160, height: 48 },
    createdAt: "2026-08-12T04:00:00.000Z",
  };
}

function sampleFacts(): RegionFacts {
  return {
    colors: [{ hex: "#1a1a1a", ratio: 0.6 }],
    fonts: [{ family: "Inter", sizePx: 16, weight: 600 }],
    contrast: [
      {
        foreground: "#ffffff",
        background: "#1a1a1a",
        ratio: 12.6,
        passAA: true,
      },
    ],
    interactiveCount: 1,
    linkCount: 0,
    targetIds: ["hero-cta"],
  };
}

describe("S2-F mode flow (drawing → scouting → instructing)", () => {
  beforeEach(() => {
    useSessionStore.setState({
      mode: WorkspaceMode.Select,
      selectPhase: SelectPhase.Idle,
      region: null,
      regionStatus: null,
      regionFacts: null,
      session: {
        ...useSessionStore.getState().session,
        turns: [],
      },
    });
  });

  it("createRegion enters drawing; clearRegion returns to idle", () => {
    const store = useSessionStore.getState();
    const region = store.createRegion({
      tool: "rect",
      bbox: sampleRegion().bbox,
    });
    expect(region).not.toBeNull();
    expect(useSessionStore.getState().selectPhase).toBe(SelectPhase.Drawing);
    expect(useSessionStore.getState().regionStatus).toBe("draft");

    useSessionStore.getState().clearRegion();
    expect(useSessionStore.getState().selectPhase).toBe(SelectPhase.Idle);
    expect(useSessionStore.getState().region).toBeNull();
    expect(useSessionStore.getState().regionFacts).toBeNull();
  });

  it("confirm → scout facts → instruct; submit creates EditTurn", () => {
    const created = useSessionStore.getState().createRegion({
      tool: "rect",
      bbox: sampleRegion().bbox,
    });
    expect(created).not.toBeNull();

    expect(useSessionStore.getState().confirmRegion()).toBe(true);
    expect(useSessionStore.getState().selectPhase).toBe(SelectPhase.Scouting);
    expect(useSessionStore.getState().regionStatus).toBe("confirmed");

    expect(
      useSessionStore.getState().applyScoutFacts(sampleFacts()),
    ).toBe(true);
    expect(useSessionStore.getState().selectPhase).toBe(
      SelectPhase.Instructing,
    );
    expect(useSessionStore.getState().regionFacts?.targetIds).toEqual([
      "hero-cta",
    ]);

    const turn = useSessionStore
      .getState()
      .submitInstruction("  Increase contrast  ");
    expect(turn).not.toBeNull();
    expect(turn!.instruction).toBe("Increase contrast");
    expect(turn!.region.id).toBe(created!.id);
    expect(turn!.facts?.interactiveCount).toBe(1);
    expect(turn!.stages).toHaveLength(5);
    expect(turn!.stages[0]).toMatchObject({
      role: "scout",
      status: "done",
    });
    expect(turn!.applied).toBe(false);

    const turns = useSessionStore.getState().session.turns;
    expect(turns).toHaveLength(1);
    expect(turns[0]?.id).toBe(turn!.id);
  });

  it("submitInstruction rejects until confirmed + facts exist", () => {
    expect(useSessionStore.getState().submitInstruction("x")).toBeNull();

    useSessionStore.getState().createRegion({
      tool: "rect",
      bbox: sampleRegion().bbox,
    });
    expect(useSessionStore.getState().submitInstruction("x")).toBeNull();

    useSessionStore.getState().confirmRegion();
    expect(useSessionStore.getState().submitInstruction("x")).toBeNull();
  });

  it("Esc/clear after instructing clears selection and facts", () => {
    useSessionStore.getState().createRegion({
      tool: "rect",
      bbox: sampleRegion().bbox,
    });
    useSessionStore.getState().confirmRegion();
    useSessionStore.getState().applyScoutFacts(sampleFacts());
    expect(useSessionStore.getState().selectPhase).toBe(
      SelectPhase.Instructing,
    );

    useSessionStore.getState().clearRegion();
    expect(useSessionStore.getState().selectPhase).toBe(SelectPhase.Idle);
    expect(useSessionStore.getState().region).toBeNull();
    expect(useSessionStore.getState().regionFacts).toBeNull();
  });
});
