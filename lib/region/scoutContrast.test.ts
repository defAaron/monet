import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  parseCssColor,
  passesWcagAA,
  relativeLuminance,
  rgbToHex,
  type Rgb,
} from "./scoutContrast";

const black: Rgb = { r: 0, g: 0, b: 0, a: 1 };
const white: Rgb = { r: 255, g: 255, b: 255, a: 1 };

describe("parseCssColor", () => {
  it("parses named colors", () => {
    expect(parseCssColor("black")).toEqual(black);
    expect(parseCssColor("white")).toEqual(white);
    expect(parseCssColor("transparent")).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it("parses hex forms", () => {
    expect(parseCssColor("#fff")).toEqual(white);
    expect(parseCssColor("#000000")).toEqual(black);
    expect(parseCssColor("#abc")).toEqual({
      r: 0xaa,
      g: 0xbb,
      b: 0xcc,
      a: 1,
    });
    expect(parseCssColor("#11223380")).toEqual({
      r: 0x11,
      g: 0x22,
      b: 0x33,
      a: expect.closeTo(0x80 / 255, 5),
    });
  });

  it("parses rgb / rgba and modern space-separated syntax", () => {
    expect(parseCssColor("rgb(12, 34, 56)")).toEqual({
      r: 12,
      g: 34,
      b: 56,
      a: 1,
    });
    expect(parseCssColor("rgba(12, 34, 56, 0.5)")).toEqual({
      r: 12,
      g: 34,
      b: 56,
      a: 0.5,
    });
    expect(parseCssColor("rgb(12 34 56 / 50%)")).toEqual({
      r: 12,
      g: 34,
      b: 56,
      a: 0.5,
    });
  });

  it("returns null for empty or unknown input", () => {
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("not-a-color")).toBeNull();
    expect(parseCssColor("#gg")).toBeNull();
  });
});

describe("rgbToHex", () => {
  it("formats clamped sRGB channels", () => {
    expect(rgbToHex(black)).toBe("#000000");
    expect(rgbToHex(white)).toBe("#ffffff");
    expect(rgbToHex({ r: 18, g: 52, b: 86, a: 1 })).toBe("#123456");
  });
});

describe("relativeLuminance", () => {
  it("matches WCAG endpoints for black and white", () => {
    expect(relativeLuminance(black)).toBeCloseTo(0, 6);
    expect(relativeLuminance(white)).toBeCloseTo(1, 6);
  });

  it("is higher for lighter mid-grays", () => {
    const dark = relativeLuminance({ r: 80, g: 80, b: 80, a: 1 });
    const light = relativeLuminance({ r: 200, g: 200, b: 200, a: 1 });
    expect(light).toBeGreaterThan(dark);
  });
});

describe("contrastRatio", () => {
  it("returns 21:1 for black on white (order-independent)", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("returns 1:1 for identical colors", () => {
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
    expect(contrastRatio("#336699", "rgb(51, 102, 153)")).toBeCloseTo(1, 5);
  });

  it("matches known WCAG AA borderlines on white", () => {
    // #767676 on white ≈ 4.54 (passes AA normal text)
    const pass = contrastRatio("#767676", "#ffffff");
    expect(pass).not.toBeNull();
    expect(pass!).toBeGreaterThanOrEqual(4.5);
    expect(pass!).toBeCloseTo(4.54, 1);

    // #777777 on white ≈ 4.48 (fails AA normal text)
    const fail = contrastRatio("#777777", "#ffffff");
    expect(fail).not.toBeNull();
    expect(fail!).toBeLessThan(4.5);
    expect(fail!).toBeCloseTo(4.48, 1);
  });

  it("returns null for unparseable or fully transparent colors", () => {
    expect(contrastRatio("nope", white)).toBeNull();
    expect(contrastRatio("transparent", white)).toBeNull();
    expect(contrastRatio(black, { r: 255, g: 255, b: 255, a: 0 })).toBeNull();
  });
});

describe("passesWcagAA", () => {
  it("uses 4.5:1 for normal text and 3:1 for large text", () => {
    expect(passesWcagAA(4.5)).toBe(true);
    expect(passesWcagAA(4.49)).toBe(false);
    expect(passesWcagAA(3, true)).toBe(true);
    expect(passesWcagAA(2.99, true)).toBe(false);
  });
});
