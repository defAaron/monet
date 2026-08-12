"use client";

import type { BBox, Point, RegionTool } from "@/lib/schemas";
import styles from "./Overlay.module.css";

export interface StrokeDraft {
  tool: RegionTool;
  /** Live rect corners or freehand polyline (preview CSS px). */
  points: Point[];
  bbox: BBox | null;
}

interface StrokeLayerProps {
  draft: StrokeDraft | null;
  regionPath: Point[] | null;
  regionBBox: BBox | null;
  regionTool: RegionTool | null;
  confirmed: boolean;
  width: number;
  height: number;
}

function pathToSvg(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function rectPath(bbox: BBox): string {
  const { x, y, width, height } = bbox;
  return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
}

export function StrokeLayer({
  draft,
  regionPath,
  regionBBox,
  regionTool,
  confirmed,
  width,
  height,
}: StrokeLayerProps) {
  const livePath =
    draft?.tool === "freehand" && draft.points.length > 0
      ? pathToSvg(draft.points)
      : draft?.tool === "rect" && draft.bbox
        ? rectPath(draft.bbox)
        : null;

  const committedPath =
    regionTool === "freehand" && regionPath && regionPath.length > 0
      ? pathToSvg(regionPath)
      : regionTool === "rect" && regionBBox
        ? rectPath(regionBBox)
        : regionBBox
          ? rectPath(regionBBox)
          : null;

  const showCommitted = !draft && committedPath;

  return (
    <svg
      className={styles.svg}
      width={width}
      height={height}
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      aria-hidden="true"
    >
      {showCommitted ? (
        <path
          className={`${styles.stroke} ${
            confirmed ? styles.strokeConfirmed : styles.strokeDraft
          }`}
          d={committedPath}
          fill="rgba(61, 139, 122, 0.12)"
        />
      ) : null}
      {livePath ? (
        <path
          className={`${styles.stroke} ${styles.strokeLive}`}
          d={livePath}
          fill={
            draft?.tool === "rect"
              ? "rgba(61, 139, 122, 0.1)"
              : "none"
          }
        />
      ) : null}
    </svg>
  );
}
