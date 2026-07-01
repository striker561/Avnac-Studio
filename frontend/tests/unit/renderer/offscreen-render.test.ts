// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySaraswatiScene } from "@/lib/saraswati/scene";
import type { SaraswatiRectNode } from "@/lib/saraswati";
import { buildRenderCommands } from "@/lib/saraswati/render/commands";
import {
  renderSceneToCanvas,
  renderSceneToPngDataUrl,
} from "@/lib/renderer/offscreen-render";

const renderMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/renderer/backends/canvas2d/renderer", () => ({
  canvas2DRendererBackend: {
    kind: "canvas2d",
    render: renderMock,
  },
}));

function sceneWithRect() {
  const scene = createEmptySaraswatiScene({
    width: 200,
    height: 100,
    bg: { type: "solid", color: "#ffffff" },
  });

  const rect: SaraswatiRectNode = {
    id: "rect-1",
    type: "rect",
    parentId: scene.root,
    visible: true,
    x: 10,
    y: 20,
    width: 40,
    height: 30,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    originX: "left",
    originY: "top",
    fill: { type: "solid", color: "#ff0000" },
    stroke: null,
    strokeWidth: 0,
    radiusX: 0,
    radiusY: 0,
    clipPath: null,
  };
  scene.nodes["rect-1"] = rect;
  const root = scene.nodes[scene.root];
  if (root?.type === "group") {
    root.children = ["rect-1"];
  }
  return scene;
}

describe("renderer offscreen render", () => {
  beforeEach(() => {
    renderMock.mockClear();
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
    });
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,offscreen");
  });

  it("renders a minimal rect scene to canvas", async () => {
    const scene = sceneWithRect();
    const canvas = await renderSceneToCanvas(scene, { multiplier: 1 });

    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(200);
    expect(canvas!.height).toBe(100);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("skips artboard background command when requested", async () => {
    const scene = sceneWithRect();
    await renderSceneToCanvas(scene, {
      multiplier: 1,
      skipArtboardBackgroundCommand: true,
    });

    const commands = renderMock.mock.calls[0]?.[1];
    const fullCommands = buildRenderCommands(scene);
    expect(commands).toEqual(fullCommands.slice(1));
  });

  it("returns a PNG data URL", async () => {
    const scene = sceneWithRect();
    const dataUrl = await renderSceneToPngDataUrl(scene, { multiplier: 1 });
    expect(dataUrl).toBe("data:image/png;base64,offscreen");
  });
});
