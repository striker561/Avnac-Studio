import { describe, expect, it } from "vitest";
import {
  createEmptySaraswatiScene,
  createSaraswatiEditorStore,
  type SaraswatiRectNode,
} from "@/lib/saraswati";

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

function buildStore() {
  const scene = createEmptySaraswatiScene({ width: 800, height: 600 });
  const rect = buildRectNode("rect-1");
  scene.nodes[rect.id] = rect;
  const root = scene.nodes.root;
  if (root.type !== "group") {
    throw new Error("Expected root group");
  }
  root.children.push(rect.id);
  return createSaraswatiEditorStore(scene);
}

describe("createSaraswatiEditorStore", () => {
  it("undoes and redoes a single dispatched command", () => {
    const store = buildStore();

    store.dispatch({ type: "MOVE_NODE", id: "rect-1", dx: 25, dy: -10 });

    let rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(125);
    expect(rect.y).toBe(110);
    expect(store.getState().canUndo).toBe(true);

    store.undo();
    rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(100);
    expect(rect.y).toBe(120);
    expect(store.getState().canRedo).toBe(true);

    store.redo();
    rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(125);
    expect(rect.y).toBe(110);
  });

  it("collapses a batched drag into one undo step", () => {
    const store = buildStore();

    store.beginBatch();
    store.dispatch({ type: "MOVE_NODE", id: "rect-1", dx: 10, dy: 0 });
    store.dispatch({ type: "MOVE_NODE", id: "rect-1", dx: 15, dy: 5 });
    store.dispatch({ type: "MOVE_NODE", id: "rect-1", dx: -3, dy: 7 });
    expect(store.getState().canUndo).toBe(false);

    store.endBatch();

    let rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(122);
    expect(rect.y).toBe(132);
    expect(store.getState().canUndo).toBe(true);

    store.undo();
    rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(100);
    expect(rect.y).toBe(120);

    store.redo();
    rect = store.getState().scene.nodes["rect-1"];
    if (rect.type !== "rect") {
      throw new Error("Expected rect node");
    }
    expect(rect.x).toBe(122);
    expect(rect.y).toBe(132);
  });

  it("does not create undo history for an empty batch", () => {
    const store = buildStore();

    store.beginBatch();
    store.endBatch();

    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().canRedo).toBe(false);
  });

  it("keeps grouped children proportional when resizing to tiny bounds", () => {
    const scene = createEmptySaraswatiScene({ width: 800, height: 600 });
    const rectA = buildRectNode("rect-a", {
      x: 100,
      y: 120,
      width: 80,
      height: 60,
    });
    const rectB = buildRectNode("rect-b", {
      x: 240,
      y: 120,
      width: 120,
      height: 80,
    });
    scene.nodes[rectA.id] = rectA;
    scene.nodes[rectB.id] = rectB;

    const root = scene.nodes.root;
    if (root.type !== "group") {
      throw new Error("Expected root group");
    }
    root.children.push(rectA.id, rectB.id);

    const store = createSaraswatiEditorStore(scene);
    store.dispatch({
      type: "GROUP_NODES",
      id: "group-1",
      parentId: "root",
      children: [rectA.id, rectB.id],
    });

    // Shrink grouped bounds to near-minimum size.
    store.dispatch({
      type: "RESIZE_NODE",
      id: "group-1",
      x: 100,
      y: 120,
      width: 1,
      height: 1,
    });

    const nextA = store.getState().scene.nodes[rectA.id];
    const nextB = store.getState().scene.nodes[rectB.id];
    if (nextA.type !== "rect" || nextB.type !== "rect") {
      throw new Error("Expected grouped rect nodes");
    }

    // Under tiny grouped resize, children should remain proportionally small,
    // not jump to 1px each (which causes overlap/collapse).
    expect(nextA.width).toBeGreaterThan(0);
    expect(nextB.width).toBeGreaterThan(0);
    expect(nextA.width).toBeLessThan(1);
    expect(nextB.width).toBeLessThan(1);
  });

  it("rotates grouped children around the group center", () => {
    const scene = createEmptySaraswatiScene({ width: 800, height: 600 });
    const rectA = buildRectNode("rect-a", {
      x: 100,
      y: 120,
      width: 80,
      height: 60,
    });
    const rectB = buildRectNode("rect-b", {
      x: 240,
      y: 120,
      width: 120,
      height: 80,
    });
    scene.nodes[rectA.id] = rectA;
    scene.nodes[rectB.id] = rectB;

    const root = scene.nodes.root;
    if (root.type !== "group") {
      throw new Error("Expected root group");
    }
    root.children.push(rectA.id, rectB.id);

    const store = createSaraswatiEditorStore(scene);
    store.dispatch({
      type: "GROUP_NODES",
      id: "group-1",
      parentId: "root",
      children: [rectA.id, rectB.id],
    });

    const beforeA = store.getState().scene.nodes[rectA.id];
    const beforeB = store.getState().scene.nodes[rectB.id];
    if (beforeA.type !== "rect" || beforeB.type !== "rect") {
      throw new Error("Expected grouped rect nodes");
    }

    store.dispatch({ type: "ROTATE_NODE", id: "group-1", rotation: 45 });

    const group = store.getState().scene.nodes["group-1"];
    const nextA = store.getState().scene.nodes[rectA.id];
    const nextB = store.getState().scene.nodes[rectB.id];
    if (group.type !== "group" || nextA.type !== "rect" || nextB.type !== "rect") {
      throw new Error("Expected group + rect nodes");
    }

    expect(group.rotation).toBe(45);
    expect(nextA.rotation).toBe(45);
    expect(nextB.rotation).toBe(45);
    expect(nextA.x).not.toBe(beforeA.x);
    expect(nextA.y).not.toBe(beforeA.y);
    expect(nextB.x).not.toBe(beforeB.x);
    expect(nextB.y).not.toBe(beforeB.y);
  });
});
