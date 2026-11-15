import { describe, expect, it } from "vitest";
import {
  applyAngleLock,
  applyAxisLock,
  collectSnapCandidates,
  findSnap,
  resolvePlacementPoint,
} from "@/lib/avnac-vector/snap";
import { emptyVectorBoardDocument, insertStrokeIntoActiveLayer } from "@/lib/avnac-vector/document";
import type { VectorBoardStroke } from "@/lib/avnac-vector/types";

const board = { width: 1200, height: 900 };

function line(id: string, points: [[number, number], [number, number]]): VectorBoardStroke {
  return {
    id,
    kind: "line",
    points,
    stroke: "#000",
    strokeWidth: 2,
    strokeOpacity: 1,
    fill: "",
    fillOpacity: 1,
    fillRule: "nonzero",
    lineCap: "round",
    lineJoin: "round",
  };
}

describe("unit: vector / snapping", () => {
  it("snaps a point to a nearby node", () => {
    const doc = emptyVectorBoardDocument();
    const withStroke = insertStrokeIntoActiveLayer(doc, line("l1", [[200, 200], [400, 200]]));
    const candidates = collectSnapCandidates(withStroke);
    const result = findSnap([204, 203], candidates, { tolerance: 8, board });
    expect(result.point).toEqual([200, 200]);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(true);
    expect(result.target).not.toBeNull();
  });

  it("snaps a single axis when only one coordinate is near", () => {
    const candidates = [{ point: [300, 100] as [number, number], kind: "node" as const }];
    const result = findSnap([303, 400], candidates, { tolerance: 8, board, boardGuides: false });
    expect(result.point).toEqual([300, 400]);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(false);
    expect(result.guides).toHaveLength(1);
    expect(result.guides[0]!.axis).toBe("x");
  });

  it("snaps to the board centre lines", () => {
    const result = findSnap([601, 449], [], { tolerance: 5, board });
    expect(result.point).toEqual([600, 450]);
    expect(result.snappedX).toBe(true);
    expect(result.snappedY).toBe(true);
  });

  it("can be disabled without changing the point", () => {
    const result = findSnap([601, 449], [], { tolerance: 8, board, enabled: false });
    expect(result.point).toEqual([601, 449]);
    expect(result.guides).toEqual([]);
  });

  it("locks to the dominant axis with shift", () => {
    expect(applyAxisLock([0, 0], [100, 20])).toEqual([100, 0]);
    expect(applyAxisLock([0, 0], [10, 80])).toEqual([0, 80]);
  });

  it("does not let snapping break a shift axis lock", () => {
    const candidates = [{ point: [300, 100] as [number, number], kind: "node" as const }];
    const result = resolvePlacementPoint({
      point: [303, 104],
      base: [100, 100],
      shiftKey: true,
      candidates,
      options: { tolerance: 8, board },
    });
    // Shift locks to the dominant horizontal axis and snapping must not pull
    // the point onto the nearby node.
    expect(result.point).toEqual([303, 100]);
    expect(result.axisLocked).toBe(true);
    expect(result.guides).toEqual([]);
  });

  it("locks to 15 degree steps with alt", () => {
    const p = applyAngleLock([0, 0], [100, 12]);
    const angle = (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    expect(Math.abs(angle % 15)).toBeLessThan(1e-6);
    expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.hypot(100, 12), 6);
  });

  it("collects pen anchors and excludes hidden layers", () => {
    const doc = emptyVectorBoardDocument();
    const hidden = doc.layers[0]!;
    const doc2 = {
      ...doc,
      layers: [{ ...hidden, visible: false, strokes: [line("l1", [[1, 1], [2, 2]])] }],
    };
    expect(collectSnapCandidates(doc2)).toEqual([]);
  });
});
