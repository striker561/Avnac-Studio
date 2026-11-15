import { describe, expect, it } from "vitest";
import {
  applyScaleStrokesInDoc,
  applyTranslateStrokesInDoc,
  applyZOrderInDoc,
  countDocumentAnchors,
  countDocumentStrokes,
  duplicateSelectionsInPlace,
  emptyVectorBoardDocument,
  findTopStrokeAt,
  getActiveLayer,
  insertStrokeIntoActiveLayer,
  migrateVectorBoardDocument,
  parseVectorStrokeClipboardText,
  removeStrokesFromDoc,
  scaleVectorStroke,
  selectionBounds,
  serializeVectorStrokesForClipboard,
  translateVectorStroke,
  updateSelectionPaint,
} from "@/lib/avnac-vector/document";
import type { VectorBoardStroke, VectorSelection } from "@/lib/avnac-vector/types";

function pen(): VectorBoardStroke {
  return {
    id: "pen-1",
    kind: "pen",
    points: [],
    penAnchors: [
      { x: 100, y: 100, outX: 200, outY: 100, type: "cusp" },
      { x: 300, y: 100, inX: 200, inY: 100, outX: 300, outY: 200, type: "smooth" },
      { x: 300, y: 300, type: "corner" },
    ],
    stroke: "#111111",
    strokeWidth: 4,
    strokeOpacity: 1,
    fill: "",
    fillOpacity: 1,
    fillRule: "nonzero",
    lineCap: "round",
    lineJoin: "round",
  };
}

function docWith(strokes: VectorBoardStroke[]) {
  let doc = emptyVectorBoardDocument();
  for (const stroke of strokes) doc = insertStrokeIntoActiveLayer(doc, stroke);
  return doc;
}

describe("unit: vector / v3 document", () => {
  it("migrates v2 normalized geometry into document units exactly", () => {
    const legacy = {
      v: 2,
      layers: [
        {
          id: "layer-1",
          name: "Layer 1",
          visible: true,
          strokes: [
            {
              id: "s1",
              kind: "pen",
              points: [],
              penAnchors: [
                { x: 0.25, y: 0.5, outX: 0.3, outY: 0.5 },
                { x: 0.75, y: 0.5, inX: 0.7, inY: 0.5 },
              ],
              penClosed: true,
              stroke: "#123456",
              strokeWidthN: 0.01,
              fill: "#abcdef",
            },
          ],
        },
      ],
      activeLayerId: "layer-1",
    };
    const doc = migrateVectorBoardDocument(legacy);
    expect(doc.v).toBe(3);
    expect(doc.size).toEqual({ width: 1200, height: 900 });
    const stroke = doc.layers[0]!.strokes[0]!;
    expect(stroke.penAnchors![0]!.x).toBeCloseTo(300, 9);
    expect(stroke.penAnchors![0]!.y).toBeCloseTo(450, 9);
    expect(stroke.penAnchors![0]!.outX).toBeCloseTo(360, 9);
    expect(stroke.penAnchors![1]!.inX).toBeCloseTo(840, 9);
    expect(stroke.strokeWidth).toBeCloseTo(0.01 * 900, 9);
    expect(stroke.penClosed).toBe(true);
    expect(stroke.fillRule).toBe("nonzero");
    expect(stroke.penAnchors![1]!.type).toBe("cusp");
  });

  it("migrates v1 strokes into one layer", () => {
    const doc = migrateVectorBoardDocument({
      v: 1,
      strokes: [
        {
          points: [[0.1, 0.2], [0.3, 0.4]],
          stroke: "#000",
          strokeWidthN: 0,
        },
      ],
    });
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]!.strokes[0]!.points[0]).toEqual([120, 180]);
  });

  it("round-trips v3 without changing geometry", () => {
    const original = docWith([pen()]);
    const raw = JSON.parse(JSON.stringify(original));
    const migrated = migrateVectorBoardDocument(raw);
    expect(migrated.layers[0]!.strokes[0]!.penAnchors).toEqual(pen().penAnchors);
    expect(migrated.layers[0]!.strokes[0]!.strokeWidth).toBe(4);
  });

  it("counts strokes and anchors", () => {
    const doc = docWith([pen(), { ...pen(), id: "pen-2", penAnchors: pen().penAnchors!.slice(0, 2) }]);
    expect(countDocumentStrokes(doc)).toBe(2);
    expect(countDocumentAnchors(doc)).toBe(5);
  });

  it("translates anchors and handles together", () => {
    const moved = translateVectorStroke(pen(), 10, -5);
    expect(moved.penAnchors![0]!.x).toBe(110);
    expect(moved.penAnchors![0]!.outY).toBe(95);
    expect(moved.penAnchors![1]!.inX).toBe(210);
  });

  it("scales stroke width with the selection when requested", () => {
    const scaled = scaleVectorStroke(pen(), 0, 0, 2, 2, true);
    expect(scaled.strokeWidth).toBe(8);
    const fixed = scaleVectorStroke(pen(), 0, 0, 2, 2, false);
    expect(fixed.strokeWidth).toBe(4);
  });

  it("applies translate/scale to selected strokes only", () => {
    const doc = docWith([pen(), { ...pen(), id: "pen-2" }]);
    const selections: VectorSelection[] = [{ layerId: doc.layers[0]!.id, strokeId: "pen-1" }];
    const moved = applyTranslateStrokesInDoc(doc, selections, 5, 5);
    expect(moved.layers[0]!.strokes[0]!.penAnchors![0]!.x).toBe(105);
    expect(moved.layers[0]!.strokes[1]!.penAnchors![0]!.x).toBe(100);
    const scaled = applyScaleStrokesInDoc(moved, selections, 0, 0, 2, 2, false);
    expect(scaled.layers[0]!.strokes[0]!.penAnchors![0]!.x).toBe(210);
    expect(scaled.layers[0]!.strokes[0]!.strokeWidth).toBe(4);
  });

  it("hit tests in document units and respects stroke width", () => {
    const doc = docWith([pen()]);
    const hit = findTopStrokeAt(doc, [200, 103], 2);
    expect(hit?.stroke.id).toBe("pen-1");
    expect(findTopStrokeAt(doc, [200, 200], 2)).toBeNull();
  });

  it("removes, duplicates and reorders selections", () => {
    const doc = docWith([pen(), { ...pen(), id: "pen-2" }]);
    const layerId = doc.layers[0]!.id;
    const sel: VectorSelection[] = [{ layerId, strokeId: "pen-1" }];
    expect(removeStrokesFromDoc(doc, sel).layers[0]!.strokes).toHaveLength(1);
    const dup = duplicateSelectionsInPlace(doc, sel)!;
    expect(dup.doc.layers[0]!.strokes).toHaveLength(3);
    expect(dup.newSelections).toHaveLength(1);
    const front = applyZOrderInDoc(dup.doc, sel, "front");
    expect(front.layers[0]!.strokes.at(-1)!.id).toBe("pen-1");
  });

  it("updates paint slots independently", () => {
    const doc = docWith([pen()]);
    const sel: VectorSelection[] = [{ layerId: doc.layers[0]!.id, strokeId: "pen-1" }];
    const next = updateSelectionPaint(doc, sel, {
      fill: "#ff0000",
      fillRule: "evenodd",
      lineJoin: "miter",
      strokeOpacity: 0.5,
    });
    const stroke = next.layers[0]!.strokes[0]!;
    expect(stroke.fill).toBe("#ff0000");
    expect(stroke.fillRule).toBe("evenodd");
    expect(stroke.lineJoin).toBe("miter");
    expect(stroke.strokeOpacity).toBe(0.5);
    expect(stroke.stroke).toBe("#111111");
  });

  it("round-trips the clipboard payload", () => {
    const strokes = [pen()];
    const text = serializeVectorStrokesForClipboard(strokes);
    const parsed = parseVectorStrokeClipboardText(text)!;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.penAnchors![1]!.type).toBe("smooth");
    expect(parseVectorStrokeClipboardText("not json")).toBeNull();
  });

  it("computes selection bounds across layers", () => {
    const doc = docWith([pen()]);
    const bounds = selectionBounds(doc, [{ layerId: doc.layers[0]!.id, strokeId: "pen-1" }]);
    expect(bounds).not.toBeNull();
    expect(bounds!.minX).toBeGreaterThanOrEqual(100);
    expect(bounds!.maxX).toBeLessThanOrEqual(300);
  });

  it("keeps the active layer valid", () => {
    const doc = docWith([pen()]);
    expect(getActiveLayer(doc)!.id).toBe(doc.activeLayerId);
  });
});
