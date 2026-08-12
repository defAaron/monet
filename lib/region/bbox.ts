import type { BBox, Point } from "@/lib/schemas";

/** Normalize a drag into a non-negative bbox from two corners. */
export function bboxFromPoints(a: Point, b: Point): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Axis-aligned bbox that contains every point in the path. */
export function bboxFromPath(path: Point[]): BBox {
  if (path.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = path[0].x;
  let minY = path[0].y;
  let maxX = path[0].x;
  let maxY = path[0].y;

  for (let i = 1; i < path.length; i += 1) {
    const p = path[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function bboxArea(bbox: BBox): number {
  return bbox.width * bbox.height;
}

export function isEmptyBBox(bbox: BBox, minSize = 2): boolean {
  return bbox.width < minSize || bbox.height < minSize;
}
