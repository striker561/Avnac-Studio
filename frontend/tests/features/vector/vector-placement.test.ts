import { describe, expect, it } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import {
  createEmptySaraswatiScene,
  getNodeBounds,
  type SaraswatiImageNode,
} from "@/lib/saraswati";
import {
  buildVectorPlaceCommands,
  buildVectorUpdateCommand,
} from "@/lib/mcp/commands";

const SVG_V1 =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22256%22%20height%3D%22256%22%20viewBox%3D%220%200%20256%20256%22%20data-avnac-vector-board%3D%221%22%3E%3Cpath%20d%3D%22M%20128%2052%20L%20180%20168%20L%2076%20168%20Z%22%20fill%3D%22%23E85D3F%22%2F%3E%3C%2Fsvg%3E";
const SVG_V2 = SVG_V1.replace("%23E85D3F", "%23EF6B4A");

/** Apply a batch the way the scene store does, one command at a time. */
function applyAll(
  scene: ReturnType<typeof createEmptySaraswatiScene>,
  commands: Parameters<typeof applyCommand>[1][],
) {
  return commands.reduce((current, command) => applyCommand(current, command), scene);
}

describe("vector drawing lands on the canvas", () => {
  it("places a vector element with the expected box and source", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    const built = buildVectorPlaceCommands(scene, {
      boardId: "board-1",
      name: "Rocket icon",
      src: SVG_V1,
      width: 256,
      height: 256,
    });
    if (!("commands" in built)) throw new Error(built.error);

    const next = applyAll(scene, built.commands);
    const node = next.nodes[built.created.id] as SaraswatiImageNode;
    expect(node).toBeDefined();
    expect(node.type).toBe("image");
    expect(node.name).toBe("Rocket icon");
    expect(node.src).toBe(SVG_V1);
    expect(node.width).toBe(256);
    expect(node.height).toBe(256);

    const bounds = getNodeBounds(node);
    expect(bounds).toMatchObject({
      x: (1200 - 256) / 2,
      y: (900 - 256) / 2,
      width: 256,
      height: 256,
    });
    const root = next.nodes[next.root];
    if (root?.type === "group") {
      expect(root.children).toContain(built.created.id);
    }
  });

  it("edits the placed element in place instead of adding another", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    const built = buildVectorPlaceCommands(scene, {
      objectId: "fixed-node",
      src: SVG_V1,
      width: 256,
      height: 256,
      x: 100,
      y: 80,
    });
    if (!("commands" in built)) throw new Error(built.error);
    const placed = applyAll(scene, built.commands);

    const update = buildVectorUpdateCommand(placed, "fixed-node", {
      src: SVG_V2,
      name: "Rocket icon v2",
    });
    if (!("command" in update)) throw new Error(update.error);
    const edited = applyCommand(placed, update.command);

    const nodeCount = Object.keys(edited.nodes).length;
    expect(nodeCount).toBe(Object.keys(placed.nodes).length);
    const node = edited.nodes["fixed-node"] as SaraswatiImageNode;
    expect(node.src).toBe(SVG_V2);
    expect(node.name).toBe("Rocket icon v2");
    expect(node.x).toBe(100);
    expect(node.y).toBe(80);
    expect(node.width).toBe(256);
  });
});
