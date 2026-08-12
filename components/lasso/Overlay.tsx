"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clampPointToSize,
  clientToPreviewPoint,
  sampleRegionFacts,
} from "@/lib/region";
import type { Point } from "@/lib/schemas";
import {
  SelectPhase,
  useSessionStore,
  WorkspaceMode,
} from "@/lib/session";
import {
  finalizeFreehandStroke,
} from "./FreehandTool";
import {
  finalizeRectStroke,
  startRectStroke,
  updateRectStroke,
  type RectStrokeState,
} from "./RectTool";
import { StrokeLayer, type StrokeDraft } from "./StrokeLayer";
import styles from "./Overlay.module.css";

interface OverlayProps {
  /** Element that defines the preview coordinate space (`#monet-preview-root`). */
  previewRoot: HTMLElement | null;
}

const MIN_SAMPLE_DIST_SQ = 1;

type LiveStroke =
  | { tool: "rect"; state: RectStrokeState }
  | { tool: "freehand"; points: Point[] };

function toDraft(stroke: LiveStroke): StrokeDraft {
  if (stroke.tool === "rect") {
    return {
      tool: "rect",
      points: [stroke.state.origin, stroke.state.current],
      bbox: stroke.state.bbox,
    };
  }
  return {
    tool: "freehand",
    points: stroke.points,
    bbox: null,
  };
}

export function Overlay({ previewRoot }: OverlayProps) {
  const mode = useSessionStore((s) => s.mode);
  const selectionTool = useSessionStore((s) => s.selectionTool);
  const region = useSessionStore((s) => s.region);
  const regionStatus = useSessionStore((s) => s.regionStatus);
  const selectPhase = useSessionStore((s) => s.selectPhase);
  const createRegion = useSessionStore((s) => s.createRegion);
  const clearRegion = useSessionStore((s) => s.clearRegion);
  const confirmRegion = useSessionStore((s) => s.confirmRegion);
  const applyScoutFacts = useSessionStore((s) => s.applyScoutFacts);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<LiveStroke | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawingRef = useRef(false);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<StrokeDraft | null>(null);

  const active = mode === WorkspaceMode.Select;

  const flushDraft = useCallback(() => {
    rafRef.current = null;
    const stroke = liveRef.current;
    setDraft(stroke ? toDraft(stroke) : null);
  }, []);

  const scheduleDraft = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushDraft);
  }, [flushDraft]);

  useEffect(() => {
    if (!previewRoot) return;

    const measure = () => {
      setSize({
        width: previewRoot.offsetWidth,
        height: previewRoot.offsetHeight,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(previewRoot);
    return () => ro.disconnect();
  }, [previewRoot]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const mapPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!previewRoot) return { x: 0, y: 0 };
      const raw = clientToPreviewPoint(clientX, clientY, previewRoot);
      return clampPointToSize(
        raw,
        previewRoot.offsetWidth,
        previewRoot.offsetHeight,
      );
    },
    [previewRoot],
  );

  const commitStroke = useCallback(
    (stroke: LiveStroke) => {
      if (stroke.tool === "rect") {
        const bbox = finalizeRectStroke(stroke.state);
        if (!bbox) return;
        createRegion({ tool: "rect", bbox });
        return;
      }

      const result = finalizeFreehandStroke({ raw: stroke.points });
      if (!result) return;
      createRegion({
        tool: "freehand",
        bbox: result.bbox,
        path: result.path,
      });
    },
    [createRegion],
  );

  const resetLive = useCallback(() => {
    drawingRef.current = false;
    liveRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setDraft(null);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active || event.button !== 0 || !previewRoot) return;

    event.preventDefault();
    const surface = surfaceRef.current;
    if (!surface) return;

    surface.setPointerCapture(event.pointerId);
    drawingRef.current = true;

    const point = mapPoint(event.clientX, event.clientY);

    if (selectionTool === "rect") {
      liveRef.current = { tool: "rect", state: startRectStroke(point) };
    } else {
      liveRef.current = { tool: "freehand", points: [point] };
    }
    scheduleDraft();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current || !liveRef.current) return;
    event.preventDefault();
    const point = mapPoint(event.clientX, event.clientY);
    const current = liveRef.current;

    if (current.tool === "rect") {
      liveRef.current = {
        tool: "rect",
        state: updateRectStroke(current.state, point),
      };
      scheduleDraft();
      return;
    }

    const last = current.points[current.points.length - 1];
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx * dx + dy * dy < MIN_SAMPLE_DIST_SQ) return;
    }

    // Mutate in place for draw-path throughput, then rAF-paint.
    current.points.push(point);
    scheduleDraft();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }

    const stroke = liveRef.current;
    liveRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setDraft(null);

    if (stroke) commitStroke(stroke);
  };

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        resetLive();
        clearRegion();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        confirmRegion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, clearRegion, confirmRegion, resetLive]);

  useEffect(() => {
    if (!active) resetLive();
  }, [active, resetLive]);

  // S2-F: after Confirm/Enter → scouting, sample DOM under the region then instruct.
  useEffect(() => {
    if (!active) return;
    if (selectPhase !== SelectPhase.Scouting) return;
    if (!previewRoot || !region) return;

    const facts = sampleRegionFacts(previewRoot, region);
    applyScoutFacts(facts);
  }, [active, selectPhase, previewRoot, region, applyScoutFacts]);

  return (
    <div
      ref={surfaceRef}
      className={`${styles.overlay} ${active ? "" : styles.overlayIdle}`}
      role="presentation"
      tabIndex={active ? 0 : -1}
      aria-label={active ? "Selection overlay" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <StrokeLayer
        draft={draft}
        regionPath={region?.path ?? null}
        regionBBox={region?.bbox ?? null}
        regionTool={region?.tool ?? null}
        confirmed={regionStatus === "confirmed"}
        width={size.width || previewRoot?.offsetWidth || 0}
        height={size.height || previewRoot?.offsetHeight || 0}
      />
    </div>
  );
}
