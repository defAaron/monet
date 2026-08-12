import type { Point } from "@/lib/schemas";
import {
  bboxFromPath,
  closePath,
  isEmptyBBox,
  simplifyRdp,
} from "@/lib/region";

/** Min squared distance between samples (~1px) to avoid flooding. */
const MIN_SAMPLE_DIST_SQ = 1;

export interface FreehandStrokeState {
  raw: Point[];
}

export function startFreehandStroke(origin: Point): FreehandStrokeState {
  return { raw: [origin] };
}

export function appendFreehandPoint(
  state: FreehandStrokeState,
  point: Point,
): FreehandStrokeState {
  const last = state.raw[state.raw.length - 1];
  if (last) {
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if (dx * dx + dy * dy < MIN_SAMPLE_DIST_SQ) {
      return state;
    }
  }
  return { raw: [...state.raw, point] };
}

/**
 * On pointer up: simplify (~1.5px RDP), close path, compute bbox.
 * Returns null if the stroke is too small.
 */
export function finalizeFreehandStroke(
  state: FreehandStrokeState,
  epsilon = 1.5,
  minSize = 2,
) {
  if (state.raw.length < 3) return null;

  const simplified = simplifyRdp(state.raw, epsilon);
  const path = closePath(simplified);
  const bbox = bboxFromPath(path);

  if (isEmptyBBox(bbox, minSize)) return null;

  return { path, bbox };
}
