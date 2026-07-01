import { describe, expect, it } from "vitest";
import type { AvnacDocumentV1 } from "@/lib/avnac-document";
import { fromAvnacDocument } from "@/lib/saraswati/compat/from-avnac";

function baseDoc(objects: unknown[]): AvnacDocumentV1 {
  return {
    v: 1,
    artboard: { width: 1200, height: 900 },
    bg: { type: "solid", color: "#ffffff" },
    fabric: { objects },
  };
}

describe("fromAvnacDocument", () => {
  it("converts arrow metadata into a Saraswati line node", () => {
    const doc = baseDoc([
      {
        type: "group",
        visible: true,
        opacity: 1,
        avnacLayerId: "line-1",
        avnacShape: {
          kind: "arrow",
          arrowEndpoints: { x1: 10, y1: 20, x2: 210, y2: 40 },
          arrowStrokeWidth: 4,
          arrowLineStyle: "dashed",
          arrowPathType: "curved",
          arrowCurveBulge: 18,
          arrowCurveT: 0.4,
        },
        avnacStroke: { type: "solid", color: "#111111" },
      },
    ]);

    const result = fromAvnacDocument(doc);
    expect(result.fullySupported).toBe(true);
    expect(result.issues).toEqual([]);

    const node = result.scene.nodes["line-1"];
    expect(node?.type).toBe("line");
    if (!node || node.type !== "line") {
      throw new Error("Expected a line node");
    }

    expect(node.x1).toBe(10);
    expect(node.y1).toBe(20);
    expect(node.x2).toBe(210);
    expect(node.y2).toBe(40);
    expect(node.arrowEnd).toBe(true);
    expect(node.strokeWidth).toBe(4);
    expect(node.lineStyle).toBe("dashed");
    expect(node.pathType).toBe("curved");
    expect(node.curveBulge).toBe(18);
    expect(node.curveT).toBe(0.4);
  });

  it("converts plain Fabric line objects when shape metadata is missing", () => {
    const doc = baseDoc([
      {
        type: "line",
        avnacLayerId: "line-raw",
        x1: 5,
        y1: 15,
        x2: 205,
        y2: 215,
        stroke: "#ff0000",
        opacity: 0.8,
      },
    ]);

    const result = fromAvnacDocument(doc);
    expect(result.fullySupported).toBe(true);
    expect(result.issues).toEqual([]);

    const node = result.scene.nodes["line-raw"];
    expect(node?.type).toBe("line");
    if (!node || node.type !== "line") {
      throw new Error("Expected a line node");
    }

    expect(node.x1).toBe(5);
    expect(node.y1).toBe(15);
    expect(node.x2).toBe(205);
    expect(node.y2).toBe(215);
    expect(node.arrowEnd).toBe(false);
    expect(node.lineStyle).toBe("solid");
    expect(node.pathType).toBe("straight");
  });

  it("converts image src and crop values", () => {
    const doc = baseDoc([
      {
        type: "image",
        avnacLayerId: "img-1",
        left: 64,
        top: 80,
        width: 320,
        height: 240,
        src: "https://cdn.example.com/demo.png",
        cropX: 12,
        cropY: 8,
      },
    ]);

    const result = fromAvnacDocument(doc);
    expect(result.fullySupported).toBe(true);
    expect(result.issues).toEqual([]);

    const node = result.scene.nodes["img-1"];
    expect(node?.type).toBe("image");
    if (!node || node.type !== "image") {
      throw new Error("Expected an image node");
    }

    expect(node.src).toBe("https://cdn.example.com/demo.png");
    expect(node.width).toBe(320);
    expect(node.height).toBe(240);
    expect(node.cropX).toBe(12);
    expect(node.cropY).toBe(8);
    expect(node.x).toBe(64);
    expect(node.y).toBe(80);
  });

  it("reports malformed images instead of silently dropping everything", () => {
    const doc = baseDoc([
      {
        type: "image",
        avnacLayerId: "img-bad",
        width: 320,
        height: 240,
        // missing src
      },
    ]);

    const result = fromAvnacDocument(doc);
    expect(result.fullySupported).toBe(false);
    expect(result.issues).toEqual([
      {
        reason: "missing-image-data",
        sourceType: "image",
        sourceId: "img-bad",
      },
    ]);
  });
});
