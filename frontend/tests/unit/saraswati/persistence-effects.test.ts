import { describe, expect, it } from "vitest";

import { AVNAC_DOC_VERSION, type AvnacDocumentV1 } from "@/lib/avnac-document";
import { fromAvnacDocument } from "@/lib/saraswati/compat/from-avnac";
import { fromAvnacV2Document } from "@/lib/saraswati/compat/from-avnac-v2";
import { toAvnacDocument } from "@/lib/saraswati/compat/to-avnac";

const shadow = {
  blur: 18,
  offsetX: 4,
  offsetY: 6,
  colorHex: "#1f2937",
  opacityPct: 45,
};

function makeDocument(objects: Record<string, unknown>[]): AvnacDocumentV1 {
  return {
    v: AVNAC_DOC_VERSION,
    artboard: { width: 800, height: 600 },
    bg: { type: "solid", color: "#ffffff" },
    fabric: { objects },
  };
}

describe("effect persistence (v1 documents)", () => {
  it("round-trips text shadow, blur, layer name and clip stack", () => {
    const doc = makeDocument([
      {
        type: "textbox",
        avnacLayerId: "text-1",
        avnacLayerName: "Headline",
        left: 60,
        top: 80,
        width: 420,
        text: "Shadow survives",
        fill: "#111827",
        fontSize: 48,
        avnacBlur: 12,
        avnacShadow: shadow,
        avnacClipPathStack: [
          { type: "rect", left: 10, top: 10, width: 100, height: 60 },
        ],
      },
    ]);

    const first = fromAvnacDocument(doc);
    expect(first.issues).toHaveLength(0);
    const text = first.scene.nodes["text-1"];
    if (!text || text.type !== "text") throw new Error("Expected text node");
    expect(text.name).toBe("Headline");
    expect(text.blur).toBe(12);
    expect(text.shadow).toEqual(shadow);
    expect(text.clipPathStack).toHaveLength(1);

    const second = fromAvnacDocument(toAvnacDocument(first.scene));
    expect(second.scene).toEqual(first.scene);
  });

  it("round-trips image corner radius", () => {
    const doc = makeDocument([
      {
        type: "image",
        avnacLayerId: "img-1",
        left: 40,
        top: 30,
        width: 300,
        height: 220,
        src: "https://example.com/photo.jpg",
        avnacBorderRadius: 28,
      },
    ]);

    const first = fromAvnacDocument(doc);
    const image = first.scene.nodes["img-1"];
    if (!image || image.type !== "image") throw new Error("Expected image node");
    expect(image.borderRadius).toBe(28);

    const second = fromAvnacDocument(toAvnacDocument(first.scene));
    expect(second.scene).toEqual(first.scene);
  });

  it("persists group name, shadow and blur", () => {
    const doc = makeDocument([
      {
        type: "group",
        avnacLayerId: "group-1",
        avnacLayerName: "Badge",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        avnacBlur: 6,
        avnacShadow: shadow,
        objects: [
          {
            type: "rect",
            avnacLayerId: "rect-1",
            left: 20,
            top: 30,
            width: 120,
            height: 60,
            fill: "#f97316",
          },
        ],
      },
    ]);

    const first = fromAvnacDocument(doc);
    const group = first.scene.nodes["group-1"];
    if (!group || group.type !== "group") throw new Error("Expected group node");
    expect(group.name).toBe("Badge");
    expect(group.blur).toBe(6);
    expect(group.shadow).toEqual(shadow);

    const second = fromAvnacDocument(toAvnacDocument(first.scene));
    const reloaded = second.scene.nodes["group-1"];
    if (!reloaded || reloaded.type !== "group") {
      throw new Error("Expected group node after reload");
    }
    expect(reloaded.name).toBe("Badge");
    expect(reloaded.blur).toBe(6);
    expect(reloaded.shadow).toEqual(shadow);
  });

  it("persists an arrow head at the start of a line", () => {
    const doc = makeDocument([
      {
        type: "group",
        avnacLayerId: "line-1",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        objects: [],
        avnacShape: {
          kind: "arrow",
          arrowEndpoints: { x1: 50, y1: 50, x2: 250, y2: 150 },
          arrowStrokeWidth: 4,
          arrowHead: 1,
          arrowStart: true,
          arrowLineStyle: "dashed",
          arrowPathType: "straight",
          arrowCurveBulge: 0,
          arrowCurveT: 0.5,
        },
      },
    ]);

    const first = fromAvnacDocument(doc);
    const line = first.scene.nodes["line-1"];
    if (!line || line.type !== "line") throw new Error("Expected line node");
    expect(line.arrowStart).toBe(true);
    expect(line.arrowEnd).toBe(true);

    const serialized = toAvnacDocument(first.scene);
    const objects = serialized.fabric.objects as Record<string, unknown>[];
    const shape = objects[0].avnacShape as Record<string, unknown>;
    expect(shape.arrowStart).toBe(true);

    const second = fromAvnacDocument(serialized);
    const reloaded = second.scene.nodes["line-1"];
    if (!reloaded || reloaded.type !== "line") {
      throw new Error("Expected line node after reload");
    }
    expect(reloaded.arrowStart).toBe(true);
  });

  it("normalizes a zero-effect shadow back to null", () => {    const doc = makeDocument([
      {
        type: "rect",
        avnacLayerId: "rect-1",
        left: 0,
        top: 0,
        width: 80,
        height: 80,
        avnacShadow: {
          blur: 0,
          offsetX: 0,
          offsetY: 0,
          colorHex: "#000000",
          opacityPct: 100,
        },
      },
    ]);

    const first = fromAvnacDocument(doc);
    const rect = first.scene.nodes["rect-1"];
    if (!rect) throw new Error("Expected rect node");
    expect(rect.shadow).toBeNull();
  });
});

describe("effect persistence (v2 documents)", () => {
  it("imports shadow, blur, name and image corner radius", () => {
    const scene = fromAvnacV2Document({
      v: 2,
      artboard: { width: 900, height: 700 },
      bg: { type: "solid", color: "#ffffff" },
      objects: [
        {
          id: "text-1",
          type: "text",
          name: "Caption",
          x: 20,
          y: 40,
          width: 300,
          height: 60,
          rotation: 0,
          opacity: 1,
          visible: true,
          blurPct: 9,
          shadow,
          text: "Persisted",
        },
        {
          id: "img-1",
          type: "image",
          x: 400,
          y: 40,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          visible: true,
          src: "https://example.com/photo.jpg",
          cornerRadius: 24,
        },
      ],
    });

    expect(scene).not.toBeNull();
    const text = scene!.nodes["text-1"];
    if (!text || text.type !== "text") throw new Error("Expected text node");
    expect(text.name).toBe("Caption");
    expect(text.blur).toBe(9);
    expect(text.shadow).toEqual(shadow);

    const image = scene!.nodes["img-1"];
    if (!image || image.type !== "image") throw new Error("Expected image node");
    expect(image.borderRadius).toBe(24);
  });
});
