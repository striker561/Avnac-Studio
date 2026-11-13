import { describe, expect, it } from "vitest";
import { paintVectorStroke, paintVectorDocument } from "@/lib/avnac-vector/paint";
import type { VectorBoardStroke } from "@/lib/avnac-vector/types";

type Call = { name: string; args: unknown[] };

function recordingContext(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const state: Record<string, unknown> = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
  };
  const methods = [
    "save",
    "restore",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "bezierCurveTo",
    "rect",
    "arc",
    "ellipse",
    "fill",
    "stroke",
    "clip",
    "setLineDash",
    "translate",
    "scale",
    "clearRect",
    "fillRect",
    "strokeRect",
    "drawImage",
  ];
  const target: Record<string, unknown> = state;
  for (const name of methods) {
    target[name] = (...args: unknown[]) => {
      calls.push({ name, args });
    };
  }
  const ctx = new Proxy(target, {
    get(obj, prop) {
      if (prop === "canvas") return { width: 100, height: 100 };
      const value = obj[String(prop)];
      if (typeof value === "function") return value;
      return value;
    },
    set(obj, prop, value) {
      obj[String(prop)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function baseStroke(partial: Partial<VectorBoardStroke> & Pick<VectorBoardStroke, "kind" | "points">): VectorBoardStroke {
  return {
    id: "s",
    stroke: "#123456",
    strokeWidth: 6,
    strokeOpacity: 0.5,
    fill: "",
    fillOpacity: 1,
    fillRule: "evenodd",
    lineCap: "round",
    lineJoin: "miter",
    ...partial,
  };
}

describe("unit: vector / canvas paint", () => {
  it("uses document-unit stroke widths and the paint slots", () => {
    const { ctx, calls } = recordingContext();
    paintVectorStroke(
      ctx,
      baseStroke({
        kind: "rect",
        points: [[0, 0], [100, 80]],
        fill: "#ff0000",
      }),
    );
    const strokeCall = calls.find((c) => c.name === "stroke");
    const fillCall = calls.find((c) => c.name === "fill");
    expect(strokeCall).toBeDefined();
    expect(fillCall).toBeDefined();
    expect(fillCall!.args[0]).toBe("evenodd");
    expect(ctx.lineWidth).toBe(6);
    expect(ctx.lineJoin).toBe("miter");
    expect(ctx.lineCap).toBe("round");
  });

  it("skips a disabled stroke and fills a closed path independently", () => {
    const { ctx, calls } = recordingContext();
    paintVectorStroke(
      ctx,
      baseStroke({
        kind: "pen",
        points: [],
        penAnchors: [
          { x: 0, y: 0, type: "corner" },
          { x: 50, y: 0, type: "corner" },
          { x: 50, y: 50, type: "corner" },
        ],
        penClosed: true,
        stroke: "",
        strokeWidth: 0,
        fill: "#00ff00",
      }),
    );
    expect(calls.some((c) => c.name === "fill")).toBe(true);
    expect(calls.some((c) => c.name === "stroke")).toBe(false);
  });

  it("does not fill an open path", () => {
    const { ctx, calls } = recordingContext();
    paintVectorStroke(
      ctx,
      baseStroke({
        kind: "pen",
        points: [],
        penAnchors: [
          { x: 0, y: 0, type: "corner" },
          { x: 50, y: 50, type: "corner" },
        ],
        fill: "#00ff00",
      }),
    );
    expect(calls.some((c) => c.name === "fill")).toBe(false);
    expect(calls.some((c) => c.name === "stroke")).toBe(true);
  });

  it("paints every layer stroke", () => {
    const { calls } = renderingDocument();
    expect(calls.filter((c) => c.name === "stroke").length).toBe(3);
  });
});

function renderingDocument() {
  const { ctx, calls } = recordingContext();
  const stroke = (id: string): VectorBoardStroke =>
    baseStroke({ id, kind: "line", points: [[0, 0], [20, 20]] });
  paintVectorDocument(ctx, {
    v: 3,
    size: { width: 1200, height: 900 },
    activeLayerId: "a",
    layers: [
      { id: "a", name: "A", visible: true, strokes: [stroke("a1"), stroke("a2")] },
      { id: "b", name: "B", visible: true, strokes: [stroke("b1")] },
      { id: "c", name: "C", visible: false, strokes: [stroke("c1")] },
    ],
  });
  return { ctx, calls };
}
