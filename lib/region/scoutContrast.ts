/** WCAG 2.x relative-luminance / contrast helpers for Scout (TRD §7.3). */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, Rgb> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
};

/** Parse a CSS color from `getComputedStyle` (rgb/rgba/hex/named). */
export function parseCssColor(input: string): Rgb | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const named = NAMED[raw];
  if (named) return { ...named };

  if (raw.startsWith("#")) {
    return parseHex(raw);
  }

  const rgbMatch = raw.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgbMatch) {
    return {
      r: clampByte(Number(rgbMatch[1])),
      g: clampByte(Number(rgbMatch[2])),
      b: clampByte(Number(rgbMatch[3])),
      a: rgbMatch[4] != null ? clamp01(Number(rgbMatch[4])) : 1,
    };
  }

  // Modern space-separated syntax: rgb(12 34 56 / 0.5)
  const modern = raw.match(
    /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  if (modern) {
    const aRaw = modern[4];
    let a = 1;
    if (aRaw != null) {
      a = aRaw.endsWith("%")
        ? clamp01(Number(aRaw.slice(0, -1)) / 100)
        : clamp01(Number(aRaw));
    }
    return {
      r: clampByte(Number(modern[1])),
      g: clampByte(Number(modern[2])),
      b: clampByte(Number(modern[3])),
      a,
    };
  }

  return null;
}

function parseHex(hex: string): Rgb | null {
  const h = hex.slice(1);
  if (h.length === 3 || h.length === 4) {
    const r = Number.parseInt(h[0] + h[0], 16);
    const g = Number.parseInt(h[1] + h[1], 16);
    const b = Number.parseInt(h[2] + h[2], 16);
    const a =
      h.length === 4 ? clamp01(Number.parseInt(h[3] + h[3], 16) / 255) : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }
  if (h.length === 6 || h.length === 8) {
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    const a =
      h.length === 8 ? clamp01(Number.parseInt(h.slice(6, 8), 16) / 255) : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }
  return null;
}

export function rgbToHex(rgb: Rgb): string {
  const r = clampByte(Math.round(rgb.r));
  const g = clampByte(Math.round(rgb.g));
  const b = clampByte(Math.round(rgb.b));
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

/** WCAG relative luminance for sRGB (0–1). */
export function relativeLuminance(rgb: Rgb): number {
  const toLinear = (c: number) => {
    const s = clamp01(c / 255);
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = toLinear(rgb.r);
  const G = toLinear(rgb.g);
  const B = toLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG contrast ratio between two colors (1–21).
 * Accepts CSS color strings or parsed RGB.
 */
export function contrastRatio(
  foreground: string | Rgb,
  background: string | Rgb,
): number | null {
  const fg = typeof foreground === "string" ? parseCssColor(foreground) : foreground;
  const bg = typeof background === "string" ? parseCssColor(background) : background;
  if (!fg || !bg) return null;
  if (fg.a < 0.01 || bg.a < 0.01) return null;

  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal text is 4.5:1; large text is 3:1. */
export function passesWcagAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? 3 : 4.5);
}

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(255, Math.max(0, n));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, "0");
}
