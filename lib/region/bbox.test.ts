import { describe, expect, it } from "vitest";
import {
  bboxArea,
  bboxFromPath,
  bboxFromPoints,
  isEmptyBBox,
} from "./bbox";

describe("bboxFromPoints", () => {
  it("normalizes drag corners into a non-negative bbox", () => {
    expect(bboxFromPoints({ x: 10, y: 20 }, { x: 40, y: 50 })).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 30,
    });
    expect(bboxFromPoints({ x: 40, y: 50 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 30,
    });
  });
});

describe("bboxFromPath", () => {
  it("returns zero bbox for an empty path", () => {
    expect(bboxFromPath([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("computes the axis-aligned bounds of a polygon", () => {
    expect(
      bboxFromPath([
        { x: 5, y: 8 },
        { x: 20, y: 3 },
        { x: 12, y: 30 },
      ]),
    ).toEqual({ x: 5, y: 3, width: 15, height: 27 });
  });
});

describe("bbox helpers", () => {
  it("reports area and emptiness", () => {
    expect(bboxArea({ x: 0, y: 0, width: 4, height: 5 })).toBe(20);
    expect(isEmptyBBox({ x: 0, y: 0, width: 1, height: 10 }, 2)).toBe(true);
    expect(isEmptyBBox({ x: 0, y: 0, width: 4, height: 4 }, 2)).toBe(false);
  });
});
