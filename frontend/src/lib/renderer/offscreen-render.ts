import { buildRenderCommands } from "../saraswati/render/commands";
import type { SaraswatiScene } from "../saraswati/scene";
import { canvas2DRendererBackend } from "./backends/canvas2d/renderer";

export type OffscreenRenderOptions = {
  multiplier?: number;
  /** When set, scales down so the longest artboard edge fits within this CSS pixel size. */
  maxCssPx?: number;
  /** Skip the first render command (artboard background rect). */
  skipArtboardBackgroundCommand?: boolean;
  /** Paint artboard background on the canvas before running render commands. */
  prePaintArtboardBackground?: boolean;
};

export async function renderSceneToCanvas(
  scene: SaraswatiScene,
  options: OffscreenRenderOptions = {},
): Promise<HTMLCanvasElement | null> {
  if (typeof document === "undefined") return null;

  const aw = scene.artboard.width;
  const ah = scene.artboard.height;
  if (!Number.isFinite(aw) || !Number.isFinite(ah) || aw < 1 || ah < 1) {
    return null;
  }

  let multiplier = Math.max(1, options.multiplier ?? 1);
  if (options.maxCssPx != null) {
    const maxEdge = Math.max(aw, ah);
    multiplier = maxEdge > 0 ? Math.min(1, options.maxCssPx / maxEdge) : 1;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(aw * multiplier));
  canvas.height = Math.max(1, Math.round(ah * multiplier));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (options.prePaintArtboardBackground) {
    const bg = scene.artboard.bg;
    ctx.fillStyle =
      bg?.type === "solid"
        ? bg.color
        : bg?.type === "gradient"
          ? bg.css
          : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  let commands = buildRenderCommands(scene);
  if (options.skipArtboardBackgroundCommand) {
    commands = commands.slice(1);
  }

  ctx.save();
  ctx.scale(multiplier, multiplier);
  await canvas2DRendererBackend.render(ctx, commands);
  ctx.restore();

  return canvas;
}

export async function renderSceneToPngDataUrl(
  scene: SaraswatiScene,
  options: OffscreenRenderOptions = {},
): Promise<string> {
  const canvas = await renderSceneToCanvas(scene, options);
  if (!canvas) {
    throw new Error("Could not render scene to canvas.");
  }

  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    throw new Error(
      "PNG export failed because at least one remote image tainted the canvas. " +
        "This usually happens when the source does not allow cross-origin export.",
      { cause: error },
    );
  }
}
