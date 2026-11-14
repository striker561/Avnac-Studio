import { describe, expect, it } from "vitest";
import {
  createEmptySaraswatiScene,
  type SaraswatiRectNode,
  type SaraswatiScene,
  type SaraswatiTextNode,
} from "@/lib/saraswati";
import { contrastRatio, validateScene } from "@/lib/mcp/validate";

function rect(
  id: string,
  patch: Partial<SaraswatiRectNode> = {},
  name = "",
): SaraswatiRectNode {
  return {
    id,
    type: "rect",
    parentId: "root",
    name,
    visible: true,
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 120,
    height: 80,
    radiusX: 0,
    radiusY: 0,
    fill: { type: "solid", color: "#A9B79D" },
    stroke: null,
    strokeWidth: 0,
    clipPath: null,
    clipPathStack: [],
    ...patch,
  };
}

function text(
  id: string,
  patch: Partial<SaraswatiTextNode> = {},
): SaraswatiTextNode {
  return {
    id,
    type: "text",
    parentId: "root",
    name: "Text",
    visible: true,
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: "Hello",
    width: 200,
    fontSize: 22,
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight: 1.2,
    underline: false,
    color: { type: "solid", color: "#173B2C" },
    stroke: null,
    strokeWidth: 0,
    ...patch,
  };
}

function sceneWith(...nodes: Array<SaraswatiRectNode | SaraswatiTextNode>): SaraswatiScene {
  const scene = createEmptySaraswatiScene({
    width: 800,
    height: 600,
    bg: { type: "solid", color: "#F4ECDD" },
  });
  for (const node of nodes) scene.nodes[node.id] = node;
  const root = scene.nodes[scene.root];
  if (!root || root.type !== "group") throw new Error("missing root");
  root.children.push(...nodes.map((node) => node.id));
  return scene;
}

describe("contrastRatio", () => {
  it("measures black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});

describe("validateScene", () => {
  it("flags out-of-bounds, thin strokes, tiny type and unloaded fonts", () => {
    const scene = sceneWith(
      rect("edge", {
        x: -20,
        y: 10,
        width: 100,
        height: 40,
        stroke: { type: "solid", color: "#173B2C" },
        strokeWidth: 0.2,
      }),
      text("tiny", {
        x: 100,
        y: 200,
        fontSize: 6,
        fontFamily: "Archivo",
      }),
    );
    const report = validateScene(scene, {
      loadedFonts: { Archivo: false },
    });
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "out_of_bounds",
        "thin_stroke",
        "tiny_type",
        "font_not_loaded",
      ]),
    );
  });

  it("flags low contrast and reports the background basis", () => {
    const scene = sceneWith(
      rect("panel", {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        fill: { type: "solid", color: "#F4ECDD" },
      }),
      text("faint", {
        x: 100,
        y: 100,
        text: "Low contrast",
        color: { type: "solid", color: "#F6EFE3" },
      }),
    );
    const report = validateScene(scene);
    const issue = report.issues.find((entry) => entry.code === "low_contrast");
    expect(issue).toBeDefined();
    expect(issue?.basis).toContain("topmost shape");
  });

  it("flags duplicate names and near tangencies", () => {
    const scene = sceneWith(
      rect("a", { x: 100, y: 100, width: 100, height: 100 }, "Card"),
      rect("b", { x: 201, y: 100, width: 100, height: 100 }, "Card"),
    );
    const report = validateScene(scene, { checkTangencies: true });
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate_name", "near_tangency"]),
    );
  });

  it("passes a clean scene", () => {
    const scene = sceneWith(rect("a", {}, "Card"));
    const report = validateScene(scene);
    expect(report.errors).toBe(0);
    expect(report.checked.nodes).toBe(1);
  });
});
