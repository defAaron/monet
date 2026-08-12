import { describe, expect, it } from "vitest";
import type { BBox } from "@/lib/schemas";
import {
  bboxOverlapArea,
  buildSampleGrid,
  pointInPolygon,
  rankElementsByOverlap,
} from "./scout";

/** Minimal DOM stub for ranking helpers (node vitest env). */
function stubElement(opts: {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  tagName?: string;
}): Element {
  const attrs = new Map<string, string>();
  if (opts.id) attrs.set("data-monet-id", opts.id);

  return {
    tagName: (opts.tagName ?? "DIV").toUpperCase(),
    className: "",
    parentElement: null as Element | null,
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    getBoundingClientRect() {
      return {
        x: opts.left,
        y: opts.top,
        left: opts.left,
        top: opts.top,
        width: opts.width,
        height: opts.height,
        right: opts.left + opts.width,
        bottom: opts.top + opts.height,
        toJSON() {
          return {};
        },
      };
    },
  } as unknown as Element;
}

function stubPreviewRoot(
  children: Element[],
  size: { width: number; height: number } = { width: 800, height: 600 },
): HTMLElement {
  const root = {
    tagName: "DIV",
    offsetWidth: size.width,
    offsetHeight: size.height,
    parentElement: null,
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: size.width,
        height: size.height,
        right: size.width,
        bottom: size.height,
        toJSON() {
          return {};
        },
      };
    },
    contains(node: Node) {
      return children.includes(node as Element) || node === root;
    },
  } as unknown as HTMLElement;

  for (const child of children) {
    Object.defineProperty(child, "parentElement", {
      value: root,
      configurable: true,
    });
  }

  return root;
}

/** Target-id ranking sort used by Scout (overlap desc, then id asc). */
function rankTargetIdsByOverlap(
  hits: { id: string; overlapArea: number }[],
): string[] {
  const sorted = [...hits].sort((a, b) => {
    if (b.overlapArea !== a.overlapArea) return b.overlapArea - a.overlapArea;
    return a.id.localeCompare(b.id);
  });
  const out: string[] = [];
  const seen = new Set<string>();
  for (const hit of sorted) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    out.push(hit.id);
  }
  return out;
}

describe("bboxOverlapArea", () => {
  it("returns the intersection area of overlapping boxes", () => {
    const a: BBox = { x: 0, y: 0, width: 100, height: 100 };
    const b: BBox = { x: 50, y: 50, width: 100, height: 100 };
    expect(bboxOverlapArea(a, b)).toBe(2500);
  });

  it("returns 0 for non-overlapping or edge-touching boxes", () => {
    const a: BBox = { x: 0, y: 0, width: 40, height: 40 };
    expect(bboxOverlapArea(a, { x: 40, y: 0, width: 10, height: 10 })).toBe(0);
    expect(bboxOverlapArea(a, { x: 100, y: 100, width: 10, height: 10 })).toBe(
      0,
    );
  });

  it("handles containment and identical boxes", () => {
    const outer: BBox = { x: 0, y: 0, width: 200, height: 100 };
    const inner: BBox = { x: 20, y: 10, width: 50, height: 40 };
    expect(bboxOverlapArea(outer, inner)).toBe(2000);
    expect(bboxOverlapArea(outer, outer)).toBe(20000);
  });
});

describe("rankElementsByOverlap", () => {
  it("ranks candidates by descending overlap with the selection", () => {
    const small = stubElement({
      id: "small",
      left: 0,
      top: 0,
      width: 20,
      height: 20,
    });
    const large = stubElement({
      id: "large",
      left: 0,
      top: 0,
      width: 80,
      height: 80,
    });
    const miss = stubElement({
      id: "miss",
      left: 500,
      top: 500,
      width: 40,
      height: 40,
    });
    const root = stubPreviewRoot([small, large, miss]);
    const selection: BBox = { x: 0, y: 0, width: 100, height: 100 };

    const ranked = rankElementsByOverlap([small, large, miss], selection, root);

    expect(ranked.map((r) => r.element.getAttribute("data-monet-id"))).toEqual([
      "large",
      "small",
    ]);
    expect(ranked[0].overlapArea).toBe(6400);
    expect(ranked[1].overlapArea).toBe(400);
  });

  it("breaks overlap ties with a stable data-monet-id key", () => {
    const beta = stubElement({
      id: "beta",
      left: 0,
      top: 0,
      width: 50,
      height: 50,
    });
    const alpha = stubElement({
      id: "alpha",
      left: 0,
      top: 0,
      width: 50,
      height: 50,
    });
    const root = stubPreviewRoot([beta, alpha]);
    const selection: BBox = { x: 0, y: 0, width: 100, height: 100 };

    const ranked = rankElementsByOverlap([beta, alpha], selection, root);

    expect(ranked.map((r) => r.element.getAttribute("data-monet-id"))).toEqual([
      "alpha",
      "beta",
    ]);
    expect(ranked[0].overlapArea).toBe(ranked[1].overlapArea);
  });

  it("skips elements outside the preview root", () => {
    const inside = stubElement({
      id: "hero-cta",
      left: 10,
      top: 10,
      width: 40,
      height: 20,
    });
    const outside = stubElement({
      id: "elsewhere",
      left: 10,
      top: 10,
      width: 40,
      height: 20,
    });
    const root = stubPreviewRoot([inside]);
    const selection: BBox = { x: 0, y: 0, width: 100, height: 100 };

    const ranked = rankElementsByOverlap([inside, outside], selection, root);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].element.getAttribute("data-monet-id")).toBe("hero-cta");
  });
});

describe("target ranking by overlap", () => {
  it("orders data-monet-id targets by overlap then id", () => {
    const selection: BBox = { x: 0, y: 0, width: 100, height: 100 };
    const boxes: Record<string, BBox> = {
      "hero-cta": { x: 0, y: 0, width: 80, height: 40 },
      "primary-nav": { x: 0, y: 0, width: 20, height: 20 },
      "signup-form": { x: 200, y: 200, width: 50, height: 50 },
      twin: { x: 10, y: 10, width: 20, height: 20 },
    };

    const hits = Object.entries(boxes)
      .map(([id, box]) => ({
        id,
        overlapArea: bboxOverlapArea(box, selection),
      }))
      .filter((h) => h.overlapArea > 0);

    // Equal overlap for twin-a / twin-b style ties
    hits.push({ id: "aaa-tie", overlapArea: hits.find((h) => h.id === "twin")!.overlapArea });
    hits.push({ id: "zzz-tie", overlapArea: hits.find((h) => h.id === "twin")!.overlapArea });

    // Overlaps: hero-cta 3200; aaa-tie / primary-nav / twin / zzz-tie all 400
    expect(rankTargetIdsByOverlap(hits)).toEqual([
      "hero-cta",
      "aaa-tie",
      "primary-nav",
      "twin",
      "zzz-tie",
    ]);
  });
});

describe("buildSampleGrid", () => {
  it("places cell-center samples for an N×N grid", () => {
    const points = buildSampleGrid({ x: 0, y: 0, width: 100, height: 100 }, 2);
    expect(points).toEqual([
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 75 },
      { x: 75, y: 75 },
    ]);
  });

  it("returns no points for an empty bbox", () => {
    expect(buildSampleGrid({ x: 0, y: 0, width: 0, height: 10 }, 8)).toEqual(
      [],
    );
  });
});

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it("detects interior vs exterior points", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 20, y: 5 }, square)).toBe(false);
  });

  it("rejects polygons with fewer than 3 vertices", () => {
    expect(pointInPolygon({ x: 1, y: 1 }, [{ x: 0, y: 0 }, { x: 2, y: 2 }])).toBe(
      false,
    );
  });
});
