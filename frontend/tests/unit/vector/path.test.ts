import { describe, expect, it } from "vitest";
import {
  buildStrokePath,
  distanceToStroke,
  findNearestPointOnPath,
  nearestPointOnStroke,
  pathBounds,
  pointInStroke,
  strokeToSvgData,
} from "@/lib/avnac-vector/path";
import type { VectorBoardStroke } from "@/lib/avnac-vector/types";

const base: Omit<VectorBoardStroke, "id" | "kind" | "points"> = {
  stroke: "#000",
  strokeWidth: 2,
  strokeOpacity: 1,
  fill: "",
  fillOpacity: 1,
  fillRule: "nonzero",
  lineCap: "round",
  lineJoin: "round",
};

function stroke(partial: Partial<VectorBoardStroke> & Pick<VectorBoardStroke, "kind" | "points">): VectorBoardStroke {
  return { ...base, id: "s1", ...partial };
}

describe("unit: vector / path model", () => {
  it("builds an exact four-cubic ellipse", () => {
    const path = buildStrokePath(
      stroke({ kind: "ellipse", points: [[100, 100], [300, 200]] }),
    );
    expect(path.subpaths).toHaveLength(1);
    expect(path.subpaths[0]!.closed).toBe(true);
    expect(path.subpaths[0]!.segments).toHaveLength(4);
    expect(path.subpaths[0]!.segments.every((s) => s.kind === "cubic")).toBe(true);
  });

  it("returns tight cubic bounds rather than a control hull", () => {
    const path = buildStrokePath(
      stroke({
        kind: "pen",
        points: [],
        penAnchors: [
          { x: 0, y: 0, outX: 0, outY: 100, type: "cusp" },
          { x: 100, y: 0, inX: 100, inY: 100, type: "cusp" },
        ],
      }),
    );
    const bounds = pathBounds(path)!;
    expect(bounds.minY).toBeCloseTo(0, 6);
    expect(bounds.maxY).toBeCloseTo(75, 0);
  });

  it("finds the closest point on a line exactly", () => {
    const s = stroke({ kind: "line", points: [[0, 0], [100, 0]] });
    const hit = nearestPointOnStroke(s, [40, 30])!;
    expect(hit.point[0]).toBeCloseTo(40, 6);
    expect(hit.point[1]).toBeCloseTo(0, 6);
    expect(hit.distance).toBeCloseTo(30, 6);
  });

  it("finds the closest point on a cubic", () => {
    const s = stroke({
      kind: "pen",
      points: [],
      penAnchors: [
        { x: 0, y: 0, outX: 50, outY: 100, type: "cusp" },
        { x: 100, y: 0, inX: 50, inY: 100, type: "cusp" },
      ],
    });
    const hit = findNearestPointOnPath(buildStrokePath(s), [50, 70])!;
    expect(hit.distance).toBeLessThan(8);
    expect(hit.t).toBeGreaterThan(0.2);
    expect(hit.t).toBeLessThan(0.8);
  });

  it("computes centerline distance", () => {
    const s = stroke({ kind: "line", points: [[0, 0], [100, 0]] });
    expect(distanceToStroke(s, [50, 12])).toBeCloseTo(12, 6);
  });

  it("tests rect and ellipse containment", () => {
    const rect = stroke({ kind: "rect", points: [[0, 0], [100, 50]] });
    expect(pointInStroke(rect, [50, 25])).toBe(true);
    expect(pointInStroke(rect, [150, 25])).toBe(false);
    const ellipse = stroke({ kind: "ellipse", points: [[0, 0], [100, 100]] });
    expect(pointInStroke(ellipse, [50, 50])).toBe(true);
    expect(pointInStroke(ellipse, [99, 99])).toBe(false);
  });

  it("honors evenodd fill for closed pen paths", () => {
    const anchors = [
      { x: 0, y: 0, type: "corner" as const },
      { x: 100, y: 0, type: "corner" as const },
      { x: 100, y: 100, type: "corner" as const },
      { x: 0, y: 100, type: "corner" as const },
      { x: 0, y: 50, type: "corner" as const },
      { x: 100, y: 50, type: "corner" as const },
      { x: 100, y: 60, type: "corner" as const },
      { x: 0, y: 60, type: "corner" as const },
    ];
    const evenodd = stroke({
      kind: "pen",
      points: [],
      penAnchors: anchors,
      penClosed: true,
      fill: "#000",
      fillRule: "evenodd",
    });
    const nonzero = { ...evenodd, fillRule: "nonzero" as const };
    expect(pointInStroke(evenodd, [50, 55])).toBe(false);
    expect(pointInStroke(nonzero, [50, 55])).toBe(true);
  });

  it("serializes paths with M/C/Z commands and no NaN", () => {
    const s = stroke({
      kind: "pen",
      points: [],
      penAnchors: [
        { x: 0, y: 0, outX: 10, outY: 0, type: "cusp" },
        { x: 100, y: 100, inX: 90, inY: 100, type: "cusp" },
      ],
      penClosed: true,
    });
    const d = strokeToSvgData(s);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d).toContain("C");
    expect(d.endsWith("Z")).toBe(true);
    expect(d).not.toContain("NaN");
  });

  it("keeps a polyline freehand path when no anchors exist", () => {
    const s = stroke({ kind: "pen", points: [[0, 0], [10, 10], [20, 0]] });
    const path = buildStrokePath(s);
    expect(path.subpaths[0]!.segments).toHaveLength(2);
  });
});
