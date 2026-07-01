/**
 * use-remove-bg.ts
 *
 * Hook that orchestrates the full background-removal flow for a single
 * canvas image node:
 *
 *  1. Reads the image source, converts it to a base64 data URL.
 *  2. Calls the Go RembgService.StartRemoveBackground over Wails IPC.
 *  3. Listens for rembg:progress / rembg:complete / rembg:error Wails events.
 *  4. On success, replaces the image node src via a REPLACE_NODE command.
 *  5. Tracks processing state in the shared rembg-processing-store so the
 *     canvas overlay can show the shine animation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

type UseRemoveBgReturn = {
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
  startRemoveBg: () => Promise<void>;
};

/**
 * Reads an image src (data URL, blob URL, or https URL) and returns a
 * base64 data URL suitable for sending over the Wails IPC bridge.
 */
async function readImageAsBase64(src: string): Promise<string> {
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

export function useRemoveBg(
  nodeId: string,
  node: SaraswatiImageNode,
): UseRemoveBgReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCommands = useSceneEditorStore((s) => s.applyCommands);
  const scene = useSceneEditorStore((s) => s.scene);

  const setProcessing = useRembgProcessingStore((s) => s.setProcessing);
  const clearProcessing = useRembgProcessingStore((s) => s.clearProcessing);

  // Track the active job ID so we only react to events for our node.
  const activeNodeIdRef = useRef(nodeId);
  useEffect(() => {
    activeNodeIdRef.current = nodeId;
  }, [nodeId]);

  // Register Wails event listeners once and clean up on unmount.
  useEffect(() => {
    const offProgress = EventsOn("rembg:progress", (_evt: RembgProgressEvent) => {
      // Progress events are handled visually by the overlay; no local state needed.
    });

    const offComplete = EventsOn("rembg:complete", (evt: RembgCompleteEvent) => {
      if (evt.nodeId !== activeNodeIdRef.current) return;

      setIsProcessing(false);
      clearProcessing(evt.nodeId);

      // Re-read the current node from the store to get its latest shape.
      const currentScene = useSceneEditorStore.getState().scene;
      const currentNode = currentScene?.nodes[evt.nodeId];
      if (!currentNode || currentNode.type !== "image") return;

      void readImageNaturalSize(evt.resultDataUrl)
        .then((natural) => {
          const imageNode = currentNode as SaraswatiImageNode;
          const nextSize = fitDisplaySizeToNatural({
            displayWidth: imageNode.width,
            displayHeight: imageNode.height,
            naturalWidth: natural.width,
            naturalHeight: natural.height,
          });
          applyCommands([
            {
              type: "REPLACE_NODE",
              node: {
                ...imageNode,
                src: evt.resultDataUrl,
                width: nextSize.width,
                height: nextSize.height,
                cropX: 0,
                cropY: 0,
                cropWidth: undefined,
                cropHeight: undefined,
              },
            },
          ]);
        })
        .catch(() => {
          applyCommands([
            {
              type: "REPLACE_NODE",
              node: {
                ...(currentNode as SaraswatiImageNode),
                src: evt.resultDataUrl,
                cropX: 0,
                cropY: 0,
                cropWidth: undefined,
                cropHeight: undefined,
              },
            },
          ]);
        });
    });

    const offError = EventsOn("rembg:error", (evt: RembgErrorEvent) => {
      if (evt.nodeId !== activeNodeIdRef.current) return;
      setIsProcessing(false);
      clearProcessing(evt.nodeId);
      setError(evt.errorMsg);
    });

    return () => {
      offProgress();
      offComplete();
      offError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRemoveBg = useCallback(async () => {
    if (isProcessing) return;

    // Guard: Wails registers Go bindings on window.go at runtime.
    // Check the method is actually present before calling it.
    const bridge = (window as Window & { go?: Record<string, Record<string, Record<string, unknown>>> }).go;
    if (typeof bridge?.main?.App?.StartRemoveBackground !== "function") {
      setError("Remove background requires the app to be restarted after the latest build.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProcessing(nodeId);

    try {
      const imageBase64 = await readImageAsBase64(node.src);
      await StartRemoveBackground(imageBase64, nodeId);
    } catch (err) {
      setIsProcessing(false);
      clearProcessing(nodeId);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [isProcessing, node.src, nodeId, setProcessing, clearProcessing]);

  // Clean up the processing flag if the component unmounts mid-flight.
  useEffect(() => {
    return () => {
      if (isProcessing) {
        clearProcessing(nodeId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Keep `scene` in dep list to satisfy linter but we read from store directly above.
  void scene;

  return {
    isProcessing,
    error,
    clearError: () => setError(null),
    startRemoveBg,
  };
}
