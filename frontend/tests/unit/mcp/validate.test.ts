import { describe, expect, it } from "vitest";
import {
  createEmptySaraswatiScene,
  type SaraswatiRectNode,
  type SaraswatiScene,
  type SaraswatiTextNode,
} from "@/lib/saraswati";
import { getNodeBounds } from "@/lib/saraswati/spatial";
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
    expect(report.checks.map((check) => check.status)).not.toContain("warn");
  });

  it("reports rule-backed checks even when they pass", () => {
    const scene = sceneWith(rect("card", { x: 64, y: 64, width: 200, height: 120 }));
    const report = validateScene(scene);
    expect(report.checks.map((check) => check.id)).toEqual([
      "margin_ladder",
      "density",
      "level_census",
      "alignment",
      "optical_centring",
      "contrast_floor",
    ]);
    const margin = report.checks.find((check) => check.id === "margin_ladder");
    expect(margin?.status).toBe("pass");
    expect(margin?.detail).toContain("floor 48");
  });

  it("warns when content crowds the trim edge", () => {
    const scene = sceneWith(rect("edge", { x: 4, y: 120, width: 200, height: 120 }));
    const report = validateScene(scene);
    const check = report.checks.find((entry) => entry.id === "margin_ladder");
    expect(check?.status).toBe("warn");
    const issue = report.issues.find((entry) => entry.code === "tight_margin");
    expect(issue?.rule).toBe("08-negative-space");
    expect(issue?.message).toContain("8% of the short edge");
  });

  it("counts text levels and flags more than five", () => {
    const sizes = [60, 40, 28, 20, 16, 12];
    const scene = sceneWith(
      ...sizes.map((fontSize, index) =>
        text("level-" + index, { y: 40 + index * 80, fontSize, width: 180 }),
      ),
    );
    const report = validateScene(scene);
    const check = report.checks.find((entry) => entry.id === "level_census");
    expect(check?.status).toBe("warn");
    expect(check?.detail).toContain("6 level(s)");
    expect(report.issues.map((issue) => issue.code)).toContain("level_overflow");
  });

  it("flags a type ladder that is too flat to read as two levels", () => {
    const scene = sceneWith(
      text("headline", { y: 60, fontSize: 40, width: 300 }),
      text("subhead", { y: 200, fontSize: 36, width: 300 }),
    );
    const report = validateScene(scene);
    const check = report.checks.find((entry) => entry.id === "type_steps");
    expect(check?.status).toBe("warn");
    expect(report.issues.map((issue) => issue.code)).toContain("flat_type_steps");
  });

  it("does not call a weight change a flat size step", () => {
    const scene = sceneWith(
      text("body", { y: 100, fontSize: 16, fontWeight: "400", width: 300 }),
      text("label", { y: 200, fontSize: 14, fontWeight: "700", width: 300 }),
    );
    const report = validateScene(scene);
    expect(report.checks.find((entry) => entry.id === "type_steps")?.status).toBe("pass");
  });

  it("flags a near-miss off the centre axis", () => {
    const headline = text("headline", { x: 252, y: 80, width: 300, fontSize: 64 });
    const report = validateScene(sceneWith(headline));
    const check = report.checks.find((entry) => entry.id === "alignment");
    expect(check?.status).toBe("warn");
    expect(check?.detail).toContain("2px off the artboard axis");
    const issue = report.issues.find((entry) => entry.code === "near_alignment");
    expect(issue?.rule).toBe("07-alignment-and-proximity");
  });

  it("accepts a deliberate off-axis or an exact centre", () => {
    const wide = text("headline", { x: 320, y: 80, width: 300, fontSize: 64 });
    expect(
      validateScene(sceneWith(wide)).checks.find((entry) => entry.id === "alignment")?.status,
    ).toBe("pass");
    const exact = text("headline", { x: 250, y: 80, width: 300, fontSize: 64 });
    expect(
      validateScene(sceneWith(exact)).checks.find((entry) => entry.id === "alignment")?.status,
    ).toBe("pass");
  });

  it("flags display type centred mathematically", () => {
    const headline = text("headline", { x: 250, y: 0, width: 300, fontSize: 40 });
    const bounds = getNodeBounds(headline);
    headline.y = 300 - (bounds.y + bounds.height / 2);
    const report = validateScene(sceneWith(headline));
    const check = report.checks.find((entry) => entry.id === "optical_centring");
    expect(check?.status).toBe("warn");
    const issue = report.issues.find((entry) => entry.code === "mathematical_centring");
    expect(issue?.rule).toBe("04-balance-and-proportion");
  });

  it("counts density on the 4x4 grid and ignores the background plate", () => {
    const quadrants = [
      rect("q1", { x: 0, y: 0, width: 400, height: 300 }),
      rect("q2", { x: 400, y: 0, width: 400, height: 300 }),
      rect("q3", { x: 0, y: 300, width: 400, height: 300 }),
      rect("q4", { x: 400, y: 300, width: 400, height: 300 }),
    ];
    const full = sceneWith(...quadrants);
    const packed = validateScene(full).checks.find((entry) => entry.id === "density");
    expect(packed?.status).toBe("warn");
    expect(packed?.detail).toContain("16/16 cells");

    const plate = rect("bg", { x: 0, y: 0, width: 800, height: 600 });
    const empty = validateScene(sceneWith(plate)).checks.find((entry) => entry.id === "density");
    expect(empty?.status).toBe("pass");
    expect(empty?.detail).toContain("0/16 cells");
  });
});