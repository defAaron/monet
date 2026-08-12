import { describe, expect, it } from "vitest";
import { closePath, simplifyRdp } from "./simplify";

describe("simplifyRdp", () => {
  it("keeps endpoints of a straight line and drops colinear mids", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    expect(simplifyRdp(points, 1.5)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it("preserves a corner that exceeds epsilon", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(simplifyRdp(points, 1.5)).toEqual(points);
  });

  it("reduces a dense near-linear stroke around the 1.5px budget", () => {
    const points = Array.from({ length: 41 }, (_, i) => ({
      x: i,
      y: i % 2 === 0 ? 0 : 0.2,
    }));
    const simplified = simplifyRdp(points, 1.5);
    expect(simplified.length).toBeLessThan(points.length);
    expect(simplified[0]).toEqual(points[0]);
    expect(simplified[simplified.length - 1]).toEqual(
      points[points.length - 1],
    );
  });

  it("returns a copy for short paths", () => {
    const one = [{ x: 1, y: 2 }];
    const two = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];
    expect(simplifyRdp(one, 1.5)).toEqual(one);
    expect(simplifyRdp(two, 1.5)).toEqual(two);
    expect(simplifyRdp(two, 1.5)).not.toBe(two);
  });
});

describe("closePath", () => {
  it("appends the first point when the path is open", () => {
    expect(
      closePath([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 2, y: 3 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
      { x: 0, y: 0 },
    ]);
  });

  it("does not duplicate an already-closed path", () => {
    const closed = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 0 },
    ];
    expect(closePath(closed)).toEqual(closed);
  });
});
