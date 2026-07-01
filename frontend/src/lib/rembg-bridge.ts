/**
 * Session-scoped rembg event bridge — survives toolbar unmount while a job runs.
 */
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { StartRemoveBackground } from "../../wailsjs/go/main/App";
import type {
  RembgCompleteEvent,
  RembgErrorEvent,
  RembgProgressEvent,
} from "@/lib/boreas-rembg";
import {
  fitDisplaySizeToNatural,
  readImageNaturalSize,
} from "@/lib/image-pixel-utils";
import type { SaraswatiImageNode } from "@/lib/saraswati";
import { useSceneEditorStore } from "@/features/scene-editor/store";
import { useRembgProcessingStore } from "@/features/scene-editor/store/rembg-processing-store";

let bridgeStarted = false;

export function __resetRembgBridgeForTests(): void {
  bridgeStarted = false;
}

function applyRembgComplete(evt: RembgCompleteEvent) {
  const { clearProcessing } = useRembgProcessingStore.getState();
  clearProcessing(evt.nodeId);

  const { scene, applyCommands } = useSceneEditorStore.getState();
  const currentNode = scene?.nodes[evt.nodeId];
  if (!currentNode || currentNode.type !== "image") return;

  const applyReplace = (node: SaraswatiImageNode) => {
    applyCommands([
      {
        type: "REPLACE_NODE",
        node: {
          ...node,
          src: evt.resultDataUrl,
          cropX: 0,
          cropY: 0,
          cropWidth: undefined,
          cropHeight: undefined,
        },
      },
    ]);
  };

  void readImageNaturalSize(evt.resultDataUrl)
    .then((natural) => {
      const imageNode = currentNode as SaraswatiImageNode;
      const nextSize = fitDisplaySizeToNatural({
        displayWidth: imageNode.width,
        displayHeight: imageNode.height,
        naturalWidth: natural.width,
        naturalHeight: natural.height,
      });
      applyReplace({
        ...imageNode,
        width: nextSize.width,
        height: nextSize.height,
      });
    })
    .catch(() => {
      applyReplace(currentNode as SaraswatiImageNode);
    });
}

export function ensureRembgBridge(): void {
  if (bridgeStarted) return;
  bridgeStarted = true;

  EventsOn("rembg:progress", (_evt: RembgProgressEvent) => {
    /* overlay handles progress */
  });

  EventsOn("rembg:complete", applyRembgComplete);

  EventsOn("rembg:error", (evt: RembgErrorEvent) => {
    const { clearProcessing, setError } = useRembgProcessingStore.getState();
    clearProcessing(evt.nodeId);
    setError(evt.nodeId, evt.errorMsg);
  });
}

export async function readImageAsBase64(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(
      `Could not read image (HTTP ${response.status}). Ensure the image is accessible.`,
    );
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed to encode image"));
    reader.readAsDataURL(blob);
  });
}

export async function startRembgJob(
  nodeId: string,
  src: string,
): Promise<void> {
  ensureRembgBridge();
  const imageBase64 = await readImageAsBase64(src);
  await StartRemoveBackground(imageBase64, nodeId);
}
