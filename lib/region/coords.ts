import type { Point } from "@/lib/schemas";

/**
 * Map a client pointer event into CSS px relative to the preview root.
 * Accounts for scroll offset inside the preview host.
 */
export function clientToPreviewPoint(
  clientX: number,
  clientY: number,
  previewRoot: HTMLElement,
): Point {
  const rect = previewRoot.getBoundingClientRect();
  const scaleX = previewRoot.offsetWidth / Math.max(rect.width, 1);
  const scaleY = previewRoot.offsetHeight / Math.max(rect.height, 1);

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function clampPointToSize(
  point: Point,
  width: number,
  height: number,
): Point {
  return {
    x: Math.min(Math.max(point.x, 0), Math.max(width, 0)),
    y: Math.min(Math.max(point.y, 0), Math.max(height, 0)),
  };
}
