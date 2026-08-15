import { describe, expect, it, vi } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import { buildRenderCommands } from "@/lib/saraswati/render/commands";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type {
  SaraswatiRectNode,
  SaraswatiRenderCommand,
} from "@/lib/saraswati";
import { createContentPaintScheduler } from "@/lib/renderer/paint-scheduler";
import type { RendererBackend } from "@/lib/renderer/types";

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

function createMockCanvasContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    font: "",
    measureText: vi.fn(() => ({ width: 10 })),
  } as unknown as CanvasRenderingContext2D;
}

function createCanvas2dMockBackend() {
  return {
    kind: "canvas2d" as const,
    render: vi.fn(async () => undefined),
  };
}

describe("unit: renderer / paint scheduler", () => {
  it("uses partial repaint on canvas2d after the first frame of a drag", async () => {
    const scheduler = createContentPaintScheduler();
    const ctx = createMockCanvasContext();
    const backend = createCanvas2dMockBackend();
    const scene = sceneWithRects(40);
    const moved = applyCommand(scene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 40,
      dy: 20,
    });
    const presentationKey = "1920x1080|";
    const firstCommands = buildRenderCommands(scene).slice(1);
    const secondCommands = buildRenderCommands(moved).slice(1);

    const first = await scheduler.paintContent({
      target: ctx,
      commands: firstCommands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend,
    });
    const second = await scheduler.paintContent({
      target: ctx,
      commands: secondCommands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend,
    });

    expect(first.stats.repaintMode).toBe("full");
    expect(second.stats.repaintMode).toBe("partial");
    expect(second.stats.dirtyRects).toBeGreaterThan(0);
    const clearRect = vi.mocked(ctx.clearRect);
    expect(
      clearRect.mock.calls.filter(
        (call: number[]) => call[2] === 1920 && call[3] === 1080,
      ),
    ).toHaveLength(1);
    expect(backend.render.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("forces full repaint for non-canvas backends even when the diff is small", async () => {
    const scheduler = createContentPaintScheduler();
    const pixiBackend: RendererBackend<unknown> = {
      kind: "pixi",
      render: vi.fn(async () => undefined),
    };
    const scene = sceneWithRects(10);
    const moved = applyCommand(scene, {
      type: "MOVE_NODE",
      id: "rect-0",
      dx: 10,
      dy: 5,
    });
    const presentationKey = "1920x1080|";
    const commands = buildRenderCommands(scene).slice(1);
    const movedCommands = buildRenderCommands(moved).slice(1);

    await scheduler.paintContent({
      target: {},
      commands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend: pixiBackend,
    });
    const second = await scheduler.paintContent({
      target: {},
      commands: movedCommands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend: pixiBackend,
    });

    expect(second.stats.repaintMode).toBe("full");
    expect(pixiBackend.render).toHaveBeenCalledTimes(2);
  });

  it("resets cached commands when the presentation key changes", async () => {
    const scheduler = createContentPaintScheduler();
    const ctx = createMockCanvasContext();
    const backend = createCanvas2dMockBackend();
    const scene = sceneWithRects(5);
    const commands = buildRenderCommands(scene).slice(
      1,
    ) as SaraswatiRenderCommand[];

    const first = await scheduler.paintContent({
      target: ctx,
      commands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey: "1920x1080|",
      backend,
    });
    const second = await scheduler.paintContent({
      target: ctx,
      commands,
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey: "1920x1080|rect-1",
      backend,
    });

    expect(first.stats.repaintMode).toBe("full");
    expect(second.stats.repaintMode).toBe("full");
  });

  it("clears dirty regions even when the new scene is empty (no ghosting)", async () => {
    const scheduler = createContentPaintScheduler();
    const ctx = createMockCanvasContext();
    const backend = createCanvas2dMockBackend();
    const scene = sceneWithRects(1);
    const presentationKey = "1920x1080|";

    const first = await scheduler.paintContent({
      target: ctx,
      commands: buildRenderCommands(scene).slice(1),
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend,
    });
    expect(first.stats.repaintMode).toBe("full");

    const clearCallsBefore = vi.mocked(ctx.clearRect).mock.calls.length;

    // Simulate switching to an empty page with the SAME artboard dimensions.
    // The removed node's dirty region must still be cleared even though there
    // is nothing to repaint — otherwise its pixels stay ghosted on screen.
    const second = await scheduler.paintContent({
      target: ctx,
      commands: [],
      artboardWidth: 1920,
      artboardHeight: 1080,
      presentationKey,
      backend,
    });

    expect(second.stats.repaintMode).toBe("partial");
    expect(vi.mocked(ctx.clearRect).mock.calls.length).toBeGreaterThan(
      clearCallsBefore,
    );
  });
});
