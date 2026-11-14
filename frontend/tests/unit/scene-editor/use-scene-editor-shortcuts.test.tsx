// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEmptySaraswatiScene } from "@/lib/saraswati";
import { useSceneEditorShortcuts } from "@/features/scene-editor/use-scene-editor-shortcuts";

function Harness(props: {
  undo: () => void;
  redo: () => void;
  onDelete?: () => void;
  onNudge?: (dx: number, dy: number) => void;
  selectedIds?: string[];
  onInsertText?: () => void;
  onOpenImagePicker?: () => void;
  shortcutsOpen?: boolean;
}) {
  useSceneEditorShortcuts({
    scene: createEmptySaraswatiScene({ width: 400, height: 300 }),
    inlineTextEditing: false,
    lockedIds: [],
    zoomPercent: 100,
    canUndo: true,
    canRedo: true,
    canGroup: false,
    canUngroup: false,
    selectedIds: props.selectedIds ?? [],
    undo: props.undo,
    redo: props.redo,
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onNudge: props.onNudge ?? vi.fn(),
    setZoomPercent: vi.fn(),
    setSelectedIds: vi.fn(),
    toggleLockedSelection: vi.fn(),
    fitToViewport: vi.fn(),
    reorderPrimarySelection: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    onPasteInPlace: vi.fn(),
    onDelete: props.onDelete ?? vi.fn(),
    onDuplicate: vi.fn(),
    onImageFilesPaste: vi.fn(),
    onShowShortcuts: vi.fn(),
    shortcutsOpen: props.shortcutsOpen ?? false,
    onInsertText: props.onInsertText ?? vi.fn(),
    onOpenImagePicker: props.onOpenImagePicker ?? vi.fn(),
  });

  return (
    <button data-avnac-chrome type="button">
      chrome
    </button>
  );
}

describe("useSceneEditorShortcuts", () => {
  it("handles undo from keyboard even when focus is on editor chrome", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { getByRole, unmount } = render(<Harness undo={undo} redo={redo} />);

    const button = getByRole("button", { name: "chrome" });
    button.focus();
    button.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
    unmount();
  });

  it("routes shift-mod-z to redo", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { getByRole, unmount } = render(<Harness undo={undo} redo={redo} />);

    const button = getByRole("button", { name: "chrome" });
    button.focus();
    button.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
    unmount();
  });

  it("nudges the selection with arrow keys", () => {
    const onNudge = vi.fn();
    const { getByRole, unmount } = render(
      <Harness
        undo={vi.fn()}
        redo={vi.fn()}
        selectedIds={["rect-1"]}
        onNudge={onNudge}
      />,
    );

    const button = getByRole("button", { name: "chrome" });
    button.focus();
    button.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onNudge).toHaveBeenCalledWith(1, 0);
    unmount();
  });

  it("inserts text with T and opens the image picker with I", () => {
    const insertText = vi.fn();
    const openImagePicker = vi.fn();
    const { getByRole, unmount } = render(
      <Harness
        undo={vi.fn()}
        redo={vi.fn()}
        onInsertText={insertText}
        onOpenImagePicker={openImagePicker}
      />,
    );
    const button = getByRole("button", { name: "chrome" });
    button.focus();

    for (const key of ["t", "T"]) {
      button.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    }
    expect(insertText).toHaveBeenCalledTimes(2);

    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "i", bubbles: true, cancelable: true }),
    );
    expect(openImagePicker).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not insert while the shortcuts panel is open", () => {
    const insertText = vi.fn();
    const { getByRole, unmount } = render(
      <Harness
        undo={vi.fn()}
        redo={vi.fn()}
        onInsertText={insertText}
        shortcutsOpen
      />,
    );
    const button = getByRole("button", { name: "chrome" });
    button.focus();
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "t", bubbles: true, cancelable: true }),
    );
    expect(insertText).not.toHaveBeenCalled();
    unmount();
  });
});
