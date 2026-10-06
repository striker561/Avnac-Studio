/**
 * DOM-canvas rendering helpers for MCP image responses (previews, annotated
 * overviews, node crops, exports). These wrap the offscreen renderer with the
 * MCP-specific output formats (base64 PNG without the data URL prefix).
 * Scene in, canvas/base64 out — no store or Wails access.
 */

import {
  renderSceneToCanvas,
  renderSceneToPngDataUrl,
} from "@/lib/renderer/offscreen-render";
import type { SaraswatiScene } from "@/lib/saraswati";

type LooseRecord = Record<string, any>;

/** Strip the data-URL prefix from a rendered PNG data URL. */
export function pngBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

/** PNG base64 preview of the whole scene at MCP preview resolution (1024px). */
export async function renderScenePreviewBase64(scene: SaraswatiScene): Promise<string> {
  const dataUrl = await renderSceneToPngDataUrl(scene, {
    maxCssPx: 1024,
    prePaintArtboardBackground: true,
  });
  return pngBase64FromDataUrl(dataUrl);
}

/**
 * Render the scene to a canvas at the given cap. `prePaint` controls whether
 * the artboard background is painted first (off for transparent exports).
 */
export function renderSceneToExportCanvas(
  scene: SaraswatiScene,
  maxCssPx: number,
  prePaint: boolean,
): Promise<HTMLCanvasElement | null> {
  return renderSceneToCanvas(scene, {
    maxCssPx,
    prePaintArtboardBackground: prePaint,
  });
}

/** Encode a rendered canvas as a base64 PNG (no data URL prefix). */
export function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  return pngBase64FromDataUrl(canvas.toDataURL("image/png"));
}

/**
 * Draw MCP debugging labels ([#name or #id prefix]) over every visible,
 * non-root node so agents can identify objects in get_canvas_image output.
 */
export function annotateSceneCanvas(canvas: HTMLCanvasElement, scene: SaraswatiScene): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = canvas.width / Math.max(1, scene.artboard.width);
  ctx.save();
  ctx.font = "12px sans-serif";
  for (const node of Object.values(scene.nodes)) {
    if (node.id === scene.root || !node.visible) continue;
    const anyNode = node as LooseRecord;
    const nodeX = "x" in node ? anyNode.x : 0;
    const nodeY = "y" in node ? anyNode.y : 0;
    const x = nodeX * scale;
    const y = nodeY * scale;
    const w = ("width" in node ? anyNode.width : 100) * scale;
    const h = ("height" in node ? anyNode.height : 100) * scale;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    const label = `[#${node.name || node.id.slice(0, 6)}]`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x, Math.max(0, y - 18), textWidth + 8, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 4, Math.max(13, y - 4));
  }
  ctx.restore();
}

/**
 * Crop an 8px-padded region around a node from a rendered scene canvas.
 * Returns the cropped PNG as base64, or null when the 2D context is
 * unavailable (the caller falls back to the full-canvas image).
 */
export function cropCanvasToNodeBase64(
  canvas: HTMLCanvasElement,
  scene: SaraswatiScene,
  objectId: string,
): string | null {
  const targetNode = scene.nodes[objectId];
  if (!targetNode) return null;
  const anyNode = targetNode as LooseRecord;
  const scale = canvas.width / Math.max(1, scene.artboard.width);
  const nx = ("x" in targetNode ? anyNode.x : 0) * scale;
  const ny = ("y" in targetNode ? anyNode.y : 0) * scale;
  const nw = ("width" in targetNode ? anyNode.width : 100) * scale;
  const nh = ("height" in targetNode ? anyNode.height : 100) * scale;

  const pad = 8;
  const cropX = Math.max(0, Math.floor(nx - pad));
  const cropY = Math.max(0, Math.floor(ny - pad));
  const cropW = Math.min(canvas.width - cropX, Math.ceil(nw + pad * 2));
  const cropH = Math.min(canvas.height - cropY, Math.ceil(nh + pad * 2));

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, cropW);
  cropCanvas.height = Math.max(1, cropH);
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) return null;
  cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return canvasToPngBase64(cropCanvas);
}
