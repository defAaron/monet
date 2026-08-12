import type {
  BBox,
  Point,
  RegionColorFact,
  RegionContrastFact,
  RegionFacts,
  RegionFontFact,
  RegionGeometry,
} from "@/lib/schemas";
import { isEmptyBBox } from "./bbox";
import {
  contrastRatio,
  parseCssColor,
  passesWcagAA,
  rgbToHex,
  type Rgb,
} from "./scoutContrast";

export {
  contrastRatio,
  parseCssColor,
  passesWcagAA,
  relativeLuminance,
  rgbToHex,
  type Rgb,
} from "./scoutContrast";

const DEFAULT_GRID = 8;
const MAX_COLORS = 6;
const MAX_FONTS = 5;
const MAX_CONTRAST = 5;
const MAX_HINTS = 6;
const MAX_TARGETS = 12;
const TEXT_SAMPLE_MAX = 140;

const INTERACTIVE_SELECTOR =
  "a[href], button, input, select, textarea, summary, [role='button'], [role='link'], [role='textbox'], [role='checkbox'], [role='radio'], [role='switch'], [tabindex]:not([tabindex='-1'])";

export interface ScoutOptions {
  /** Sample grid resolution along each axis (TRD: e.g. 8×8). */
  gridSize?: number;
  maxColors?: number;
  maxFonts?: number;
  maxContrast?: number;
  maxHints?: number;
  maxTargets?: number;
  textSampleMax?: number;
}

export interface RankedElement {
  element: Element;
  overlapArea: number;
}

type GeometryInput = Pick<RegionGeometry, "bbox" | "path" | "tool">;

/**
 * Deterministic Scout sampler (TRD §7.3).
 * Client-side: grid `elementsFromPoint` + DOM walk under `#monet-preview-root`.
 */
export function sampleRegionFacts(
  previewRoot: HTMLElement,
  geometry: GeometryInput,
  options: ScoutOptions = {},
): RegionFacts {
  const {
    gridSize = DEFAULT_GRID,
    maxColors = MAX_COLORS,
    maxFonts = MAX_FONTS,
    maxContrast = MAX_CONTRAST,
    maxHints = MAX_HINTS,
    maxTargets = MAX_TARGETS,
    textSampleMax = TEXT_SAMPLE_MAX,
  } = options;

  if (typeof document === "undefined" || isEmptyBBox(geometry.bbox)) {
    return emptyFacts();
  }

  const mask = geometry.path && geometry.path.length >= 3 ? geometry.path : null;
  const gridPoints = buildSampleGrid(geometry.bbox, gridSize).filter((p) =>
    mask ? pointInPolygon(p, mask) : true,
  );

  const hitCounts = new Map<Element, number>();

  withOverlayPassthrough(previewRoot, () => {
    for (const point of gridPoints) {
      const client = previewToClientPoint(point, previewRoot);
      const stack = document.elementsFromPoint(client.x, client.y);
      const hit = firstContentElement(stack, previewRoot);
      if (!hit) continue;
      hitCounts.set(hit, (hitCounts.get(hit) ?? 0) + 1);
    }
  });

  const walked = collectElementsInRegion(previewRoot, geometry.bbox, mask);
  for (const el of walked) {
    if (!hitCounts.has(el)) hitCounts.set(el, 0);
  }

  const ranked = rankElementsByOverlap(
    Array.from(hitCounts.keys()),
    geometry.bbox,
    previewRoot,
  );

  // Prefer elements that were actually sampled when overlap ties.
  ranked.sort((a, b) => {
    if (b.overlapArea !== a.overlapArea) return b.overlapArea - a.overlapArea;
    const hb = hitCounts.get(b.element) ?? 0;
    const ha = hitCounts.get(a.element) ?? 0;
    if (hb !== ha) return hb - ha;
    return elementStableKey(a.element).localeCompare(elementStableKey(b.element));
  });

  const colors = collectColors(ranked, hitCounts, maxColors);
  const fonts = collectFonts(ranked, maxFonts);
  const contrast = collectContrast(ranked, previewRoot, maxContrast);
  const { interactiveCount, linkCount } = countInteractive(
    previewRoot,
    geometry.bbox,
    mask,
  );
  const textSample = collectTextSample(ranked, textSampleMax);
  const domPathHints = collectDomPathHints(ranked, maxHints);
  const targetIds = collectTargetIds(
    previewRoot,
    geometry.bbox,
    mask,
    maxTargets,
  );

  const facts: RegionFacts = {
    colors,
    fonts,
    interactiveCount,
    linkCount,
  };

  if (contrast.length > 0) facts.contrast = contrast;
  if (textSample) facts.textSample = textSample;
  if (domPathHints.length > 0) facts.domPathHints = domPathHints;
  if (targetIds.length > 0) facts.targetIds = targetIds;

  return facts;
}

function emptyFacts(): RegionFacts {
  return {
    colors: [],
    fonts: [],
    interactiveCount: 0,
    linkCount: 0,
  };
}

/** Build an N×N grid of sample points inside bbox (centers of cells). */
export function buildSampleGrid(bbox: BBox, gridSize: number): Point[] {
  const n = Math.max(1, Math.floor(gridSize));
  const points: Point[] = [];
  if (bbox.width <= 0 || bbox.height <= 0) return points;

  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      points.push({
        x: bbox.x + ((col + 0.5) / n) * bbox.width,
        y: bbox.y + ((row + 0.5) / n) * bbox.height,
      });
    }
  }
  return points;
}

/** Ray-casting point-in-polygon (inclusive on edges via epsilon). */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersect =
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) +
          pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Intersection area of two axis-aligned boxes. */
export function bboxOverlapArea(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

/**
 * Rank candidate elements by overlap area with the selection bbox
 * (descending). Ties break on a stable element key.
 */
export function rankElementsByOverlap(
  elements: Iterable<Element>,
  selection: BBox,
  previewRoot: HTMLElement,
): RankedElement[] {
  const ranked: RankedElement[] = [];
  for (const element of Array.from(elements)) {
    if (!previewRoot.contains(element) || isOverlayChrome(element, previewRoot)) {
      continue;
    }
    const elBox = elementPreviewBBox(element, previewRoot);
    const overlapArea = bboxOverlapArea(elBox, selection);
    if (overlapArea <= 0) continue;
    ranked.push({ element, overlapArea });
  }

  ranked.sort((a, b) => {
    if (b.overlapArea !== a.overlapArea) return b.overlapArea - a.overlapArea;
    return elementStableKey(a.element).localeCompare(elementStableKey(b.element));
  });
  return ranked;
}

export function previewToClientPoint(
  point: Point,
  previewRoot: HTMLElement,
): { x: number; y: number } {
  const rect = previewRoot.getBoundingClientRect();
  const scaleX = rect.width / Math.max(previewRoot.offsetWidth, 1);
  const scaleY = rect.height / Math.max(previewRoot.offsetHeight, 1);
  return {
    x: rect.left + point.x * scaleX,
    y: rect.top + point.y * scaleY,
  };
}

export function elementPreviewBBox(
  element: Element,
  previewRoot: HTMLElement,
): BBox {
  const er = element.getBoundingClientRect();
  const pr = previewRoot.getBoundingClientRect();
  const scaleX = previewRoot.offsetWidth / Math.max(pr.width, 1);
  const scaleY = previewRoot.offsetHeight / Math.max(pr.height, 1);
  return {
    x: (er.left - pr.left) * scaleX,
    y: (er.top - pr.top) * scaleY,
    width: er.width * scaleX,
    height: er.height * scaleY,
  };
}

function collectElementsInRegion(
  previewRoot: HTMLElement,
  bbox: BBox,
  mask: Point[] | null,
): Element[] {
  const out: Element[] = [];
  const walk = Array.from(previewRoot.querySelectorAll("*"));
  for (const el of walk) {
    if (isOverlayChrome(el, previewRoot)) continue;
    const elBox = elementPreviewBBox(el, previewRoot);
    if (bboxOverlapArea(elBox, bbox) <= 0) continue;
    if (mask) {
      const cx = elBox.x + elBox.width / 2;
      const cy = elBox.y + elBox.height / 2;
      if (!pointInPolygon({ x: cx, y: cy }, mask)) continue;
    }
    out.push(el);
  }
  return out;
}

function firstContentElement(
  stack: Element[],
  previewRoot: HTMLElement,
): Element | null {
  for (const el of stack) {
    if (!(el instanceof Element)) continue;
    if (!previewRoot.contains(el)) continue;
    if (el === previewRoot) continue;
    if (isOverlayChrome(el, previewRoot)) continue;
    return el;
  }
  return null;
}

function isOverlayChrome(el: Element, previewRoot: HTMLElement): boolean {
  let cur: Element | null = el;
  while (cur && cur !== previewRoot) {
    if (cur.parentElement === previewRoot) {
      const label = cur.getAttribute("aria-label") ?? "";
      if (/selection overlay/i.test(label)) return true;
      if (
        cur.getAttribute("role") === "presentation" &&
        getComputedStyle(cur).position === "absolute"
      ) {
        return true;
      }
    }
    cur = cur.parentElement;
  }
  return false;
}

function withOverlayPassthrough<T>(previewRoot: HTMLElement, fn: () => T): T {
  const overlays: HTMLElement[] = [];
  for (const child of Array.from(previewRoot.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const label = child.getAttribute("aria-label") ?? "";
    if (
      /selection overlay/i.test(label) ||
      (child.getAttribute("role") === "presentation" &&
        getComputedStyle(child).position === "absolute")
    ) {
      overlays.push(child);
    }
  }

  const prev = overlays.map((el) => el.style.pointerEvents);
  for (const el of overlays) el.style.pointerEvents = "none";
  try {
    return fn();
  } finally {
    overlays.forEach((el, i) => {
      el.style.pointerEvents = prev[i] ?? "";
    });
  }
}

function collectColors(
  ranked: RankedElement[],
  hitCounts: Map<Element, number>,
  maxColors: number,
): RegionColorFact[] {
  const weights = new Map<string, number>();
  let total = 0;

  for (const { element } of ranked) {
    const hits = Math.max(hitCounts.get(element) ?? 0, 1);
    const style = getComputedStyle(element);
    for (const prop of ["color", "backgroundColor"] as const) {
      const parsed = parseCssColor(style[prop]);
      if (!parsed || parsed.a < 0.08) continue;
      const hex = rgbToHex(parsed);
      weights.set(hex, (weights.get(hex) ?? 0) + hits);
      total += hits;
    }
  }

  if (total === 0) return [];

  const entries = Array.from(weights.entries())
    .map(([hex, weight]) => ({ hex, ratio: weight / total }))
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return a.hex.localeCompare(b.hex);
    })
    .slice(0, maxColors);

  // Re-normalize ratios so they sum ~1 for the truncated set.
  const sum = entries.reduce((s, e) => s + e.ratio, 0) || 1;
  return entries.map((e) => ({
    hex: e.hex,
    ratio: round4(e.ratio / sum),
  }));
}

function collectFonts(
  ranked: RankedElement[],
  maxFonts: number,
): RegionFontFact[] {
  const seen = new Map<string, RegionFontFact>();

  for (const { element } of ranked) {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const style = getComputedStyle(element);
    const family = firstFontFamily(style.fontFamily);
    const sizePx = parseFloat(style.fontSize);
    const weight = parseFontWeight(style.fontWeight);
    const key = `${family}|${sizePx}|${weight}`;
    if (seen.has(key)) continue;

    const fact: RegionFontFact = {};
    if (family) fact.family = family;
    if (Number.isFinite(sizePx)) fact.sizePx = sizePx;
    if (weight != null) fact.weight = weight;
    if (fact.family || fact.sizePx != null || fact.weight != null) {
      seen.set(key, fact);
    }
    if (seen.size >= maxFonts) break;
  }

  return Array.from(seen.values());
}

function collectContrast(
  ranked: RankedElement[],
  previewRoot: HTMLElement,
  maxContrast: number,
): RegionContrastFact[] {
  const pairs: RegionContrastFact[] = [];
  const seen = new Set<string>();

  for (const { element } of ranked) {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    const fgParsed = parseCssColor(getComputedStyle(element).color);
    if (!fgParsed || fgParsed.a < 0.08) continue;
    const bgParsed = resolveOpaqueBackground(element, previewRoot);
    if (!bgParsed) continue;

    const fg = rgbToHex(fgParsed);
    const bg = rgbToHex(bgParsed);
    const key = `${fg}|${bg}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const ratio = contrastRatio(fgParsed, bgParsed);
    if (ratio == null) continue;

    const sizePx = parseFloat(getComputedStyle(element).fontSize);
    const weight = parseFontWeight(getComputedStyle(element).fontWeight) ?? 400;
    const largeText =
      (Number.isFinite(sizePx) && sizePx >= 24) ||
      (Number.isFinite(sizePx) && sizePx >= 18.66 && weight >= 700);

    pairs.push({
      foreground: fg,
      background: bg,
      ratio: round2(ratio),
      passAA: passesWcagAA(ratio, largeText),
    });

    if (pairs.length >= maxContrast) break;
  }

  return pairs;
}

function resolveOpaqueBackground(
  element: Element,
  previewRoot: HTMLElement,
): Rgb | null {
  let cur: Element | null = element;
  while (cur && previewRoot.contains(cur)) {
    const parsed = parseCssColor(getComputedStyle(cur).backgroundColor);
    if (parsed && parsed.a >= 0.08) return parsed;
    if (cur === previewRoot) break;
    cur = cur.parentElement;
  }

  // Fall back to canvas / page background when ancestry is transparent.
  if (typeof document !== "undefined" && document.body) {
    const bodyBg = parseCssColor(getComputedStyle(document.body).backgroundColor);
    if (bodyBg && bodyBg.a >= 0.08) return bodyBg;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function countInteractive(
  previewRoot: HTMLElement,
  bbox: BBox,
  mask: Point[] | null,
): { interactiveCount: number; linkCount: number } {
  let interactiveCount = 0;
  let linkCount = 0;
  const nodes = Array.from(previewRoot.querySelectorAll(INTERACTIVE_SELECTOR));

  for (const el of nodes) {
    if (isOverlayChrome(el, previewRoot)) continue;
    const elBox = elementPreviewBBox(el, previewRoot);
    if (bboxOverlapArea(elBox, bbox) <= 0) continue;
    if (mask) {
      const cx = elBox.x + elBox.width / 2;
      const cy = elBox.y + elBox.height / 2;
      if (!pointInPolygon({ x: cx, y: cy }, mask)) continue;
    }

    interactiveCount += 1;
    if (el.tagName === "A" || el.getAttribute("role") === "link") {
      linkCount += 1;
    }
  }

  return { interactiveCount, linkCount };
}

function collectTextSample(
  ranked: RankedElement[],
  maxLen: number,
): string | undefined {
  const chunks: string[] = [];
  let len = 0;

  for (const { element } of ranked) {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (chunks.some((c) => c.includes(text) || text.includes(c))) continue;
    chunks.push(text);
    len += text.length;
    if (len >= maxLen) break;
  }

  if (chunks.length === 0) return undefined;
  const joined = chunks.join(" · ");
  return joined.length > maxLen ? `${joined.slice(0, maxLen - 1)}…` : joined;
}

function collectDomPathHints(
  ranked: RankedElement[],
  maxHints: number,
): string[] {
  const hints: string[] = [];
  const seen = new Set<string>();

  for (const { element } of ranked) {
    const hint = elementPathHint(element);
    if (!hint || seen.has(hint)) continue;
    seen.add(hint);
    hints.push(hint);
    if (hints.length >= maxHints) break;
  }
  return hints;
}

function collectTargetIds(
  previewRoot: HTMLElement,
  bbox: BBox,
  mask: Point[] | null,
  maxTargets: number,
): string[] {
  type TargetHit = { id: string; overlapArea: number };
  const hits: TargetHit[] = [];

  const nodes = Array.from(previewRoot.querySelectorAll("[data-monet-id]"));
  for (const el of nodes) {
    if (isOverlayChrome(el, previewRoot)) continue;
    const id = el.getAttribute("data-monet-id")?.trim();
    if (!id) continue;
    const elBox = elementPreviewBBox(el, previewRoot);
    const overlapArea = bboxOverlapArea(elBox, bbox);
    if (overlapArea <= 0) continue;
    if (mask) {
      const cx = elBox.x + elBox.width / 2;
      const cy = elBox.y + elBox.height / 2;
      if (!pointInPolygon({ x: cx, y: cy }, mask)) continue;
    }
    hits.push({ id, overlapArea });
  }

  hits.sort((a, b) => {
    if (b.overlapArea !== a.overlapArea) return b.overlapArea - a.overlapArea;
    return a.id.localeCompare(b.id);
  });

  const out: string[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    out.push(hit.id);
    if (out.length >= maxTargets) break;
  }
  return out;
}

function elementPathHint(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const monetId = element.getAttribute("data-monet-id");
  if (monetId) return `${tag}[data-monet-id="${monetId}"]`;

  const cls = typeof element.className === "string" ? element.className : "";
  const firstClass = cls
    .split(/\s+/)
    .map((c) => c.trim())
    .find((c) => c && !c.includes(":"));
  if (firstClass) {
    // CSS modules hash — keep a short readable hint.
    const short = firstClass.length > 40 ? firstClass.slice(0, 40) : firstClass;
    return `${tag}.${short}`;
  }

  const role = element.getAttribute("role");
  if (role) return `${tag}[role="${role}"]`;
  return tag;
}

function elementStableKey(element: Element): string {
  const monetId = element.getAttribute("data-monet-id");
  if (monetId) return `id:${monetId}`;
  return elementPathHint(element);
}

function firstFontFamily(fontFamily: string): string | undefined {
  const first = fontFamily.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || undefined;
}

function parseFontWeight(weight: string): number | null {
  const n = Number.parseInt(weight, 10);
  if (Number.isFinite(n)) return n;
  const map: Record<string, number> = {
    normal: 400,
    bold: 700,
    lighter: 300,
    bolder: 700,
  };
  return map[weight.toLowerCase()] ?? null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
