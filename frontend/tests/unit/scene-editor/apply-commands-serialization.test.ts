import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSceneEditorStore } from "@/features/scene-editor/store";
import { toAvnacDocument } from "@/lib/saraswati/compat/to-avnac";

vi.mock("@/lib/saraswati/compat/to-avnac", () => ({
  toAvnacDocument: vi.fn(() => ({
    v: 1 as const,
    artboard: { width: 1000, height: 1000 },
    bg: { type: "solid" as const, color: "#ffffff" },
    fabric: { objects: [] },
  })),
}));

vi.mock("@/lib/avnac-editor-idb", () => ({
  idbGetEditorRecord: vi.fn().mockResolvedValue(null),
  idbPutDocument: vi.fn().mockResolvedValue(undefined),
  idbSetDocumentName: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/avnac-multi-page-storage", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/avnac-multi-page-storage")>();
  return {
    ...actual,
    readRawStoredPages: vi.fn().mockResolvedValue(null),
    saveStoredPages: vi.fn().mockResolvedValue(undefined),
  };
});

describe("applyCommands document serialization", () => {
  beforeEach(async () => {
    vi.mocked(toAvnacDocument).mockClear();
    useSceneEditorStore.getState().reset();
    await useSceneEditorStore.getState().load("serialization-test-doc");
    useSceneEditorStore.getState().insertRect();
    vi.mocked(toAvnacDocument).mockClear();
  });

  it("calls toAvnacDocument on each applyCommands outside a history batch", () => {
    const nodeId = useSceneEditorStore.getState().selectedIds[0]!;
    useSceneEditorStore.getState().applyCommands([
      { type: "MOVE_NODE", id: nodeId, dx: 4, dy: 0 },
    ]);

    expect(toAvnacDocument).toHaveBeenCalledTimes(1);
  });

  it("defers toAvnacDocument until endHistoryBatch during a drag batch", () => {
    const nodeId = useSceneEditorStore.getState().selectedIds[0]!;
    const store = useSceneEditorStore.getState();

    store.beginHistoryBatch();
    for (let i = 0; i < 5; i += 1) {
      store.applyCommands([{ type: "MOVE_NODE", id: nodeId, dx: 1, dy: 0 }]);
    }
    expect(toAvnacDocument).not.toHaveBeenCalled();

    store.endHistoryBatch();
    expect(toAvnacDocument).toHaveBeenCalledTimes(1);
  });
});
