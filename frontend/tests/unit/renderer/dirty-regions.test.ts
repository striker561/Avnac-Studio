import { describe, expect, it } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import { buildRenderCommands } from "@/lib/saraswati/render/commands";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiRectNode } from "@/lib/saraswati";
import {
  collectDirtyRenderCommandRects,
  planPartialRepaint,
  renderCommandBounds,
} from "@/lib/renderer/dirty-regions";

function buildRectNode(id: string, x: number, y: number): SaraswatiRectNode {
  return {
    id,
    type: "rect",
    parentId: null,
    visible: true,
    x,
    y,
    width: 80,
    height: 48,
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
  };
}

function sceneWithRects(count: number) {
  const scene = createEmptySaraswatiScene({ width: 1920, height: 1080 });
  const root = scene.nodes[scene.root];
  const childIds: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const id = `rect-${i}`;
    scene.nodes[id] = {
      ...buildRectNode(id, (i % 40) * 24, Math.floor(i / 40) * 24),
      parentId: scene.root,
    };
    childIds.push(id);
  }

  if (root?.type === "group") {
    scene.nodes[scene.root] = {
      ...root,
      children: [...root.children, ...childIds],
    };
  }

  return scene;
}

describe("unit: renderer / dirty regions", () => {
  it("collects old and new bounds when a single node moves", () => {
    const beforeScene = sceneWithRects(40);
    const afterScene = applyCommand(beforeScene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 120,
      dy: 60,
    });
    const previous = buildRenderCommands(beforeScene).slice(1);
    const next = buildRenderCommands(afterScene).slice(1);

    const dirty = collectDirtyRenderCommandRects(previous, next);
    expect(dirty.length).toBeGreaterThanOrEqual(2);
  });

  it("plans partial repaint for a drag-sized delta on a medium scene", () => {
    const beforeScene = sceneWithRects(80);
    const afterScene = applyCommand(beforeScene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 40,
      dy: 20,
    });
    const previous = buildRenderCommands(beforeScene).slice(1);
    const next = buildRenderCommands(afterScene).slice(1);

    const plan = planPartialRepaint({
      previous,
      next,
      artboardWidth: beforeScene.artboard.width,
      artboardHeight: beforeScene.artboard.height,
    });

    expect(plan.mode).toBe("partial");
    expect(plan.dirtyRects.length).toBeGreaterThan(0);
    expect(plan.dirtyCoveragePct).toBeLessThan(55);
  });

  it("disables partial mode when allowPartial is false", () => {
    const beforeScene = sceneWithRects(80);
    const afterScene = applyCommand(beforeScene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 40,
      dy: 20,
    });
    const previous = buildRenderCommands(beforeScene).slice(1);
    const next = buildRenderCommands(afterScene).slice(1);

    const plan = planPartialRepaint({
      previous,
      next,
      artboardWidth: beforeScene.artboard.width,
      artboardHeight: beforeScene.artboard.height,
      allowPartial: false,
    });

    expect(plan.mode).toBe("full");
  });

  it("falls back to full repaint when dirty coverage exceeds the threshold", () => {
    const beforeScene = sceneWithRects(4);
    const previous = buildRenderCommands(beforeScene).slice(1);
    const next = previous.map((command) =>
      command.id === "rect-0"
        ? { ...command, x: command.x + 40, y: command.y + 20 }
        : command,
    );

    const plan = planPartialRepaint({
      previous,
      next,
      artboardWidth: beforeScene.artboard.width,
      artboardHeight: beforeScene.artboard.height,
      maxCoveragePct: 0.001,
    });

    expect(plan.mode).toBe("full");
  });

  it("falls back to full repaint when the dirty-rect budget is exceeded", () => {
    const beforeScene = sceneWithRects(40);
    const afterScene = applyCommand(beforeScene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 120,
      dy: 60,
    });
    const previous = buildRenderCommands(beforeScene).slice(1);
    const next = buildRenderCommands(afterScene).slice(1);

    const plan = planPartialRepaint({
      previous,
      next,
      artboardWidth: beforeScene.artboard.width,
      artboardHeight: beforeScene.artboard.height,
      maxDirtyRects: 1,
    });

    expect(plan.mode).toBe("full");
    expect(plan.dirtyRects.length).toBeGreaterThan(1);
  });

  it("uses anchor-aware bounds for text render commands", () => {
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
      x: 100,
      y: 80,
      width: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      originX: "left",
      originY: "top",
      text: "Hello\nWorld",
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

    const [command] = buildRenderCommands(scene).filter((c) => c.id === "text-1");
    expect(command?.type).toBe("text");
    if (!command || command.type !== "text") return;

    const bounds = renderCommandBounds(command);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeCloseTo(98, 1);
    expect(bounds!.y).toBeCloseTo(78, 1);
    expect(bounds!.width).toBeGreaterThan(190);
    expect(bounds!.height).toBeGreaterThan(40);
  });
});
