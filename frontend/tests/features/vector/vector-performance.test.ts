import { describe, expect, it } from "vitest";
import {
  applyTranslateStrokesInDoc,
  emptyVectorBoardDocument,
  findTopStrokeAt,
  migrateVectorBoardDocument,
  paintVectorDocument,
  selectionBounds,
  strokeBounds,
  buildStrokePath,
  nearestPointOnPath,
  vectorBoardDocumentToSvg,
  type VectorBoardDocument,
  type VectorBoardStroke,
} from "@/lib/avnac-vector";
import { fitFreehandCubics } from "@/lib/avnac-vector/fit";
import { planLayerCaches } from "@/lib/avnac-vector/render-cache";

const HIT_BUDGET_MS = 8;
const BOUNDS_BUDGET_MS = 12;
const PAINT_BUDGET_MS = 25;
const SVG_BUDGET_MS = 30;
const FIT_BUDGET_MS = 25;
const MIGRATE_BUDGET_MS = 30;
const TRANSLATE_BUDGET_MS = 8;

function stroke(index: number): VectorBoardStroke {
  const x = (index % 20) * 55 + 20;
  const y = Math.floor(index / 20) * 55 + 20;
  return {
    id: `s${index}`,
    kind: "pen",
    points: [],
    penAnchors: [
      { x, y, outX: x + 12, outY: y + 8, type: "cusp" },
      { x: x + 30, y: y + 18, inX: x + 16, inY: y + 12, outX: x + 40, outY: y + 24, type: "smooth" },
      { x: x + 46, y: y + 4, inX: x + 38, inY: y + 10, type: "cusp" },
    ],
    stroke: "#111111",
    strokeWidth: 2,
    strokeOpacity: 1,
    fill: index % 3 === 0 ? "#aabbcc" : "",
    fillOpacity: 1,
    fillRule: "nonzero",
    lineCap: "round",
    lineJoin: "round",
  };
}

function buildDoc(count: number): VectorBoardDocument {
  let doc = emptyVectorBoardDocument();
  const layerId = doc.layers[0]!.id;
  const strokes = Array.from({ length: count }, (_, i) => stroke(i));
  doc = {
    ...doc,
    layers: doc.layers.map((l) => (l.id === layerId ? { ...l, strokes } : l)),
  };
  return doc;
}

function measure(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function fakeContext(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
  };
  for (const name of [
    "save",
    "restore",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "bezierCurveTo",
    "fill",
    "stroke",
    "rect",
    "arc",
    "ellipse",
    "setLineDash",
  ]) {
    target[name] = () => {};
  }
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === "canvas") return { width: 1, height: 1 };
      return obj[String(prop)];
    },
    set(obj, prop, value) {
      obj[String(prop)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function handStroke(): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 600; i += 1) {
    const t = i / 599;
    points.push([
      80 + t * 1000,
      450 + Math.sin(t * Math.PI * 7) * 130 + Math.sin(t * Math.PI * 31) * 4,
    ]);
  }
  return points;
}

describe("feature: vector / performance budgets", () => {
  it("hit-tests 300 strokes within a pointer-frame budget", () => {
    const doc = buildDoc(300);
    findTopStrokeAt(doc, [10, 10], 4);
    const ms = measure(() => {
      findTopStrokeAt(doc, [310, 140], 4);
      findTopStrokeAt(doc, [910, 600], 4);
    });
    expect(ms).toBeLessThan(HIT_BUDGET_MS);
  });

  it("computes selection bounds for 300 strokes", () => {
    const doc = buildDoc(300);
    const selections = doc.layers[0]!.strokes.map((s) => ({
      layerId: doc.layers[0]!.id,
      strokeId: s.id,
    }));
    selectionBounds(doc, selections);
    const ms = measure(() => {
      const bounds = selectionBounds(doc, selections);
      expect(bounds).not.toBeNull();
    });
    expect(ms).toBeLessThan(BOUNDS_BUDGET_MS);
  });

  it("paints 300 strokes within a frame budget", () => {
    const doc = buildDoc(300);
    const ctx = fakeContext();
    paintVectorDocument(ctx, doc);
    const ms = measure(() => paintVectorDocument(ctx, doc));
    expect(ms).toBeLessThan(PAINT_BUDGET_MS);
  });

  it("serializes 300 strokes to SVG within budget", () => {
    const doc = buildDoc(300);
    vectorBoardDocumentToSvg(doc);
    const ms = measure(() => {
      const svg = vectorBoardDocumentToSvg(doc);
      expect(svg.length).toBeGreaterThan(1000);
    });
    expect(ms).toBeLessThan(SVG_BUDGET_MS);
  });

  it("fits a 600-sample hand stroke within budget", () => {
    const points = handStroke();
    fitFreehandCubics(points, { tolerance: 2.5 });
    const ms = measure(() => {
      const result = fitFreehandCubics(points, { tolerance: 2.5 });
      expect(result.anchors.length).toBeGreaterThan(2);
      expect(result.anchors.length).toBeLessThan(40);
    });
    expect(ms).toBeLessThan(FIT_BUDGET_MS);
  });

  it("migrates a 300-stroke v2 board within budget", () => {
    const legacy = {
      v: 2,
      layers: [
        {
          id: "l1",
          name: "Layer 1",
          visible: true,
          strokes: Array.from({ length: 300 }, (_, i) => ({
            id: `s${i}`,
            kind: "pen",
            points: [],
            penAnchors: [
              { x: 0.1, y: 0.1, outX: 0.2, outY: 0.1 },
              { x: 0.3, y: 0.3, inX: 0.2, inY: 0.2 },
            ],
            stroke: "#000000",
            strokeWidthN: 0.002,
            fill: "",
          })),
        },
      ],
      activeLayerId: "l1",
    };
    migrateVectorBoardDocument(legacy);
    const ms = measure(() => {
      const doc = migrateVectorBoardDocument(legacy);
      expect(doc.layers[0]!.strokes).toHaveLength(300);
    });
    expect(ms).toBeLessThan(MIGRATE_BUDGET_MS);
  });

  it("translates a 300-stroke selection within budget", () => {
    const doc = buildDoc(300);
    const selections = doc.layers[0]!.strokes.map((s) => ({
      layerId: doc.layers[0]!.id,
      strokeId: s.id,
    }));
    const ms = measure(() => {
      const next = applyTranslateStrokesInDoc(doc, selections, 10, 10);
      expect(next).not.toBe(doc);
    });
    expect(ms).toBeLessThan(TRANSLATE_BUDGET_MS);
  });

  it("plans layer caches without touching stroke geometry", () => {
    const doc = buildDoc(300);
    const previous = new Map(
      doc.layers.map((layer) => [layer.id, { layerRef: layer, pixelRatio: 1 }]),
    );
    const ms = measure(() => {
      const plan = planLayerCaches(previous, doc, 1);
      expect(plan.reuse).toHaveLength(doc.layers.length);
    });
    expect(ms).toBeLessThan(2);
  });

  it("reuses selection bounds for a huge pen path", () => {
    const anchors = Array.from({ length: 2500 }, (_, i) => {
      const t = i / 2499;
      const x = 30 + t * 1140;
      const y = 450 + Math.sin(t * Math.PI * 18) * 300;
      return { x, y, inX: x - 2, inY: y - 1, outX: x + 2, outY: y + 1, type: "smooth" as const };
    });
    const huge: VectorBoardStroke = {
      ...stroke(0),
      id: "huge",
      penAnchors: anchors,
    };
    const bigDoc: VectorBoardDocument = {
      ...emptyVectorBoardDocument(),
      layers: [
        {
          id: "huge-layer",
          name: "Layer",
          visible: true,
          strokes: [huge],
        },
      ],
      activeLayerId: "huge-layer",
    };
    const selections = [{ layerId: "huge-layer", strokeId: "huge" }];
    const first = selectionBounds(bigDoc, selections);
    expect(first).not.toBeNull();
    // Same document + same selection array must hit the identity cache.
    const ms = measure(() => {
      for (let i = 0; i < 200; i += 1) {
        expect(selectionBounds(bigDoc, selections)).toBe(first);
      }
    });
    // 200 cache hits; generous enough for a loaded CI worker.
    expect(ms).toBeLessThan(20);
  });

  it("prefilters nearest-point queries on a huge pen path", () => {
    const anchors = Array.from({ length: 2500 }, (_, i) => {
      const t = i / 2499;
      const x = 30 + t * 1140;
      const y = 450 + Math.sin(t * Math.PI * 18) * 300;
      return { x, y, inX: x - 2, inY: y - 1, outX: x + 2, outY: y + 1, type: "smooth" as const };
    });
    const huge: VectorBoardStroke = {
      ...stroke(0),
      id: "huge",
      penAnchors: anchors,
    };
    const path = buildStrokePath(huge);
    expect(path.subpaths[0]!.segments).toHaveLength(2499);
    expect(strokeBounds(huge)).not.toBeNull();
    nearestPointOnPath(path, [600, 450]);
    const ms = measure(() => {
      for (let i = 0; i < 100; i += 1) {
        const hit = nearestPointOnPath(path, [600, 450]);
        expect(hit).not.toBeNull();
      }
    });
    // 100 queries over 2 499 segments, including bounding-box prefiltering.
    expect(ms).toBeLessThan(250);
  });

  it("keeps the document immutable across a drag-local copy", () => {
    const doc = buildDoc(30);
    const before = JSON.stringify(doc.layers[0]!.strokes[0]!.penAnchors);
    const selections = [{ layerId: doc.layers[0]!.id, strokeId: "s0" }];
    applyTranslateStrokesInDoc(doc, selections, 20, 20);
    expect(JSON.stringify(doc.layers[0]!.strokes[0]!.penAnchors)).toBe(before);
  });
});
