import { beforeEach, describe, expect, it } from "vitest";
import { useRembgProcessingStore } from "@/features/scene-editor/store/rembg-processing-store";

describe("useRembgProcessingStore", () => {
  beforeEach(() => {
    useRembgProcessingStore.setState({ processingNodes: {}, errors: {} });
  });

  it("tracks and clears processing nodes independently", () => {
    const { setProcessing, clearProcessing } =
      useRembgProcessingStore.getState();

    setProcessing("node-a");
    setProcessing("node-b");

    expect(useRembgProcessingStore.getState().processingNodes).toEqual({
      "node-a": true,
      "node-b": true,
    });

    clearProcessing("node-a");

    expect(useRembgProcessingStore.getState().processingNodes).toEqual({
      "node-b": true,
    });

    clearProcessing("node-b");

    expect(useRembgProcessingStore.getState().processingNodes).toEqual({});
  });

  it("is idempotent when clearing an unknown node", () => {
    const { clearProcessing } = useRembgProcessingStore.getState();
    clearProcessing("missing");
    expect(useRembgProcessingStore.getState().processingNodes).toEqual({});
  });
});
