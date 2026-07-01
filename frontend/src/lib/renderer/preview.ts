import type { AvnacDocumentV1 } from "../avnac-document";
import { fromAvnacDocument } from "../saraswati/compat/from-avnac";
import { renderSceneToCanvas } from "./offscreen-render";
import type { SaraswatiScene } from "../saraswati/scene";

export async function renderAvnacDocumentFastPreviewDataUrl(
  doc: AvnacDocumentV1,
  options?: { maxCssPx?: number },
): Promise<string | null> {
  const result = fromAvnacDocument(doc);
  if (!result.fullySupported) return null;
  return renderSaraswatiScenePreviewDataUrl(result.scene, options);
}

export async function renderSaraswatiScenePreviewDataUrl(
  scene: SaraswatiScene,
  options?: { maxCssPx?: number },
): Promise<string | null> {
  const canvas = await renderSceneToCanvas(scene, {
    maxCssPx: options?.maxCssPx ?? 400,
  });
  if (!canvas) return null;
  return canvas.toDataURL("image/png");
}
