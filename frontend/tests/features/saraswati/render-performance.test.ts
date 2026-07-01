import { describe, expect, it } from "vitest";
import { applyCommand } from "@/lib/saraswati/commands/reducer";
import { buildRenderCommands } from "@/lib/saraswati/render/commands";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiRectNode } from "@/lib/saraswati";
import { toAvnacDocument } from "@/lib/saraswati/compat/to-avnac";

const DRAG_FRAME_BUDGET_MS = 16;
const BUILD_COMMAND_BUDGET_MS = 8;
const SERIALIZE_BUDGET_MS = 12;

function buildRectNode(id: string, index: number): SaraswatiRectNode {
  return {
    id,
    type: "rect",
    parentId: null,
    visible: true,
    x: (index % 40) * 24,
    y: Math.floor(index / 40) * 24,
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
    scene.nodes[id] = { ...buildRectNode(id, i), parentId: scene.root };
    childIds.push(id);
  }

  if (root?.type === "group") {
    scene.nodes[scene.root] = { ...root, children: [...root.children, ...childIds] };
  }

  return scene;
}

function measureMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("feature: saraswati / render performance", () => {
  it("builds render commands within budget for a medium scene", () => {
    const scene = sceneWithRects(120);
    const ms = measureMs(() => {
      const commands = buildRenderCommands(scene);
      expect(commands.length).toBeGreaterThan(120);
    });
    expect(ms).toBeLessThan(BUILD_COMMAND_BUDGET_MS);
  });

  it("scales command build cost roughly linearly with node count", () => {
    const smallMs = measureMs(() => buildRenderCommands(sceneWithRects(50)));
    const largeMs = measureMs(() => buildRenderCommands(sceneWithRects(200)));
    expect(largeMs).toBeLessThan(smallMs * 6);
  });

  it("simulates drag frames without blowing the 60fps reducer budget", () => {
    let scene = sceneWithRects(80);
    const frameMs: number[] = [];

    for (let frame = 0; frame < 30; frame += 1) {
      const ms = measureMs(() => {
        scene = applyCommand(scene, {
          type: "MOVE_NODE",
          id: "rect-0",
          dx: 2,
          dy: 1,
        });
      });
      frameMs.push(ms);
    }

    const p95 = [...frameMs].sort((a, b) => a - b)[Math.floor(frameMs.length * 0.95)]!;
    expect(p95).toBeLessThan(DRAG_FRAME_BUDGET_MS);
  });

  it("flags serialization on every drag frame as a hot-path risk", () => {
    const scene = sceneWithRects(100);
    const serializeMs = measureMs(() => {
      toAvnacDocument(scene);
    });
    expect(serializeMs).toBeLessThan(SERIALIZE_BUDGET_MS);
  });

  it("reports duplicate command growth when opacity groups expand render order", () => {
    const scene = sceneWithRects(60);
    const commands = buildRenderCommands(scene);
    const ids = commands.map((command) => command.id);
    const unique = new Set(ids);
    const duplicateCommands = ids.length - unique.size;
    expect(duplicateCommands).toBe(0);
  });
});

describe("feature: saraswati / render stress breakpoints", () => {
  it("handles a 500-node scene without throwing during command build", () => {
    const scene = sceneWithRects(500);
    expect(() => buildRenderCommands(scene)).not.toThrow();
    const commands = buildRenderCommands(scene);
    expect(commands.length).toBeGreaterThan(500);
  });

  it("keeps reducer stable across rapid multi-node move bursts", () => {
    let scene = sceneWithRects(40);
    for (let i = 0; i < 40; i += 1) {
      scene = applyCommand(scene, {
        type: "MOVE_NODE",
        id: `rect-${i}`,
        dx: 1,
        dy: 1,
      });
    }
    expect(scene.nodes["rect-39"]).toMatchObject({ x: expect.any(Number) });
  });
});
