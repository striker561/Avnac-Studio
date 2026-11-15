import { describe, expect, it } from "vitest";
import {
  chooseCachePixelRatio,
  createLayerCache,
  planLayerCaches,
} from "@/lib/avnac-vector/render-cache";
import { emptyVectorBoardDocument, insertStrokeIntoActiveLayer } from "@/lib/avnac-vector/document";
import type { VectorBoardLayer, VectorBoardStroke } from "@/lib/avnac-vector/types";

function line(id: string): VectorBoardStroke {
  return {
    id,
    kind: "line",
    points: [[0, 0], [10, 10]],
    stroke: "#000",
    strokeWidth: 1,
    strokeOpacity: 1,
    fill: "",
    fillOpacity: 1,
    fillRule: "nonzero",
    lineCap: "round",
    lineJoin: "round",
  };
}

function fakeContext() {
  const calls: string[] = [];
  const ctx = new Proxy(
    { calls },
    {
      get(_target, prop) {
        if (prop === "calls") return calls;
        if (prop === "canvas") return { width: 1, height: 1 };
        if (prop === "measureText") return () => ({ width: 0 });
        return () => {
          calls.push(String(prop));
        };
      },
      set() {
        return true;
      },
    },
  );
  return ctx as unknown as CanvasRenderingContext2D;
}

function fakeCanvas() {
  let width = 0;
  let height = 0;
  const ctx = fakeContext();
  return {
    get width() {
      return width;
    },
    set width(v: number) {
      width = v;
    },
    get height() {
      return height;
    },
    set height(v: number) {
      height = v;
    },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

describe("unit: vector / layer cache", () => {
  it("reuses unchanged layers and repaints only changed ones", () => {
    const doc = emptyVectorBoardDocument();
    const layer = doc.layers[0]!;
    const previous = new Map([
      [layer.id, { layerRef: layer, pixelRatio: 1 }],
    ]);
    const plan = planLayerCaches(previous, doc, 1);
    expect(plan.reuse).toEqual([layer.id]);
    expect(plan.repaint).toEqual([]);

    const changedLayer: VectorBoardLayer = { ...layer, strokes: [line("x")] };
    const changedDoc = { ...doc, layers: [changedLayer] };
    const changedPlan = planLayerCaches(previous, changedDoc, 1);
    expect(changedPlan.repaint).toEqual([layer.id]);
  });

  it("plans new and removed layers", () => {
    const doc = emptyVectorBoardDocument();
    const plan = planLayerCaches(new Map(), doc, 1);
    expect(plan.create).toEqual([doc.layers[0]!.id]);
    const previous = new Map([
      ["gone", { layerRef: doc.layers[0]!, pixelRatio: 1 }],
    ]);
    const removed = planLayerCaches(previous, doc, 1);
    expect(removed.remove).toEqual(["gone"]);
  });

  it("quantizes cache resolution and respects the pixel budget", () => {
    const ratio = chooseCachePixelRatio({
      boardWidth: 1200,
      boardHeight: 900,
      viewScale: 8,
      devicePixelRatio: 2,
      maxPixels: 2_000_000,
    });
    expect(ratio).toBeLessThanOrEqual(2);
    expect(ratio * 4).toBe(Math.round(ratio * 4));
    expect(1200 * ratio * 900 * ratio).toBeLessThanOrEqual(2_100_000);
  });

  it("paints a changed layer exactly once and reuses it afterwards", () => {
    const doc = emptyVectorBoardDocument();
    const cache = createLayerCache({ createCanvas: fakeCanvas });
    cache.sync(doc, 1);
    expect(cache.stats().repaints).toBe(1);
    cache.sync(doc, 1);
    expect(cache.stats().repaints).toBe(1);

    const changed = {
      ...doc,
      layers: [{ ...doc.layers[0]!, strokes: [line("a")] }],
    };
    cache.sync(changed, 1);
    expect(cache.stats().repaints).toBe(2);
    cache.sync(changed, 1);
    expect(cache.stats().repaints).toBe(2);
  });

  it("invalidates a single layer", () => {
    const doc = emptyVectorBoardDocument();
    const cache = createLayerCache({ createCanvas: fakeCanvas });
    cache.sync(doc, 1);
    const id = doc.layers[0]!.id;
    cache.invalidateLayer(id);
    cache.sync(doc, 1);
    expect(cache.stats().repaints).toBe(2);
  });

  it("keeps a stroke that uses insertStrokeIntoActiveLayer", () => {
    let doc = emptyVectorBoardDocument();
    doc = insertStrokeIntoActiveLayer(doc, line("a"));
    const cache = createLayerCache({ createCanvas: fakeCanvas });
    cache.sync(doc, 1);
    expect(cache.stats().repaints).toBe(1);
  });
});
