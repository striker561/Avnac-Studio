/**
 * use-remove-bg.ts — toolbar hook; IPC events are handled by rembg-bridge.ts.
 */
import { useCallback } from "react";
import type { SaraswatiImageNode } from "@/lib/saraswati";
import { startRembgJob } from "@/lib/rembg-bridge";
import { useRembgProcessingStore } from "@/features/scene-editor/store/rembg-processing-store";

type UseRemoveBgReturn = {
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
  startRemoveBg: () => Promise<void>;
};

export function useRemoveBg(
  nodeId: string,
  node: SaraswatiImageNode,
): UseRemoveBgReturn {
  const isProcessing = useRembgProcessingStore(
    (s) => s.processingNodes[nodeId] === true,
  );
  const error = useRembgProcessingStore((s) => s.errors[nodeId] ?? null);

  const setProcessing = useRembgProcessingStore((s) => s.setProcessing);
  const clearProcessing = useRembgProcessingStore((s) => s.clearProcessing);
  const setError = useRembgProcessingStore((s) => s.setError);
  const clearErrorForNode = useRembgProcessingStore((s) => s.clearError);

  const startRemoveBg = useCallback(async () => {
    if (isProcessing) return;

    const bridge = (
      window as Window & {
        go?: Record<string, Record<string, Record<string, unknown>>>;
      }
    ).go;
    if (typeof bridge?.main?.App?.StartRemoveBackground !== "function") {
      setError(
        nodeId,
        "Remove background requires the app to be restarted after the latest build.",
      );
      return;
    }

    clearErrorForNode(nodeId);
    setProcessing(nodeId);

    try {
      await startRembgJob(nodeId, node.src);
    } catch (err) {
      clearProcessing(nodeId);
      setError(
        nodeId,
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [
    isProcessing,
    node.src,
    nodeId,
    setProcessing,
    clearProcessing,
    setError,
    clearErrorForNode,
  ]);

  return {
    isProcessing,
    error,
    clearError: () => clearErrorForNode(nodeId),
    startRemoveBg,
  };
}
