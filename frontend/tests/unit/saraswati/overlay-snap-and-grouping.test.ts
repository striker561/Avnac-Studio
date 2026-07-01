import { describe, expect, it } from "vitest";
import {
  snapMoveBounds,
  snapResizeBounds,
} from "@/lib/editor/overlays";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import { buildGroupSelectionCommands } from "@/features/scene-editor/scene-group-commands";

function addRect(
  scene: ReturnType<typeof createEmptySaraswatiScene>,
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  parentId = scene.root,
) {
  scene.nodes[id] = {
    id,
    type: "rect",
    parentId,
    visible: true,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    fill: { type: "solid", color: "#ffffff" },
    stroke: { type: "solid", color: "#111111" },
    strokeWidth: 1,
    width,
    height,
    radiusX: 0,
    radiusY: 0,
  };

  const parent = scene.nodes[parentId];
  if (parent?.type === "group") {
    scene.nodes[parentId] = {
      ...parent,
      children: [...parent.children, id],
    };
  }
}

describe("overlay snapping regression coverage", () => {
  it("keeps artboard edge and center snapping behavior", () => {
    const scene = createEmptySaraswatiScene({
      width: 800,
      height: 600,
      bg: { type: "solid", color: "#ffffff" },
    });

    const nearLeft = snapMoveBounds(
      scene,
      { x: 3, y: 80, width: 100, height: 50 },
      [],
      6,
    );
    expect(nearLeft.bounds.x).toBe(0);

    const nearCenter = snapMoveBounds(
      scene,
      { x: 349, y: 120, width: 100, height: 50 },
      [],
      6,
    );
    expect(nearCenter.bounds.x).toBe(350);
  });

  it("keeps node-to-node snapping behavior", () => {
    const scene = createEmptySaraswatiScene({
      width: 800,
      height: 600,
      bg: { type: "solid", color: "#ffffff" },
    });
    addRect(scene, "anchor", 220, 100, 100, 80);

    const snapped = snapMoveBounds(
      scene,
      { x: 266, y: 108, width: 50, height: 40 },
      [],
      6,
    );

    // target right edge (316) should snap to anchor right edge (320)
    expect(snapped.bounds.x).toBe(270);
  });

  it("keeps resize snapping against artboard edges", () => {
    const scene = createEmptySaraswatiScene({
      width: 800,
      height: 600,
      bg: { type: "solid", color: "#ffffff" },
    });

    const snapped = snapResizeBounds(
      scene,
      { x: 700, y: 60, width: 97, height: 40 },
      "e",
      [],
      6,
    );

    expect(snapped.bounds.x).toBe(700);
    expect(snapped.bounds.width).toBe(100);
  });
});

describe("group command eligibility", () => {
  it("builds a group command for sibling nodes", () => {
    const scene = createEmptySaraswatiScene({
      width: 800,
      height: 600,
      bg: { type: "solid", color: "#ffffff" },
    });
    addRect(scene, "a", 10, 10, 40, 40);
    addRect(scene, "b", 80, 20, 40, 40);

    const commands = buildGroupSelectionCommands(scene, ["a", "b"], "g1");

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      type: "GROUP_NODES",
      id: "g1",
      parentId: scene.root,
      children: ["a", "b"],
    });
  });

  it("returns no group command when parents differ", () => {
    const scene = createEmptySaraswatiScene({
      width: 800,
      height: 600,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes.gInner = {
      id: "gInner",
      type: "group",
      parentId: scene.root,
      visible: true,
      opacity: 1,
      children: [],
    };
    const root = scene.nodes[scene.root];
    if (root?.type === "group") {
      scene.nodes[scene.root] = {
        ...root,
        children: [...root.children, "gInner"],
      };
    }

    addRect(scene, "outside", 10, 10, 30, 30, scene.root);
    addRect(scene, "inside", 60, 20, 30, 30, "gInner");

    const commands = buildGroupSelectionCommands(
      scene,
      ["outside", "inside"],
      "g2",
    );

    expect(commands).toEqual([]);
  });
});
