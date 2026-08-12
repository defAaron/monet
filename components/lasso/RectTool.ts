import type { BBox, Point } from "@/lib/schemas";
import { bboxFromPoints, isEmptyBBox } from "@/lib/region";

export interface RectStrokeState {
  origin: Point;
  current: Point;
  bbox: BBox;
}

export function startRectStroke(origin: Point): RectStrokeState {
  return {
    origin,
    current: origin,
    bbox: bboxFromPoints(origin, origin),
  };
}

export function updateRectStroke(
  state: RectStrokeState,
  current: Point,
): RectStrokeState {
  return {
    origin: state.origin,
    current,
    bbox: bboxFromPoints(state.origin, current),
  };
}

export function finalizeRectStroke(
  state: RectStrokeState,
  minSize = 2,
): BBox | null {
  if (isEmptyBBox(state.bbox, minSize)) return null;
  return state.bbox;
}
