import {
  downloadJsonViaBrowser,
  exportPngNativeOrBrowser,
  exportTextFileNativeOrBrowser,
} from "./avnac-export-io";
import type { SaraswatiScene } from "./saraswati/scene";
import { renderSceneToPngDataUrl } from "./renderer/offscreen-render";

export async function exportJsonFile(
  filename: string,
  payload: unknown,
): Promise<void> {
  const text = JSON.stringify(payload, null, 2);
  await exportTextFileNativeOrBrowser(filename, text, {
    logLabel: "native export",
    fallback: () => downloadJsonViaBrowser(filename, payload),
  });
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

  const dataUrl = await renderSceneToPngDataUrl(scene, {
    multiplier,
    prePaintArtboardBackground: !transparent,
  });

  await exportPngNativeOrBrowser(filename, dataUrl);
}
