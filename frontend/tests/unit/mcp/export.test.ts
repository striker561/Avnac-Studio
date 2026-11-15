import { describe, expect, it } from "vitest";

import {
  MAX_EXPORT_EDGE_PX,
  computeObjectCrop,
  planExport,
  resolveExportMultiplier,
} from "@/lib/mcp/export";
import { createEmptySaraswatiScene } from "@/lib/saraswati";

function makeScene(width = 1200, height = 800) {
  const scene = createEmptySaraswatiScene({
    width,
    height,
    bg: { type: "solid", color: "#ffffff" },
  });
  const root = scene.nodes[scene.root];
  if (!root || root.type !== "group") throw new Error("missing root");
  return { scene, root };
}

describe("resolveExportMultiplier", () => {
  const artboard = { width: 1200, height: 800 };

  it("defaults to 1x", () => {
    expect(resolveExportMultiplier(undefined, artboard)).toBe(1);
    expect(resolveExportMultiplier(null, artboard)).toBe(1);
    expect(resolveExportMultiplier("nonsense", artboard)).toBe(1);
    expect(resolveExportMultiplier(0, artboard)).toBe(1);
  });

  it("honours numeric and string multipliers", () => {
    expect(resolveExportMultiplier(2, artboard)).toBe(2);
    expect(resolveExportMultiplier("2", artboard)).toBe(2);
    expect(resolveExportMultiplier(0.5, artboard)).toBe(0.5);
  });

  it("clamps the range and the maximum output edge", () => {
    // 8x of 800px fits under the 8192px edge cap.
    expect(resolveExportMultiplier(100, { width: 800, height: 600 })).toBe(8);
    expect(resolveExportMultiplier(0.01, artboard)).toBe(0.25);
    // 8x of 1200px would be 9600px, so the multiplier is reduced to fit 8192.
    expect(resolveExportMultiplier(8, artboard)).toBeCloseTo(
      MAX_EXPORT_EDGE_PX / 1200,
      5,
    );
    const huge = resolveExportMultiplier(8, { width: 4000, height: 3000 });
    expect(huge).toBeCloseTo(MAX_EXPORT_EDGE_PX / 4000, 5);
  });
});

describe("computeObjectCrop", () => {
  it("crops a rect to its bounds plus padding", () => {
    const { scene, root } = makeScene();
    scene.nodes["rect-1"] = {
      id: "rect-1",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
      clipPath: null,
    };
    root.children.push("rect-1");

    expect(computeObjectCrop(scene, "rect-1")).toEqual({
      x: 92,
      y: 192,
      width: 316,
      height: 166,
    });
  });

  it("clamps the crop to the artboard", () => {
    const { scene, root } = makeScene();
    scene.nodes["edge"] = {
      id: "edge",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
      clipPath: null,
    };
    root.children.push("edge");

    expect(computeObjectCrop(scene, "edge")).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    });
  });

  it("unions a group's children", () => {
    const { scene, root } = makeScene();
    const base = {
      parentId: scene.root,
      visible: true,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left" as const,
      originY: "top" as const,
      fill: { type: "solid" as const, color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
      clipPath: null,
    };
    scene.nodes["a"] = {
      ...base,
      id: "a",
      type: "rect",
      x: 50,
      y: 40,
      width: 100,
      height: 60,
    };
    scene.nodes["b"] = {
      ...base,
      id: "b",
      type: "rect",
      x: 260,
      y: 220,
      width: 80,
      height: 40,
    };
    scene.nodes["g"] = {
      id: "g",
      type: "group",
      parentId: scene.root,
      visible: true,
      opacity: 1,
      children: ["a", "b"],
    };
    root.children.push("g");

    expect(computeObjectCrop(scene, "g", 0)).toEqual({
      x: 50,
      y: 40,
      width: 290,
      height: 220,
    });
  });

  it("returns null for an unknown object", () => {
    const { scene } = makeScene();
    expect(computeObjectCrop(scene, "missing")).toBeNull();
  });
});

describe("planExport", () => {
  it("plans a full-artboard export with the background painted", () => {
    const { scene } = makeScene();
    const plan = planExport(scene, { multiplier: 2 });
    expect(plan.multiplier).toBe(2);
    expect(plan.prePaintBackground).toBe(true);
    expect(plan.crop).toBeNull();
  });

  it("honours transparent full exports", () => {
    const { scene } = makeScene();
    expect(planExport(scene, { transparent: true }).prePaintBackground).toBe(false);
  });

  it("plans an object cutout with no artboard background", () => {
    const { scene, root } = makeScene();
    scene.nodes["rect-1"] = {
      id: "rect-1",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 200,
      y: 120,
      width: 160,
      height: 90,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
      clipPath: null,
    };
    root.children.push("rect-1");

    const plan = planExport(scene, { objectId: "rect-1", multiplier: 2 });
    expect(plan.multiplier).toBe(2);
    expect(plan.prePaintBackground).toBe(false);
    expect(plan.crop).toEqual({ x: 192, y: 112, width: 176, height: 106 });
  });
});
