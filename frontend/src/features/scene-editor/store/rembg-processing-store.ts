/**
 * rembg-processing-store.ts
 *
 * Tracks which image nodes are being processed and per-node errors.
 */
import { create } from "zustand";

type RembgProcessingState = {
  processingNodes: Record<string, true>;
  errors: Record<string, string>;
};

type RembgProcessingActions = {
  setProcessing: (nodeId: string) => void;
  clearProcessing: (nodeId: string) => void;
  setError: (nodeId: string, message: string) => void;
  clearError: (nodeId: string) => void;
};

export const useRembgProcessingStore = create<
  RembgProcessingState & RembgProcessingActions
>((set) => ({
  processingNodes: {},
  errors: {},

  setProcessing: (nodeId) =>
    set((s) => ({
      processingNodes: { ...s.processingNodes, [nodeId]: true },
      errors: (() => {
        const { [nodeId]: _removed, ...rest } = s.errors;
        return rest;
      })(),
    })),

  clearProcessing: (nodeId) =>
    set((s) => {
      const { [nodeId]: _removed, ...rest } = s.processingNodes;
      return { processingNodes: rest };
    }),

  setError: (nodeId, message) =>
    set((s) => ({
      errors: { ...s.errors, [nodeId]: message },
    })),

  clearError: (nodeId) =>
    set((s) => {
      const { [nodeId]: _removed, ...rest } = s.errors;
      return { errors: rest };
    }),
}));
