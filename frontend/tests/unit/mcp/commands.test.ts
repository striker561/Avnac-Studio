import { describe, expect, it } from "vitest";
import {
  createEmptySaraswatiScene,
  type SaraswatiImageNode,
  type SaraswatiRectNode,
  type SaraswatiScene,
  type SaraswatiTextNode,
} from "@/lib/saraswati";
import {
  buildAlignCommands,
  buildClearCanvasCommands,
  buildDistributeCommands,
  buildFitToArtboardCommands,
  buildModifyElementsCommands,
  buildRenderElementsCommands,
} from "@/lib/mcp/commands";
import {
  buildCanvasSummary,
  buildObjectList,
  buildSelectionSummary,
} from "@/lib/mcp/summaries";
import { normalizeFontWeight, parseColor, resolveModifyPaint } from "@/lib/mcp/payload";

function buildRectNode(
  id: string,
  patch?: Partial<Pick<SaraswatiRectNode, "x" | "y" | "width" | "height">>,
): SaraswatiRectNode {
  return {
    id,
    type: "rect",
    parentId: "root",
    visible: true,
    x: patch?.x ?? 100,
    y: patch?.y ?? 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: patch?.width ?? 80,
    height: patch?.height ?? 60,
    radiusX: 0,
    radiusY: 0,
    fill: { type: "solid", color: "#000000" },
    stroke: null,
    strokeWidth: 0,
    clipPath: null,
    clipPathStack: [],
  };
}

function buildTextNode(id: string, patch?: Partial<SaraswatiTextNode>): SaraswatiTextNode {
  return {
    id,
    type: "text",
    parentId: "root",
    visible: true,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    text: "Hello",
    width: 200,
    fontSize: 40,
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    textAlign: "left",
    lineHeight: 1.2,
    underline: false,
    color: { type: "solid", color: "#000000" },
    stroke: null,
    strokeWidth: 0,
    ...patch,
  };
}

function buildImageNode(
  id: string,
  credit?: SaraswatiImageNode["credit"],
): SaraswatiImageNode {
  return {
    id,
    type: "image",
    parentId: "root",
    visible: true,
    x: 10,
    y: 20,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    width: 400,
    height: 300,
    src: "https://images.unsplash.com/photo-1?w=1080",
    cropX: 0,
    cropY: 0,
    clipPath: null,
    credit: credit ?? null,
  };
}

function sceneWith(
  ...nodes: Array<SaraswatiRectNode | SaraswatiTextNode | SaraswatiImageNode>
): SaraswatiScene {
  const scene = createEmptySaraswatiScene({ width: 800, height: 600 });
  for (const node of nodes) {
    scene.nodes[node.id] = node;
  }
  const root = scene.nodes.root;
  if (root.type !== "group") throw new Error("Expected root group");
  root.children.push(...nodes.map((n) => n.id));
  return scene;
}

describe("buildRenderElementsCommands", () => {
  it("creates a rect with defaults when only the type is given", () => {
    const scene = createEmptySaraswatiScene({ width: 1000, height: 800 });
    const { commands, created } = buildRenderElementsCommands(scene, [
      { type: "rect", fill: "#ff0000" },
    ]);

    expect(commands).toHaveLength(1);
    expect(commands[0]!.type).toBe("ADD_NODE");
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiRectNode;
    expect(node.type).toBe("rect");
    expect(node.parentId).toBe(scene.root);
    // Defaults: 100x100 near the artboard center (1000/2 - 50, 800/2 - 50).
    expect(node.width).toBe(100);
    expect(node.height).toBe(100);
    expect(node.x).toBe(450);
    expect(node.y).toBe(350);
    expect(node.fill).toEqual({ type: "solid", color: "#ff0000" });
    expect(created).toEqual([
      {
        id: node.id,
        name: "rect",
        type: "rect",
        bounds: { left: 450, top: 350, width: 100, height: 100 },
      },
    ]);
  });

  it("maps left/top aliases and corner radius for rects", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      { type: "rect", left: 10, top: 20, width: 30, height: 40, radius: 8 },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiRectNode;
    expect(node.x).toBe(10);
    expect(node.y).toBe(20);
    expect(node.radiusX).toBe(8);
    expect(node.radiusY).toBe(8);
  });

  it("normalizes text formatting fields", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      {
        type: "text",
        text: "Hi",
        fontWeight: "bold",
        fontStyle: "italic",
        textAlign: "middle",
      },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiTextNode;
    expect(node.fontWeight).toBe("700");
    expect(node.fontStyle).toBe("italic");
    expect(node.textAlign).toBe("center");
  });

  it("builds a line from endpoints with stroke paint", () => {
    const scene = createEmptySaraswatiScene();
    const { commands, created } = buildRenderElementsCommands(scene, [
      { type: "line", x1: 5, y1: 6, x2: 105, y2: 6, stroke: "#123456" },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as any;
    expect(node.type).toBe("line");
    expect(node.x1).toBe(5);
    expect(node.y2).toBe(6);
    expect(node.stroke).toEqual({ type: "solid", color: "#123456" });
    expect(node.strokeWidth).toBe(2);
    // created bounds use the element defaults for lines
    expect(created[0]!.type).toBe("line");
  });

  it("resolves a gradient fill with stops sorted and clamped", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      {
        type: "rect",
        gradientStops: [
          { color: "#00ff00", offset: 1 },
          { color: "#ff0000", offset: 0 },
          { color: "#0000ff", offset: 0.5 },
        ],
        gradientAngle: 45,
      },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiRectNode;
    expect(node.fill).toMatchObject({ type: "gradient", angle: 45 });
    if (node.fill.type !== "gradient") throw new Error("unreachable");
    expect(node.fill.stops.map((s) => s.color)).toEqual([
      "#ff0000",
      "#0000ff",
      "#00ff00",
    ]);
    expect(node.fill.stops.every((s) => s.offset >= 0 && s.offset <= 1)).toBe(true);
  });

  it("skips unknown element types and stickers without a name", () => {
    const scene = createEmptySaraswatiScene();
    const { commands, created } = buildRenderElementsCommands(scene, [
      { type: "mystery" },
      { type: "sticker" },
      { type: "image" },
    ]);
    expect(commands).toHaveLength(0);
    expect(created).toHaveLength(0);
  });

  it("maps stickers to image nodes with the bundled webp path", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      { type: "sticker", stickerName: "star" },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as any;
    expect(node.type).toBe("image");
    expect(node.src).toBe("/stickers/star.webp");
    // Default element size applies; the 160 fallback only fires for width 0.
    expect(node.width).toBe(100);
    expect(node.height).toBe(100);
  });

  it("stores the Unsplash credit the server attached to an image element", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1?w=1080",
        credit: {
          source: "unsplash",
          photoId: "1",
          photographer: "Ada",
          photographerUrl: "https://unsplash.com/@ada?utm_source=avnac",
          photoUrl: "https://unsplash.com/photos/1?utm_source=avnac",
          text: "Photo by Ada on Unsplash",
        },
      },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiImageNode;
    expect(node.credit).toMatchObject({
      photographer: "Ada",
      text: "Photo by Ada on Unsplash",
    });
  });

  it("drops a partial credit rather than storing an unusable one", () => {
    const scene = createEmptySaraswatiScene();
    const { commands } = buildRenderElementsCommands(scene, [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1?w=1080",
        credit: { photographer: "Ada" },
      },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiImageNode;
    expect(node.credit).toBeNull();
  });
});

describe("buildModifyElementsCommands", () => {
  it("emits resize/rotate/opacity commands and counts matched ids", () => {
    const scene = sceneWith(buildRectNode("a"), buildRectNode("b"));
    const { commands, modifiedCount } = buildModifyElementsCommands(scene, [
      { objectId: "a", x: 1, y: 2, width: 30, height: 40 },
      { objectId: "a", rotation: 90, opacity: 0.5 },
      { objectId: "missing", x: 0 },
    ]);

    expect(modifiedCount).toBe(2);
    expect(commands).toContainEqual({
      type: "RESIZE_NODE",
      id: "a",
      x: 1,
      y: 2,
      width: 30,
      height: 40,
    });
    expect(commands).toContainEqual({ type: "ROTATE_NODE", id: "a", rotation: 90 });
    expect(commands).toContainEqual({ type: "SET_NODE_OPACITY", id: "a", opacity: 0.5 });
  });

  it("keeps current geometry when only one resize field is provided", () => {
    const scene = sceneWith(buildRectNode("a", { x: 11, y: 12, width: 13, height: 14 }));
    const { commands } = buildModifyElementsCommands(scene, [
      { objectId: "a", width: 50 },
    ]);
    expect(commands).toContainEqual({
      type: "RESIZE_NODE",
      id: "a",
      x: 11,
      y: 12,
      width: 50,
      height: 14,
    });
  });

  it("sends text color through SET_TEXT_FORMAT, not SET_NODE_FILL", () => {
    const scene = sceneWith(buildTextNode("t"));
    const { commands } = buildModifyElementsCommands(scene, [
      { objectId: "t", fill: "#00ff00", fontSize: 24 },
    ]);
    const types = commands.map((c) => c.type);
    expect(types).not.toContain("SET_NODE_FILL");
    expect(commands).toContainEqual({
      type: "SET_TEXT_FORMAT",
      id: "t",
      fontSize: 24,
      color: { type: "solid", color: "#00ff00" },
    });
  });

  it("applies gradient strokes to lines with the strokeWidth fallback", () => {
    const scene = sceneWith(buildRectNode("a"));
    const line = {
      ...buildRectNode("l"),
      type: "line" as const,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      stroke: {
        type: "gradient" as const,
        css: "linear-gradient(0deg, #000000 0%, #ffffff 100%)",
        stops: [
          { color: "#000000", offset: 0 },
          { color: "#ffffff", offset: 1 },
        ],
        angle: 0,
      },
      strokeWidth: 4,
      arrowStart: false,
      arrowEnd: false,
      lineStyle: "solid" as const,
      pathType: "straight" as const,
      curveBulge: 0,
      curveT: 0.5,
    };
    scene.nodes[line.id] = line;
    scene.nodes.root;
    if (scene.nodes.root.type !== "group") throw new Error("unreachable");
    scene.nodes.root.children.push(line.id);

    const { commands } = buildModifyElementsCommands(scene, [
      {
        objectId: "l",
        gradientAngle: 90,
      },
    ]);

    const strokes = commands.filter((c) => c.type === "SET_NODE_STROKE");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toMatchObject({ id: "l", strokeWidth: 4 });
    if (strokes[0]!.type !== "SET_NODE_STROKE") throw new Error("unreachable");
    expect(strokes[0]!.stroke).toMatchObject({ type: "gradient", angle: 90 });
  });

  it("renames via SET_NODE_NAME", () => {
    const scene = sceneWith(buildRectNode("a"));
    const { commands } = buildModifyElementsCommands(scene, [
      { objectId: "a", name: "Hero" },
    ]);
    expect(commands).toContainEqual({ type: "SET_NODE_NAME", id: "a", name: "Hero" });
  });
});

describe("buildAlignCommands", () => {
  it("centers a single object on the artboard", () => {
    const scene = sceneWith(buildRectNode("a", { x: 0, y: 0, width: 100, height: 50 }));
    const { commands, alignedCount } = buildAlignCommands(scene, ["a"], "centerH");
    expect(alignedCount).toBe(1);
    // artboard 800 wide → dx = 400 - 50
    expect(commands).toEqual([{ type: "MOVE_NODE", id: "a", dx: 350, dy: 0 }]);
  });

  it("left-aligns multiple objects to their union", () => {
    const scene = sceneWith(
      buildRectNode("a", { x: 100, y: 0, width: 50, height: 50 }),
      buildRectNode("b", { x: 200, y: 0, width: 50, height: 50 }),
    );
    const { commands } = buildAlignCommands(scene, ["a", "b"], "left");
    expect(commands).toEqual([
      { type: "MOVE_NODE", id: "a", dx: 0, dy: 0 },
    ].filter((c) => (c as any).dx !== 0 || (c as any).dy !== 0)
      .concat([{ type: "MOVE_NODE", id: "b", dx: -100, dy: 0 }]));
  });

  it("reports zero alignedCount when bounds are unmeasurable", () => {
    const scene = createEmptySaraswatiScene();
    const { commands, alignedCount } = buildAlignCommands(scene, ["ghost"], "left");
    expect(commands).toHaveLength(0);
    expect(alignedCount).toBe(0);
  });
});

describe("buildDistributeCommands", () => {
  it("evens out centers horizontally, leaving the outer two in place", () => {
    const scene = sceneWith(
      buildRectNode("a", { x: 0, y: 0, width: 100, height: 50 }),
      buildRectNode("b", { x: 300, y: 0, width: 100, height: 50 }),
      buildRectNode("c", { x: 700, y: 0, width: 100, height: 50 }),
    );
    const { commands } = buildDistributeCommands(scene, ["a", "b", "c"], "horizontal");
    // Centers: 50, 350, 750. b should move to center 400 → dx = +50.
    expect(commands).toEqual([{ type: "MOVE_NODE", id: "b", dx: 50, dy: 0 }]);
  });
});

describe("buildFitToArtboardCommands", () => {
  it("resizes a single object to the padded artboard", () => {
    const scene = sceneWith(buildRectNode("a"));
    const { commands } = buildFitToArtboardCommands(scene, ["a"], 20);
    expect(commands).toEqual([
      { type: "RESIZE_NODE", id: "a", x: 20, y: 20, width: 760, height: 560 },
    ]);
  });

  it("scales and centers a multi-object layout proportionally", () => {
    const scene = sceneWith(
      buildRectNode("a", { x: 0, y: 0, width: 100, height: 100 }),
      buildRectNode("b", { x: 100, y: 0, width: 100, height: 100 }),
    );
    const { commands } = buildFitToArtboardCommands(scene, ["a", "b"], 0);
    // Source: 200x100 → target 800x600 → s = min(4, 6) = 4.
    const moved = commands as Array<{ id: string; x: number; y: number; width: number; height: number }>;
    expect(moved).toHaveLength(2);
    for (const c of moved) {
      expect(c.width).toBe(400);
      expect(c.height).toBe(400);
      expect(c.y).toBe(100); // (600 - 400) / 2
    }
    const ids = moved.map((c) => c.id).sort();
    expect(ids).toEqual(["a", "b"]);
    // Horizontal placement: a starts at 0*4 + offset(0) = 0, b at 100*4 = 400.
    const a = moved.find((c) => c.id === "a")!;
    const b = moved.find((c) => c.id === "b")!;
    expect(a.x).toBe(0);
    expect(b.x).toBe(400);
  });

  it("skips group nodes in multi-object fits", () => {
    const scene = sceneWith(buildRectNode("a"), buildRectNode("b"));
    const group = {
      id: "g",
      type: "group" as const,
      parentId: "root",
      name: "g",
      visible: true,
      opacity: 1,
      children: ["a", "b"],
    };
    scene.nodes[group.id] = group;
    const { commands } = buildFitToArtboardCommands(scene, ["g", "a"], 0);
    expect(commands.map((c) => (c as any).id)).toEqual(["a"]);
  });
});

describe("buildClearCanvasCommands", () => {
  it("deletes every non-root node", () => {
    const scene = sceneWith(buildRectNode("a"), buildTextNode("t"));
    const commands = buildClearCanvasCommands(scene);
    expect(commands).toEqual([
      { type: "DELETE_NODE", id: "a" },
      { type: "DELETE_NODE", id: "t" },
    ]);
  });
});

describe("summaries", () => {
  it("buildCanvasSummary excludes the root and reports geometry", () => {
    const scene = sceneWith(buildRectNode("a"));
    const { artboard, nodes } = buildCanvasSummary(scene);
    expect(artboard).toEqual(scene.artboard);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: "a",
      type: "rect",
      x: 100,
      y: 120,
      width: 80,
      height: 60,
    });
  });

  it("buildObjectList includes the parent id", () => {
    const scene = sceneWith(buildRectNode("a"));
    const objects = buildObjectList(scene);
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({ id: "a", parentId: "root" });
  });

  it("buildSelectionSummary maps selected ids to objects", () => {
    const scene = sceneWith(buildRectNode("a"), buildRectNode("b"));
    const { selectedIds, objects } = buildSelectionSummary(scene, ["a", "ghost"]);
    expect(selectedIds).toEqual(["a", "ghost"]);
    expect(objects).toHaveLength(1);
    expect(objects[0]!.id).toBe("a");
  });

  it("lists distinct photo credits with every node that uses them", () => {
    const credit = {
      source: "unsplash",
      photoId: "1",
      photographer: "Ada",
      photographerUrl: "https://unsplash.com/@ada?utm_source=avnac",
      photoUrl: "https://unsplash.com/photos/1?utm_source=avnac",
      text: "Photo by Ada on Unsplash",
    };
    const scene = sceneWith(
      buildImageNode("a", credit),
      buildImageNode("b", credit),
      buildRectNode("c"),
    );

    const { nodes, credits } = buildCanvasSummary(scene);

    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      photographer: "Ada",
      text: "Photo by Ada on Unsplash",
      nodeIds: ["a", "b"],
    });
    expect(nodes.find((n) => n.id === "a")!.credit).toBe(
      "Photo by Ada on Unsplash",
    );
    expect(nodes.find((n) => n.id === "c")!.credit).toBeUndefined();
  });
});

describe("payload normalizers", () => {
  it("normalizeFontWeight clamps numeric strings and maps names", () => {
    expect(normalizeFontWeight("bold")).toBe("700");
    expect(normalizeFontWeight("semibold")).toBe("600");
    // 3-digit values pass through unclamped (original listener behavior).
    expect(normalizeFontWeight("950")).toBe("950");
    expect(normalizeFontWeight(950)).toBe("950");
    // Only values outside the 3-digit form hit the 100–900 clamp.
    expect(normalizeFontWeight(9500)).toBe("900");
    expect(normalizeFontWeight(20)).toBe("100");
    expect(normalizeFontWeight("nonsense")).toBe("400");
    expect(normalizeFontWeight(null)).toBe("400");
  });

  it("resolveModifyPaint re-angles an existing gradient without new stops", () => {
    const current = {
      type: "gradient",
      css: "linear-gradient(0deg, #000000 0%, #ffffff 100%)",
      stops: [
        { color: "#000000", offset: 0 },
        { color: "#ffffff", offset: 1 },
      ],
      angle: 0,
    };
    const result = resolveModifyPaint({ gradientAngle: 120 }, current);
    expect(result).toMatchObject({ type: "gradient", angle: 120 });
    expect(result?.type === "gradient" && result.stops).toEqual(current.stops);
  });

  it("resolveModifyPaint returns null when nothing changes", () => {
    expect(resolveModifyPaint({}, { type: "solid", color: "#000000" })).toBeNull();
  });

  it("parseColor accepts the {color} object form and rejects junk", () => {
    expect(parseColor({ color: "#ff00ff" })).toEqual({
      type: "solid",
      color: "#ff00ff",
    });
    // An unreadable paint degrades to transparent rather than nesting the
    // object inside the paint's color field.
    expect(parseColor({ nope: 1 })).toEqual({
      type: "solid",
      color: "transparent",
    });
  });
});

/**
 * Regressions from the PR review: text nodes carry no height field, so every
 * path that read node.width / node.height reported `height: 0` for text and
 * silently corrupted layout. Bounds now come from getNodeBounds.
 */
describe("text bounds", () => {
  function sceneWithRectAndText(): SaraswatiScene {
    const scene = sceneWith(
      buildTextNode("t", {
        x: 100,
        y: 200,
        width: 400,
        text: "Hello",
        fontSize: 40,
      }),
      buildRectNode("r", { x: 500, y: 500, width: 100, height: 100 }),
    );
    return scene;
  }

  it("gives text a measured default width instead of the 100px rect default", () => {
    const scene = createEmptySaraswatiScene({ width: 1080, height: 1080 });
    const { commands, created } = buildRenderElementsCommands(scene, [
      { type: "text", text: "COASTAL FIELD GUIDE", left: 100, top: 100, fontSize: 30 },
    ]);
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiTextNode;
    expect(node.width).toBe(360);
    expect(created[0]!.bounds).toEqual({
      left: 100,
      top: 100,
      width: 360,
      height: 30,
    });
  });

  it("uses the injected measurement, and reports its box, when no width is given", () => {
    const scene = createEmptySaraswatiScene({ width: 1080, height: 1080 });
    const calls: Array<number | undefined> = [];
    const { commands, created } = buildRenderElementsCommands(
      scene,
      [{ type: "text", text: "COASTAL", left: 10, top: 20, fontSize: 72 }],
      (input) => {
        calls.push(input.width);
        return { width: 812, height: 86 };
      },
    );
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiTextNode;
    // Asked to measure the natural width (no wrap width supplied).
    expect(calls).toEqual([undefined]);
    expect(node.width).toBe(812);
    expect(created[0]!.bounds).toEqual({
      left: 10,
      top: 20,
      width: 812,
      height: 86,
    });
  });

  it("measures against the caller's width when one is given", () => {
    const scene = createEmptySaraswatiScene({ width: 1080, height: 1080 });
    const calls: Array<number | undefined> = [];
    const { commands, created } = buildRenderElementsCommands(
      scene,
      [{ type: "text", text: "COASTAL", width: 400, fontSize: 72 }],
      (input) => {
        calls.push(input.width);
        return { width: 400, height: 172 };
      },
    );
    if (commands[0]!.type !== "ADD_NODE") throw new Error("unreachable");
    const node = commands[0]!.node as SaraswatiTextNode;
    expect(calls).toEqual([400]);
    expect(node.width).toBe(400);
    // Two wrapped lines of 72px: the height the caller has to lay out around.
    expect(created[0]!.bounds.height).toBe(172);
  });

  it("centers text by its box rather than its top edge", () => {
    const { commands } = buildAlignCommands(
      sceneWithRectAndText(),
      ["t", "r"],
      "centerV",
    );
    // Union spans y 200..600 → center 400. The text box is 40 tall, so its
    // center needs dy = +180; a 0-height box gave +200 and put the text's top
    // edge on the alignment line. The rect is unchanged at dy = -150.
    expect(commands).toEqual([
      { type: "MOVE_NODE", id: "t", dx: 0, dy: 180 },
      { type: "MOVE_NODE", id: "r", dx: 0, dy: -150 },
    ]);
  });

  it("fits a text selection using its real height", () => {
    const scene = createEmptySaraswatiScene({ width: 1000, height: 1000 });
    const text = buildTextNode("t", {
      x: 0,
      y: 0,
      width: 500,
      fontSize: 40,
      text: "Hello",
    });
    const rect = buildRectNode("r", { x: 0, y: 500, width: 500, height: 500 });
    scene.nodes[text.id] = text;
    scene.nodes[rect.id] = rect;
    const root = scene.nodes.root;
    if (root.type !== "group") throw new Error("Expected root group");
    root.children.push("t", "r");

    const { commands } = buildFitToArtboardCommands(scene, ["t", "r"], 0);
    // Source 500x1000 → target 1000x1000 → s = 1, offsetX = 250.
    expect(commands).toEqual([
      { type: "RESIZE_NODE", id: "t", x: 250, y: 0, width: 500, height: 40 },
      { type: "RESIZE_NODE", id: "r", x: 250, y: 500, width: 500, height: 500 },
    ]);
  });

  it("measures a group's union instead of reading it as 0,0,0,0", () => {
    const scene = createEmptySaraswatiScene({ width: 800, height: 600 });
    const left = buildRectNode("r1", { x: 0, y: 0, width: 100, height: 100 });
    const right = buildRectNode("r2", { x: 200, y: 0, width: 100, height: 100 });
    const mid = buildRectNode("r3", { x: 250, y: 0, width: 100, height: 100 });
    const far = buildRectNode("r4", { x: 500, y: 0, width: 100, height: 100 });
    const group = {
      id: "g1",
      type: "group" as const,
      parentId: "root",
      name: "g1",
      visible: true,
      opacity: 1,
      children: ["r1", "r2"],
    };
    for (const node of [left, right, mid, far]) scene.nodes[node.id] = node;
    scene.nodes[group.id] = group;
    const root = scene.nodes.root;
    if (root.type !== "group") throw new Error("Expected root group");
    root.children.push("g1", "r1", "r2", "r3", "r4");

    const { commands } = buildDistributeCommands(scene, ["g1", "r3", "r4"], "horizontal");
    // Group union is 0..300 → center 150 (a raw read gave 0 and reordered the
    // spread). Centers: 150, 300, 550 → r3 steps to 350.
    expect(commands).toEqual([{ type: "MOVE_NODE", id: "r3", dx: 50, dy: 0 }]);
  });

  it("reports text height in the summary tools", () => {
    const scene = sceneWith(
      buildTextNode("t", { x: 10, y: 20, width: 200, fontSize: 40 }),
    );
    expect(buildCanvasSummary(scene).nodes[0]).toMatchObject({
      id: "t",
      x: 10,
      y: 20,
      width: 200,
      height: 40,
    });
    expect(buildObjectList(scene)[0]).toMatchObject({ id: "t", height: 40 });
    expect(buildSelectionSummary(scene, ["t"]).objects[0]).toMatchObject({
      id: "t",
      height: 40,
    });
  });
});
