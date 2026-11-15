import { describe, expect, it } from "vitest";
import { createVectorBoardHistory } from "@/lib/avnac-vector/history";
import {
  emptyVectorBoardDocument,
  insertStrokeIntoActiveLayer,
} from "@/lib/avnac-vector/document";
import type { VectorBoardDocument, VectorBoardStroke } from "@/lib/avnac-vector/types";

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

function next(doc: VectorBoardDocument, id: string): VectorBoardDocument {
  return insertStrokeIntoActiveLayer(doc, line(id));
}

describe("unit: vector / undo history", () => {
  it("walks undo and redo through snapshots", () => {
    const empty = emptyVectorBoardDocument();
    const a = next(empty, "a");
    const b = next(a, "b");
    const history = createVectorBoardHistory(empty);
    history.commit(a);
    history.commit(b);
    expect(history.canUndo()).toBe(true);
    expect(history.undo()).toBe(a);
    expect(history.undo()).toBe(empty);
    expect(history.undo()).toBeNull();
    expect(history.canRedo()).toBe(true);
    expect(history.redo()).toBe(a);
    expect(history.redo()).toBe(b);
    expect(history.redo()).toBeNull();
  });

  it("does not duplicate a commit of the current document", () => {
    const doc = emptyVectorBoardDocument();
    const history = createVectorBoardHistory(doc);
    history.commit(doc);
    expect(history.stats().entries).toBe(1);
  });

  it("caps entries by count", () => {
    let doc = emptyVectorBoardDocument();
    const history = createVectorBoardHistory(doc, { maxEntries: 4 });
    for (let i = 0; i < 20; i += 1) {
      doc = next(doc, `s${i}`);
      history.commit(doc);
    }
    const stats = history.stats();
    expect(stats.entries).toBeLessThanOrEqual(4);
    expect(history.current()).toBe(doc);
  });

  it("caps entries by approximate bytes", () => {
    const make = (id: string) => insertStrokeIntoActiveLayer(emptyVectorBoardDocument(), line(id));
    let doc = make("stroke-0");
    const history = createVectorBoardHistory(doc, {
      maxEntries: 100,
      maxBytes: 3000,
    });
    for (let i = 1; i < 40; i += 1) {
      doc = make(`stroke-with-a-long-id-${i}`);
      history.commit(doc);
    }
    const stats = history.stats();
    expect(stats.entries).toBeLessThan(40);
    expect(stats.entries).toBeGreaterThan(1);
    expect(stats.bytes).toBeLessThanOrEqual(3000);
    expect(history.current()).toBe(doc);
  });

  it("resets to a single entry", () => {
    const a = emptyVectorBoardDocument();
    const history = createVectorBoardHistory(a);
    history.commit(next(a, "x"));
    history.reset(a);
    expect(history.stats().entries).toBe(1);
    expect(history.canUndo()).toBe(false);
  });
});
