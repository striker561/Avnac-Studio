import { describe, expect, it } from "vitest";
import {
  SARASWATI_ROOT_ID,
  createEmptySaraswatiScene,
  type SaraswatiImageNode,
} from "@/lib/saraswati";
import {
  buildVectorPlaceCommands,
  buildVectorUpdateCommand,
} from "@/lib/mcp/commands";

const SVG_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20data-avnac-vector-board%3D%221%22%3E%3C%2Fsvg%3E";

function sceneWithNode(node: SaraswatiImageNode) {
  const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
  scene.nodes[node.id] = node;
  return scene;
}

function imageNode(patch: Partial<SaraswatiImageNode> = {}): SaraswatiImageNode {
  return {
    id: "node-1",
    type: "image",
    parentId: sceneRoot(),
    visible: true,
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 256,
    height: 256,
    src: SVG_SRC,
    cropX: 0,
    cropY: 0,
    clipPath: null,
    ...patch,
  };
}

function sceneRoot(): string {
  return SARASWATI_ROOT_ID;
}

describe("buildVectorPlaceCommands", () => {
  it("fits a large board within 640 px and centres it", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    const built = buildVectorPlaceCommands(scene, {
      src: SVG_SRC,
      width: 1200,
      height: 900,
      name: "Rocket",
    });
    expect("commands" in built).toBe(true);
    if (!("commands" in built)) return;

    expect(built.created.type).toBe("image");
    expect(built.created.name).toBe("Rocket");
    // 1200x900 at 640/1200 = 0.5333 -> 640x480
    expect(built.created.bounds.width).toBe(640);
    expect(built.created.bounds.height).toBe(480);
    expect(built.created.bounds.left).toBe((1200 - 640) / 2);
    expect(built.created.bounds.top).toBe((900 - 480) / 2);
    const command = built.commands[0]!;
    expect(command.type).toBe("ADD_NODE");
    if (command.type !== "ADD_NODE") return;
    expect(command.node.type).toBe("image");
    const node = command.node as SaraswatiImageNode;
    expect(node.src).toBe(SVG_SRC);
  });

  it("honours an explicit position and scale", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    const built = buildVectorPlaceCommands(scene, {
      src: SVG_SRC,
      width: 256,
      height: 256,
      x: 40,
      y: 60,
      scale: 0.5,
    });
    if (!("commands" in built)) throw new Error(built.error);
    expect(built.created.bounds).toEqual({ left: 40, top: 60, width: 128, height: 128 });
  });

  it("clamps a position that would push the element off the board", () => {
    const scene = createEmptySaraswatiScene({ width: 400, height: 300 });
    const built = buildVectorPlaceCommands(scene, {
      src: SVG_SRC,
      width: 200,
      height: 100,
      x: 9999,
      y: -50,
    });
    if (!("commands" in built)) throw new Error(built.error);
    expect(built.created.bounds.left).toBe(200);
    expect(built.created.bounds.top).toBe(0);
  });

  it("rejects a non-SVG source and bad dimensions", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    expect(buildVectorPlaceCommands(scene, { src: "data:image/png;base64,xx", width: 10, height: 10 })).toEqual({
      error: expect.any(String),
    });
    expect(buildVectorPlaceCommands(scene, { src: SVG_SRC, width: 0, height: 10 })).toEqual({
      error: expect.any(String),
    });
  });
});

describe("buildVectorUpdateCommand", () => {
  it("replaces the source on the same node without moving it", () => {
    const node = imageNode();
    const scene = sceneWithNode(node);
    const nextSrc = SVG_SRC.replace("%3E%3C%2Fsvg%3E", "%3E%3C%2Fsvg%3E%3C!--v2--%3E");
    const built = buildVectorUpdateCommand(scene, node.id, { src: nextSrc });
    if (!("command" in built)) throw new Error(built.error);
    expect(built.command.type).toBe("REPLACE_NODE");
    if (built.command.type !== "REPLACE_NODE") return;
    const replaced = built.command.node as SaraswatiImageNode;
    expect(replaced.id).toBe(node.id);
    expect(replaced.x).toBe(node.x);
    expect(replaced.y).toBe(node.y);
    expect(replaced.width).toBe(node.width);
    expect(replaced.src).toBe(nextSrc);
  });

  it("refuses unknown objects, non-image nodes and missing sources", () => {
    const scene = createEmptySaraswatiScene({ width: 1200, height: 900 });
    expect(buildVectorUpdateCommand(scene, "missing", { src: SVG_SRC })).toEqual({
      error: expect.stringContaining("not found"),
    });
    const rect = {
      ...imageNode(),
      id: "rect-1",
      type: "rect" as const,
    };
    // A rect node is only used to exercise the type guard.
    scene.nodes["rect-1"] = rect as never;
    expect(buildVectorUpdateCommand(scene, "rect-1", { src: SVG_SRC })).toEqual({
      error: expect.stringContaining("not a vector element"),
    });
    const node = imageNode();
    scene.nodes[node.id] = node;
    expect(buildVectorUpdateCommand(scene, node.id, { src: "nope" })).toEqual({
      error: expect.any(String),
    });
  });
});