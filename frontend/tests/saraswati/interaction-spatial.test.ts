import { describe, expect, it } from "vitest";
import { applyCommand } from "../../src/lib/saraswati/commands/reducer";
import { createEmptySaraswatiScene } from "../../src/lib/saraswati/scene";
import { findTopHitNodeId } from "../../src/lib/saraswati/spatial";

function createLineScene() {
  const scene = createEmptySaraswatiScene({
    width: 800,
    height: 600,
    bg: { type: "solid", color: "#ffffff" },
  });

  scene.nodes["line-1"] = {
    id: "line-1",
    type: "line",
    parentId: scene.root,
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    x1: 100,
    y1: 100,
    x2: 300,
    y2: 100,
    stroke: { type: "solid", color: "#111111" },
    strokeWidth: 2,
    arrowStart: false,
    arrowEnd: true,
    lineStyle: "solid",
    pathType: "straight",
    curveBulge: 0,
    curveT: 0.5,
  };

  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, "line-1"],
    };
  }

  return scene;
}

describe("saraswati interaction + spatial", () => {
  it("selects a thin line with hit tolerance", () => {
    const scene = createLineScene();

    const hit = findTopHitNodeId(scene, { x: 180, y: 103 });

    expect(hit).toBe("line-1");
  });

  it("resizes line by length only with RESIZE_NODE", () => {
    const scene = createLineScene();

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "line-1",
      x: 120,
      y: 130,
      width: 220,
      height: 40,
    });

    const line = next.nodes["line-1"];
    expect(line?.type).toBe("line");
    if (line?.type !== "line") return;

    expect(line.x1).toBe(120);
    expect(line.y1).toBe(100);
    expect(line.x2).toBe(340);
    expect(line.y2).toBe(100);
  });

  it("scales line hit tolerance with hitScale", () => {
    const scene = createLineScene();

    expect(findTopHitNodeId(scene, { x: 180, y: 103 }, { hitScale: 1 })).toBe(
      "line-1",
    );

    expect(findTopHitNodeId(scene, { x: 180, y: 103 }, { hitScale: 0 })).toBe(
      null,
    );
  });
});
