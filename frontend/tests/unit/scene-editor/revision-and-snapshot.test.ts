import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSceneEditorStore } from "@/features/scene-editor/store";
import { toAvnacDocument } from "@/lib/saraswati/compat/to-avnac";

vi.mock("@/lib/saraswati/compat/to-avnac", () => ({
  toAvnacDocument: vi.fn((scene: any) => ({
    v: 1 as const,
    artboard: { ...scene.artboard },
    bg: scene.artboard.bg,
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

describe("scene revision and snapshots", () => {
  beforeEach(async () => {
    vi.mocked(toAvnacDocument).mockClear();
    useSceneEditorStore.getState().reset();
    await useSceneEditorStore.getState().load("revision-test-doc");
  });

  it("increments revision only on visible changes", () => {
    const store = useSceneEditorStore.getState();
    expect(store.revision).toBe(1);
    store.insertRect();
    const withRect = useSceneEditorStore.getState();
    expect(withRect.revision).toBe(2);

    const nodeId = withRect.selectedIds[0]!;
    useSceneEditorStore
      .getState()
      .applyCommands([{ type: "MOVE_NODE", id: nodeId, dx: 4, dy: 0 }]);
    expect(useSceneEditorStore.getState().revision).toBe(3);

    useSceneEditorStore.getState().undo();
    expect(useSceneEditorStore.getState().revision).toBe(4);
    useSceneEditorStore.getState().redo();
    expect(useSceneEditorStore.getState().revision).toBe(5);
  });

  it("adds a custom-sized page and restores a captured snapshot", async () => {
    await useSceneEditorStore.getState().addPage("Poster", {
      width: 1200,
      height: 1600,
      backgroundColor: "#F4ECDD",
    });
    const afterAdd = useSceneEditorStore.getState();
    expect(afterAdd.pages).toHaveLength(2);
    expect(afterAdd.currentPage).toBe(1);
    expect(afterAdd.pages[1]!.artboard).toMatchObject({ width: 1200, height: 1600 });
    expect(afterAdd.pages[1]!.bg).toEqual({ type: "solid", color: "#F4ECDD" });

    const snapshot = useSceneEditorStore.getState().captureSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.pages).toHaveLength(2);
    expect(snapshot!.pageNames).toEqual(["", "Poster"]);

    useSceneEditorStore.getState().renamePage(1, "Renamed");
    expect(useSceneEditorStore.getState().pageNames[1]).toBe("Renamed");
    const revBeforeRestore = useSceneEditorStore.getState().revision;

    const restored = await useSceneEditorStore
      .getState()
      .restoreSnapshot(snapshot!);
    expect(restored).toBe(true);
    const afterRestore = useSceneEditorStore.getState();
    expect(afterRestore.pageNames).toEqual(["", "Poster"]);
    expect(afterRestore.revision).toBeGreaterThan(revBeforeRestore);
    expect(afterRestore.pages[1]!.artboard).toMatchObject({ width: 1200, height: 1600 });
  });
});
