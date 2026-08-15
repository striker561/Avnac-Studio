import { describe, expect, it } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";

describe("saraswati reducer", () => {
  it("moves line endpoints with MOVE_NODE", () => {
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
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 220,
      stroke: { type: "solid", color: "#111111" },
      strokeWidth: 2,
      arrowStart: false,
      arrowEnd: false,
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

    const next = applyCommand(scene, {
      type: "MOVE_NODE",
      id: "line-1",
      dx: 5,
      dy: -3,
    });

    const moved = next.nodes["line-1"];
    expect(moved?.type).toBe("line");
    if (moved?.type === "line") {
      expect(moved.x1).toBe(15);
      expect(moved.y1).toBe(17);
      expect(moved.x2).toBe(115);
      expect(moved.y2).toBe(217);
    }
  });

  it("replaces node geometry with REPLACE_NODE", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes["rect-1"] = {
      id: "rect-1",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      width: 80,
      height: 40,
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
    };
    const root = scene.nodes[scene.root];
    if (root?.type === "group") {
      scene.nodes[scene.root] = { ...root, children: ["rect-1"] };
    }

    const rect = scene.nodes["rect-1"];
    expect(rect?.type).toBe("rect");
    if (rect?.type !== "rect") return;

    const next = applyCommand(scene, {
      type: "REPLACE_NODE",
      node: {
        ...rect,
        width: 160,
        height: 60,
      },
    });

    const updated = next.nodes["rect-1"];
    expect(updated?.type).toBe("rect");
    if (updated?.type === "rect") {
      expect(updated.width).toBe(160);
      expect(updated.height).toBe(60);
    }
  });

  it("reorders group children with SET_GROUP_CHILDREN", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes["a"] = {
      id: "a",
      type: "rect",
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
      width: 10,
      height: 10,
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
    };
    scene.nodes["b"] = {
      ...(scene.nodes["a"] as Exclude<(typeof scene.nodes)["a"], undefined>),
      id: "b",
      parentId: scene.root,
    };
    const root = scene.nodes[scene.root];
    if (root?.type === "group") {
      scene.nodes[scene.root] = { ...root, children: ["a", "b"] };
    }

    const next = applyCommand(scene, {
      type: "SET_GROUP_CHILDREN",
      id: scene.root,
      children: ["b", "a"],
    });

    const updatedRoot = next.nodes[scene.root];
    expect(updatedRoot?.type).toBe("group");
    if (updatedRoot?.type === "group") {
      expect(updatedRoot.children).toEqual(["b", "a"]);
    }
  });

  it("sets clipPath on renderable nodes with SET_NODE_CLIP_PATH", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes["rect-clip"] = {
      id: "rect-clip",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 50,
      y: 40,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      width: 120,
      height: 90,
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
    };
    const root = scene.nodes[scene.root];
    if (root?.type === "group") {
      scene.nodes[scene.root] = { ...root, children: ["rect-clip"] };
    }

    const next = applyCommand(scene, {
      type: "SET_NODE_CLIP_PATH",
      id: "rect-clip",
      clipPath: {
        type: "rect",
        x: 0,
        y: 0,
        width: 80,
        height: 60,
        radiusX: 8,
        radiusY: 8,
      },
    });

    const node = next.nodes["rect-clip"];
    expect(node?.type).toBe("rect");
    if (node?.type === "rect") {
      expect(node.clipPath?.type).toBe("rect");
      expect(node.clipPath?.width).toBe(80);
      expect(node.clipPath?.height).toBe(60);
    }
  });

  it("groups line and shape nodes with GROUP_NODES", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes["rect-1"] = {
      id: "rect-1",
      type: "rect",
      parentId: scene.root,
      visible: true,
      x: 20,
      y: 30,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      width: 60,
      height: 40,
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
    };
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
      x1: 10,
      y1: 15,
      x2: 100,
      y2: 120,
      stroke: { type: "solid", color: "#222222" },
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
        children: ["rect-1", "line-1"],
      };
    }

    const next = applyCommand(scene, {
      type: "GROUP_NODES",
      id: "group-1",
      parentId: scene.root,
      children: ["rect-1", "line-1"],
    });

    const grouped = next.nodes["group-1"];
    expect(grouped?.type).toBe("group");
    if (grouped?.type === "group") {
      expect(grouped.children).toEqual(["rect-1", "line-1"]);
    }
    expect(next.nodes["rect-1"]?.parentId).toBe("group-1");
    expect(next.nodes["line-1"]?.parentId).toBe("group-1");
    const updatedRoot = next.nodes[next.root];
    expect(updatedRoot?.type).toBe("group");
    if (updatedRoot?.type === "group") {
      expect(updatedRoot.children).toEqual(["group-1"]);
    }
  });

  it("ungroups without deleting child nodes", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });

    scene.nodes["group-1"] = {
      id: "group-1",
      type: "group",
      parentId: scene.root,
      visible: true,
      opacity: 1,
      children: ["rect-1", "line-1"],
    };
    scene.nodes["rect-1"] = {
      id: "rect-1",
      type: "rect",
      parentId: "group-1",
      visible: true,
      x: 20,
      y: 30,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      width: 60,
      height: 40,
      fill: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      radiusX: 0,
      radiusY: 0,
    };
    scene.nodes["line-1"] = {
      id: "line-1",
      type: "line",
      parentId: "group-1",
      visible: true,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      x1: 10,
      y1: 15,
      x2: 100,
      y2: 120,
      stroke: { type: "solid", color: "#222222" },
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
      scene.nodes[scene.root] = { ...root, children: ["group-1"] };
    }

    const next = applyCommand(scene, {
      type: "UNGROUP_NODE",
      id: "group-1",
    });

    expect(next.nodes["group-1"]).toBeUndefined();
    expect(next.nodes["rect-1"]?.parentId).toBe(scene.root);
    expect(next.nodes["line-1"]?.parentId).toBe(scene.root);
    const updatedRoot = next.nodes[next.root];
    expect(updatedRoot?.type).toBe("group");
    if (updatedRoot?.type === "group") {
      expect(updatedRoot.children).toEqual(["rect-1", "line-1"]);
    }
  });

  it("does not scale text font size from a vertical resize (height is auto)", () => {
    const scene = createEmptySaraswatiScene({
      width: 400,
      height: 300,
      bg: { type: "solid", color: "#ffffff" },
    });
    scene.nodes["text-1"] = {
      id: "text-1",
      type: "text",
      parentId: scene.root,
      visible: true,
      x: 40,
      y: 40,
      width: 160,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      text: "Resize me",
      fontSize: 20,
      fontFamily: "Inter",
      fontWeight: "400",
      fontStyle: "normal",
      textAlign: "left",
      lineHeight: 1.2,
      underline: false,
      color: { type: "solid", color: "#111111" },
      stroke: null,
      strokeWidth: 0,
      clipPath: null,
    };
    const root = scene.nodes[scene.root];
    if (root?.type === "group") {
      scene.nodes[scene.root] = { ...root, children: ["text-1"] };
    }

    const next = applyCommand(scene, {
      type: "RESIZE_NODE",
      id: "text-1",
      x: 40,
      y: 40,
      width: 160,
      height: 48,
    });

    const text = next.nodes["text-1"];
    expect(text?.type).toBe("text");
    if (text?.type !== "text") return;
    // Figma-style: text height is auto/content-driven, so a vertical resize
    // (or a no-handle bounds change) must not touch the font size.
    expect(text.fontSize).toBe(20);
    expect(text.width).toBe(160);
  });
});
