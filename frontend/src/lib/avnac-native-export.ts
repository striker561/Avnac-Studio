import { ExportPng, ExportTextFile } from "../../wailsjs/go/avnacio/IOManager";
import type { SaraswatiScene } from "./saraswati/scene";
import { buildRenderCommands } from "./saraswati/render/commands";
import { canvas2DRendererBackend } from "./renderer/backends/canvas2d/renderer";

function downloadJsonViaBrowser(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportJsonFile(
  filename: string,
  payload: unknown,
): Promise<void> {
  const text = JSON.stringify(payload, null, 2);
  const hasNativeBridge =
    typeof window !== "undefined" &&
    typeof (window as unknown as { go?: unknown }).go !== "undefined";

  if (!hasNativeBridge) {
    downloadJsonViaBrowser(filename, payload);
    return;
  }

  try {
    await ExportTextFile(filename, text);
  } catch (error) {
    console.error(
      "[avnac] native export failed, falling back to browser",
      error,
    );
    downloadJsonViaBrowser(filename, payload);
  }
}

function downloadPngViaBrowser(filename: string, dataUrl: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export async function exportSceneAsPng(
  filename: string,
  scene: SaraswatiScene,
  options: { multiplier?: number; transparent?: boolean },
): Promise<void> {
  const multiplier = Math.max(1, options.multiplier ?? 1);
  const transparent = options.transparent ?? false;

  const aw = scene.artboard.width;
  const ah = scene.artboard.height;
  if (aw < 1 || ah < 1) return;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(aw * multiplier);
  canvas.height = Math.round(ah * multiplier);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (!transparent) {
    const bg = scene.artboard.bg;
    ctx.fillStyle =
      bg?.type === "solid"
        ? bg.color
        : bg?.type === "gradient"
          ? bg.css
          : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.scale(multiplier, multiplier);
  await canvas2DRendererBackend.render(ctx, buildRenderCommands(scene));
  ctx.restore();

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch (error) {
    throw new Error(
      "PNG export failed because at least one remote image tainted the canvas. " +
        "This usually happens when the source does not allow cross-origin export.",
      { cause: error },
    );
  }
  const hasNativeBridge =
    typeof window !== "undefined" &&
    typeof (window as unknown as { go?: unknown }).go !== "undefined";

  if (!hasNativeBridge) {
    downloadPngViaBrowser(filename, dataUrl);
    return;
  }

  // Pass the data URL directly to Go — Go decodes the base64 there, which
  // avoids marshalling a large Array<number> through the Wails JSON IPC layer.
  try {
    await ExportPng(filename, dataUrl);
  } catch (error) {
    console.error(
      "[avnac] native PNG export failed, falling back to browser download",
      error,
    );
    downloadPngViaBrowser(filename, dataUrl);
  }
}
