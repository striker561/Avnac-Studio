import { describe, expect, it } from "vitest";
import {
  applyNodeType,
  dragNodeHandle,
  inferNodeType,
  setSymmetricHandles,
} from "@/lib/avnac-vector/node-types";
import type { VectorPenAnchor } from "@/lib/avnac-vector/types";

function anchor(type: VectorPenAnchor["type"]): VectorPenAnchor {
  return {
    x: 100,
    y: 100,
    inX: 70,
    inY: 100,
    outX: 130,
    outY: 100,
    type,
  };
}

describe("unit: vector / node constraints", () => {
  it("infers symmetric when handles are collinear and equal", () => {
    expect(inferNodeType(anchor("symmetric"))).toBe("symmetric");
  });

  it("infers smooth when handles are collinear with different lengths", () => {
    const a = anchor("smooth");
    a.inX = 50;
    expect(inferNodeType(a)).toBe("smooth");
  });

  it("infers cusp when handles are not collinear", () => {
    const a = anchor("cusp");
    a.outY = 140;
    expect(inferNodeType(a)).toBe("cusp");
  });

  it("infers corner when there are no handles", () => {
    expect(inferNodeType({ x: 0, y: 0, type: "corner" })).toBe("corner");
  });

  it("keeps a smooth node collinear while letting handle lengths differ", () => {
    const a = anchor("smooth");
    a.inX = 60;
    dragNodeHandle(a, "out", [140, 160]);
    const out = [a.outX!, a.outY!];
    const inP = [a.inX!, a.inY!];
    const inVec = [inP[0] - a.x, inP[1] - a.y];
    const outVec = [out[0] - a.x, out[1] - a.y];
    const cross = inVec[0] * outVec[1] - inVec[1] * outVec[0];
    expect(Math.abs(cross)).toBeLessThan(1e-6);
    expect(Math.hypot(inVec[0], inVec[1])).toBeCloseTo(40, 5);
    expect(Math.hypot(outVec[0], outVec[1])).toBeGreaterThan(40);
  });

  it("mirrors a symmetric handle exactly", () => {
    const a = anchor("symmetric");
    dragNodeHandle(a, "out", [150, 120]);
    expect(a.inX).toBeCloseTo(50, 9);
    expect(a.inY).toBeCloseTo(80, 9);
  });

  it("leaves the opposite handle alone on a cusp", () => {
    const a = anchor("cusp");
    const inBefore = [a.inX, a.inY];
    dragNodeHandle(a, "out", [160, 40]);
    expect([a.inX, a.inY]).toEqual(inBefore);
    expect(a.outX).toBe(160);
    expect(a.outY).toBe(40);
  });

  it("strips handles when a node is a corner", () => {
    const a = anchor("corner");
    dragNodeHandle(a, "out", [160, 40]);
    expect(a.inX).toBeUndefined();
    expect(a.outX).toBeUndefined();
  });

  it("converting to smooth rebuilds the opposite handle", () => {
    const a: VectorPenAnchor = { x: 10, y: 10, outX: 30, outY: 10, type: "corner" };
    applyNodeType(a, "smooth");
    expect(a.inX).toBeCloseTo(-10, 9);
    expect(a.inY).toBeCloseTo(10, 9);
  });

  it("setSymmetricHandles creates a mirrored pair", () => {
    const a: VectorPenAnchor = { x: 20, y: 20, type: "corner" };
    setSymmetricHandles(a, [40, 20]);
    expect(a.inX).toBe(0);
    expect(a.type).toBe("symmetric");
  });
});
