import { describe, expect, it } from "vitest";
import {
  deleteAnchorWithRefit,
  insertAnchorAtSegment,
} from "@/lib/avnac-vector/pen-ops";
import { cubicPoint } from "@/lib/avnac-vector/geometry";
import type { VectorPenAnchor, VectorPoint } from "@/lib/avnac-vector/types";

function curve(): VectorPenAnchor[] {
  return [
    { x: 100, y: 400, outX: 200, outY: 200, type: "cusp" },
    { x: 400, y: 200, inX: 300, inY: 100, outX: 500, outY: 300, type: "symmetric" },
    { x: 700, y: 400, inX: 600, inY: 300, type: "cusp" },
  ];
}

function sampleAnchors(anchors: VectorPenAnchor[], perSegment = 8): VectorPoint[] {
  const out: VectorPoint[] = [];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    const p0: VectorPoint = [a.x, a.y];
    const p1: VectorPoint = [a.outX ?? a.x, a.outY ?? a.y];
    const p2: VectorPoint = [b.inX ?? b.x, b.inY ?? b.y];
    const p3: VectorPoint = [b.x, b.y];
    for (let s = 0; s <= perSegment; s += 1) {
      out.push(cubicPoint(p0, p1, p2, p3, s / perSegment));
    }
  }
  return out;
}

function maxDistance(a: VectorPoint[], b: VectorPoint[]): number {
  let worst = 0;
  for (const p of a) {
    let best = Infinity;
    for (const q of b) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
    worst = Math.max(worst, best);
  }
  return worst;
}

describe("unit: vector / pen operations", () => {
  it("splits a cubic exactly with De Casteljau", () => {
    const anchors = curve();
    const before = sampleAnchors(anchors, 64);
    const split = insertAnchorAtSegment(anchors, 0, 0.5, false);
    expect(split).not.toBeNull();
    expect(split!.anchors).toHaveLength(4);
    expect(split!.insertedIndex).toBe(1);
    const after = sampleAnchors(split!.anchors, 64);
    expect(maxDistance(before, after)).toBeLessThan(0.05);
  });

  it("marks a split curve node smooth and a split line node corner", () => {
    const curveSplit = insertAnchorAtSegment(curve(), 0, 0.4, false)!;
    expect(curveSplit.anchors[1]!.type).toBe("smooth");
    const line: VectorPenAnchor[] = [
      { x: 0, y: 0, type: "corner" },
      { x: 100, y: 0, type: "corner" },
    ];
    const lineSplit = insertAnchorAtSegment(line, 0, 0.5, false)!;
    expect(lineSplit.anchors[1]!.type).toBe("corner");
    expect(lineSplit.anchors[1]!.inX).toBeUndefined();
  });

  it("refits the curve when deleting a middle node", () => {
    const anchors = curve();
    const before = sampleAnchors(anchors, 16);
    const result = deleteAnchorWithRefit(anchors, 1, false, 1);
    expect(result.anchors).toHaveLength(2);
    expect(result.refit).toBe(true);
    expect(result.error).toBeLessThan(40);
    const after = sampleAnchors(result.anchors, 64);
    expect(maxDistance(before, after)).toBeLessThan(40);
  });

  it("falls back to straight segments when the refit cannot match", () => {
    const anchors: VectorPenAnchor[] = [
      { x: 0, y: 0, outX: 200, outY: 0, type: "cusp" },
      { x: 100, y: 0, inX: 50, inY: 0, outX: 150, outY: 0, type: "cusp" },
      { x: 100, y: 1, inX: 100, inY: -100, type: "cusp" },
    ];
    const result = deleteAnchorWithRefit(anchors, 1, false, 0.01);
    expect(result.anchors).toHaveLength(2);
    expect(result.refit).toBe(false);
    expect(result.anchors[0]!.outX).toBeUndefined();
    expect(result.anchors[1]!.inX).toBeUndefined();
  });

  it("clears only the facing handle when deleting an endpoint", () => {
    const anchors = curve();
    const result = deleteAnchorWithRefit(anchors, 0, false, 1);
    expect(result.anchors).toHaveLength(2);
    expect(result.anchors[0]!.inX).toBeUndefined();
    expect(result.anchors[1]!.outX).toBeUndefined();
  });

  it("does not mutate the input anchors", () => {
    const anchors = curve();
    const snapshot = JSON.stringify(anchors);
    deleteAnchorWithRefit(anchors, 1, false, 1);
    expect(JSON.stringify(anchors)).toBe(snapshot);
  });
});
