import type { Point } from "@/lib/schemas";

/** Squared perpendicular distance from point `p` to segment `a`→`b`. */
function perpendicularDistanceSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return ex * ex + ey * ey;
  }

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  const ex = p.x - projX;
  const ey = p.y - projY;
  return ex * ex + ey * ey;
}

/**
 * Ramer–Douglas–Peucker path simplification.
 * Default epsilon ~1.5px matches TRD §7.2.
 */
export function simplifyRdp(points: Point[], epsilon = 1.5): Point[] {
  if (points.length <= 2) {
    return points.slice();
  }

  const epsilonSq = epsilon * epsilon;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDistSq = 0;
    let maxIndex = -1;

    const a = points[start];
    const b = points[end];

    for (let i = start + 1; i < end; i += 1) {
      const distSq = perpendicularDistanceSq(points[i], a, b);
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIndex = i;
      }
    }

    if (maxDistSq > epsilonSq && maxIndex >= 0) {
      keep[maxIndex] = 1;
      if (maxIndex - start > 1) stack.push([start, maxIndex]);
      if (end - maxIndex > 1) stack.push([maxIndex, end]);
    }
  }

  const result: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

/** Close a freehand path by repeating the first point when needed. */
export function closePath(points: Point[]): Point[] {
  if (points.length < 2) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (first.x === last.x && first.y === last.y) return points.slice();
  return [...points, { x: first.x, y: first.y }];
}
