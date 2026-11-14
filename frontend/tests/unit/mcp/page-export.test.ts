import { describe, expect, it } from "vitest";
import {
  createEmptySaraswatiScene,
  type SaraswatiRectNode,
} from "@/lib/saraswati";
import { buildPageSvg } from "@/lib/avnac-selection-export";

function rect(id: string): SaraswatiRectNode {
  return {
    id,
    type: "rect",
    parentId: "root",
    name: "Swatch",
    visible: true,
    x: 80,
    y: 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 240,
    height: 160,
    radiusX: 0,
    radiusY: 0,
    fill: { type: "solid", color: "#C76C4B" },
    stroke: { type: "solid", color: "#173B2C" },
    strokeWidth: 4,
    clipPath: null,
    clipPathStack: [],
  };
}

describe("buildPageSvg", () => {
  it("exports the full artboard with its background and content", async () => {
    const scene = createEmptySaraswatiScene({
      width: 1200,
      height: 1600,
      bg: { type: "solid", color: "#F4ECDD" },
    });
    const swatch = rect("swatch");
    scene.nodes[swatch.id] = swatch;
    const root = scene.nodes[scene.root];
    if (!root || root.type !== "group") throw new Error("missing root");
    root.children.push(swatch.id);

    const svg = await buildPageSvg(scene);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="1600"');
    expect(svg).toContain('viewBox="0 0 1200 1600"');
    expect(svg).toContain('fill="#F4ECDD"');
    expect(svg).toContain('fill="#C76C4B"');
    expect(svg).toContain('stroke="#173B2C"');
    expect(svg).toContain('translate(200,200)');
    expect(svg).toContain('width="240"');
    expect(svg).toContain('height="160"');
  });
});
