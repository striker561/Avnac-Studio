import { describe, expect, it } from "vitest";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import type { SaraswatiScene } from "@/lib/saraswati";
import { resolveTopmostSelectedIds } from "@/features/scene-editor/scene-editor-input-utils";
import {
  buildClipboardPasteCommands,
  collectSubtreeNodes,
} from "@/features/scene-editor/use-scene-selection-actions";

function buildSceneWithGroup(): SaraswatiScene {
  const scene = createEmptySaraswatiScene({
    width: 800,
    height: 600,
    bg: { type: "solid", color: "#ffffff" },
  });
  const rect = (id: string, x: number): SaraswatiScene["nodes"][string] => ({
    id,
    type: "rect",
    parentId: scene.root,
    visible: true,
    x,
    y: 20,
    width: 60,
    height: 40,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    fill: { type: "solid", color: "#3366ff" },
    stroke: null,
    strokeWidth: 0,
    radiusX: 4,
    radiusY: 4,
    clipPath: null,
  });
  scene.nodes["c1"] = { ...rect("c1", 20), parentId: "g" };
  scene.nodes["c2"] = { ...rect("c2", 100), parentId: "g" };
  scene.nodes["standalone"] = rect("standalone", 300);
  scene.nodes["g"] = {
    id: "g",
    type: "group",
    parentId: scene.root,
    visible: true,
    opacity: 1,
    rotation: 0,
    children: ["c1", "c2"],
  };
  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, "c1", "c2", "standalone", "g"],
    };
  }
  return scene;
}

describe("selection actions: move target resolution", () => {
  it("resolves a group + children selection to the top-most nodes only", () => {
    const scene = buildSceneWithGroup();
    // Cmd+A returns every node; the helpers must collapse group + children.
    const all = ["g", "c1", "c2", "standalone"];
    expect(resolveTopmostSelectedIds(scene, all).sort()).toEqual([
      "g",
      "standalone",
    ]);
  });

  it("keeps unrelated selected nodes when a group is also selected", () => {
    const scene = buildSceneWithGroup();
    expect(resolveTopmostSelectedIds(scene, ["g", "c1"]).sort()).toEqual(["g"]);
    expect(
      resolveTopmostSelectedIds(scene, ["g", "standalone"]).sort(),
    ).toEqual(["g", "standalone"]);
  });

  it("returns a single node untouched", () => {
    const scene = buildSceneWithGroup();
    expect(resolveTopmostSelectedIds(scene, ["c2"])).toEqual(["c2"]);
  });
});

describe("selection actions: group copy/paste", () => {
  it("paste commands deep-clone a group with its children (fresh ids)", () => {
    const scene = buildSceneWithGroup();
    const clip: Record<string, (typeof scene.nodes)[string]> = {};
    collectSubtreeNodes(scene.nodes, "g", clip);
    expect(Object.keys(clip).sort()).toEqual(["c1", "c2", "g"]);

    const { commands, topNewIds } = buildClipboardPasteCommands(clip, 16, 16);
    expect(topNewIds).toHaveLength(1);

    let next = scene;
    for (const command of commands) next = applyCommand(next, command);

    const newGroupId = topNewIds[0]!;
    const newGroup = next.nodes[newGroupId];
    expect(newGroup?.type).toBe("group");
    if (newGroup?.type !== "group") return;
    // Children are preserved and re-parented under the new group with fresh ids.
    expect(newGroup.children).toHaveLength(2);
    const [nc1, nc2] = newGroup.children;
    expect(nc1).not.toBe("c1");
    expect(nc2).not.toBe("c2");
    expect(next.nodes[nc1!]?.parentId).toBe(newGroupId);
    expect(next.nodes[nc2!]?.parentId).toBe(newGroupId);
    // Geometry is offset by the paste delta.
    const moved = next.nodes[nc1!] as { x: number };
    expect(moved.x).toBe(20 + 16);
  });
});
