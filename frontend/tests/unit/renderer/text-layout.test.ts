import { describe, expect, it, vi } from "vitest";
import { layoutTextLines } from "@/lib/renderer/backends/canvas2d/text-layout";
import { renderCommandBounds } from "@/lib/renderer/dirty-regions";
import { buildRenderCommands } from "@/lib/saraswati/render/commands";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiScene, SaraswatiTextNode } from "@/lib/saraswati";

// Deterministic glyph width: every char is 8px. With maxWidth 40, "aa bb"
// (5 chars = 40px) fits but "aa bb cc" (8 chars = 64px) wraps.
const mockMeasure = (_font: string, text: string) => text.length * 8;

vi.mock(
  "@/lib/renderer/backends/canvas2d/text-layout",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/renderer/backends/canvas2d/text-layout")
      >();
    return {
      ...actual,
      getSharedTextMeasure: () => mockMeasure,
    };
  },
);

const LAYOUT_INPUT = {
  text: "aa bb cc dd ee ff",
  fontSize: 16,
  lineHeight: 1.2,
  fontFamily: "Arial",
  fontWeight: "400",
  fontStyle: "normal" as const,
  width: 40,
};

function makeTextNode(): SaraswatiTextNode {
  return {
    id: "text-1",
    type: "text",
    parentId: null,
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: LAYOUT_INPUT.text,
    width: LAYOUT_INPUT.width,
    fontSize: LAYOUT_INPUT.fontSize,
    fontFamily: LAYOUT_INPUT.fontFamily,
    fontWeight: LAYOUT_INPUT.fontWeight,
    fontStyle: LAYOUT_INPUT.fontStyle,
    textAlign: "left",
    lineHeight: LAYOUT_INPUT.lineHeight,
    underline: false,
    color: { type: "solid", color: "#111111" },
    stroke: null,
    strokeWidth: 0,
    clipPath: null,
  };
}

function textScene(): SaraswatiScene {
  const scene = createEmptySaraswatiScene({
    width: 400,
    height: 300,
    bg: { type: "solid", color: "#ffffff" },
  });
  scene.nodes["text-1"] = { ...makeTextNode(), parentId: scene.root };
  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, "text-1"],
    };
  }
  return scene;
}

describe("canvas2d text layout (renderer layer)", () => {
  it("wraps text into multiple lines and reports a taller box", () => {
    const layout = layoutTextLines(LAYOUT_INPUT, mockMeasure);
    expect(layout.lines).toEqual(["aa bb", "cc dd", "ee ff"]);
    // Tight box: 2 * (16 * 1.2) + 16 = 54.4 > single-line em box 16.
    expect(layout.boxHeight).toBeCloseTo(54.4, 5);
    expect(layout.boxWidth).toBe(40);
  });

  it("falls back to one box line per literal line break without a measure", () => {
    const layout = layoutTextLines(LAYOUT_INPUT, null);
    expect(layout.lines).toEqual([LAYOUT_INPUT.text]);
    expect(layout.boxHeight).toBe(16);
  });

  it("dirty-rect bounds cover the wrapped text (no trails on drag)", () => {
    const scene = textScene();
    const commands = buildRenderCommands(scene);
    const textCommand = commands.find((c) => c.type === "text");
    expect(textCommand).toBeDefined();

    const dirty = renderCommandBounds(textCommand!);
    expect(dirty).not.toBeNull();
    // The dirty region must be at least as tall as the wrapped text box so
    // moving/clearing the text erases every painted line.
    expect(dirty!.height).toBeGreaterThanOrEqual(54.4);
    expect(dirty!.height).toBeGreaterThan(16 * 1.2 + 2);
  });
});
